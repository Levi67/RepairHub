import { and, asc, desc, eq, inArray, isNotNull, isNull, ne, or } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { db } from '#lib/server/db/index.ts';
import {
	conversation,
	order,
	orderEvent,
	quote,
	repairRequest,
	repairerProfile,
	user
} from '#lib/server/db/schema.ts';
import { DomainError } from '#lib/server/errors.ts';
import {
	createCheckoutSession,
	expireCheckoutSession,
	refundPayment,
	retrieveCheckoutSession,
	transferPayout,
	type CheckoutSession
} from '#lib/server/payments.ts';
import { stripeEnabled } from '#lib/server/stripe.ts';
import { needsReviewSql } from '#lib/server/reviews.ts';
import { commissionCents, formatCents } from '#lib/money.ts';
import type { OrderStatus } from '#lib/status.ts';

// Placeholder until the team decides (Technical.md 13).
const COMMISSION_RATE_BP = 1000;
const AUTO_CONFIRM_DAYS = 7;

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * Customer accepts a quote: request `assigned`, all other open quotes `rejected`, and an order
 * `awaiting_payment` that the customer pays next through Stripe Checkout (`startPayment`). The
 * request is taken right away, so nobody can accept a second quote while the payment is open;
 * an abandoned payment cancels the order, which reopens the request and its quotes.
 * Without Stripe (local testing) the payment is skipped and the order starts as `paid`.
 */
export async function acceptQuote(customerId: string, quoteId: string): Promise<string> {
	return db.transaction(async (tx) => {
		const [row] = await tx
			.select({ quote, request: repairRequest, repairerBannedAt: user.bannedAt })
			.from(quote)
			.innerJoin(repairRequest, eq(quote.requestId, repairRequest.id))
			.innerJoin(user, eq(quote.repairerId, user.id))
			.where(eq(quote.id, quoteId))
			.for('update');

		if (!row || row.request.customerId !== customerId) {
			throw new DomainError('Angebot nicht gefunden.');
		}
		if (row.quote.status !== 'pending' || row.quote.validUntil <= new Date()) {
			throw new DomainError('Dieses Angebot kann nicht mehr angenommen werden.');
		}
		if (row.request.status !== 'open') {
			throw new DomainError('Für diese Anfrage wurde bereits ein Angebot angenommen.');
		}
		if (row.repairerBannedAt) {
			throw new DomainError('Dieser Reparateur ist gesperrt. Bitte wähle ein anderes Angebot.');
		}

		await tx
			.update(repairRequest)
			.set({ status: 'assigned' })
			.where(eq(repairRequest.id, row.request.id));
		await tx.update(quote).set({ status: 'accepted' }).where(eq(quote.id, quoteId));
		await tx
			.update(quote)
			.set({ status: 'rejected' })
			.where(
				and(eq(quote.requestId, row.request.id), eq(quote.status, 'pending'), ne(quote.id, quoteId))
			);

		const commission = commissionCents(row.quote.priceCents, COMMISSION_RATE_BP);
		const [created] = await tx
			.insert(order)
			.values({
				requestId: row.request.id,
				quoteId,
				customerId,
				repairerId: row.quote.repairerId,
				priceCents: row.quote.priceCents,
				commissionRateBp: COMMISSION_RATE_BP,
				commissionCents: commission,
				payoutCents: row.quote.priceCents - commission,
				handoverMode: row.quote.handoverMode,
				...(stripeEnabled ? { status: 'awaiting_payment' } : { status: 'paid', paidAt: new Date() })
			})
			.returning({ id: order.id });

		await tx.insert(orderEvent).values({
			orderId: created.id,
			actorId: customerId,
			toStatus: stripeEnabled ? 'awaiting_payment' : 'paid',
			note: stripeEnabled
				? 'Angebot angenommen'
				: 'Angebot angenommen (Zahlung übersprungen, Stripe ist nicht eingerichtet)'
		});

		return created.id;
	});
}

type Party = 'customer' | 'repairer' | 'either';

/**
 * Shared core of every status change (Technical.md 6.2): locks the order, checks
 * who may act and from which status, then updates it and logs an order event.
 * `actorId: null` is the system (Stripe webhook), which may act for either side.
 */
async function transition(
	tx: Tx,
	opts: {
		orderId: string;
		actorId: string | null;
		party: Party;
		from: OrderStatus[];
		to: OrderStatus;
		set?: Partial<typeof order.$inferInsert>;
		note?: string;
	}
) {
	const [current] = await tx.select().from(order).where(eq(order.id, opts.orderId)).for('update');

	const system = opts.actorId === null;
	const isCustomer = current?.customerId === opts.actorId;
	const isRepairer = current?.repairerId === opts.actorId;
	if (!current || (!system && !isCustomer && !isRepairer)) {
		throw new DomainError('Auftrag nicht gefunden.');
	}

	const allowed =
		system ||
		opts.party === 'either' ||
		(opts.party === 'customer' && isCustomer) ||
		(opts.party === 'repairer' && isRepairer);
	if (!allowed) throw new DomainError('Dazu bist du bei diesem Auftrag nicht berechtigt.');
	if (!opts.from.includes(current.status)) {
		throw new DomainError('Diese Aktion ist im aktuellen Status nicht möglich.');
	}

	await tx
		.update(order)
		.set({ ...opts.set, status: opts.to })
		.where(eq(order.id, opts.orderId));
	await tx.insert(orderEvent).values({
		orderId: opts.orderId,
		actorId: opts.actorId,
		fromStatus: current.status,
		toStatus: opts.to,
		note: opts.note || null
	});

	return current;
}

export function markInProgress(orderId: string, actorId: string) {
	return db.transaction((tx) =>
		transition(tx, {
			orderId,
			actorId,
			party: 'repairer',
			from: ['paid'],
			to: 'in_progress',
			note: 'Gerät erhalten, Reparatur begonnen'
		})
	);
}

export function markRepaired(orderId: string, actorId: string, returnTracking?: string) {
	const now = new Date();
	return db.transaction((tx) =>
		transition(tx, {
			orderId,
			actorId,
			party: 'repairer',
			from: ['in_progress'],
			to: 'repaired',
			set: {
				repairedAt: now,
				autoConfirmAt: new Date(now.getTime() + AUTO_CONFIRM_DAYS * 24 * 60 * 60 * 1000),
				...(returnTracking ? { returnTracking } : {})
			},
			note: returnTracking ? `Rücksendung: ${returnTracking}` : undefined
		})
	);
}

export async function confirmCompleted(orderId: string, actorId: string) {
	await db.transaction((tx) =>
		transition(tx, {
			orderId,
			actorId,
			party: 'customer',
			from: ['repaired'],
			to: 'completed',
			set: { completedAt: new Date() },
			note: 'Reparatur bestätigt'
		})
	);
	// The order is completed either way; a payout that fails now is retried later (releasePayout).
	try {
		await releasePayout(orderId);
	} catch (e) {
		console.error('Payout failed for order', orderId, e);
	}
}

/**
 * Either side can cancel before work starts. A paid order is refunded in full (#48); an open
 * Checkout page is closed so it can't be paid anymore. The request opens again: new quotes can
 * come in, and the quotes rejected by this acceptance become open again so the customer can pick one.
 */
export function cancelOrder(orderId: string, actorId: string, reason?: string) {
	return db.transaction((tx) => cancelInTx(tx, orderId, actorId, reason));
}

async function cancelInTx(tx: Tx, orderId: string, actorId: string | null, reason?: string) {
	const cancelled = await transition(tx, {
		orderId,
		actorId,
		party: 'either',
		from: ['awaiting_payment', 'paid'],
		to: 'cancelled',
		note: reason
	});

	if (cancelled.status === 'paid' && cancelled.stripePaymentIntentId) {
		// Inside the transaction: if Stripe refuses the refund, the order stays as it was.
		const refundId = await refundPayment(cancelled.stripePaymentIntentId);
		await tx.update(order).set({ stripeRefundId: refundId }).where(eq(order.id, orderId));
		await tx.insert(orderEvent).values({
			orderId,
			actorId: null,
			fromStatus: 'cancelled',
			toStatus: 'cancelled',
			note: `${formatCents(cancelled.priceCents)} werden erstattet. Die Gutschrift dauert je nach Zahlungsart ein paar Tage.`
		});
	} else if (cancelled.status === 'awaiting_payment' && cancelled.stripeCheckoutSessionId) {
		await expireCheckoutSession(cancelled.stripeCheckoutSessionId);
	}

	await tx
		.update(repairRequest)
		.set({ status: 'open' })
		.where(and(eq(repairRequest.id, cancelled.requestId), eq(repairRequest.status, 'assigned')));
	// Only an acceptance rejects quotes, and the previous cancellation restored its rejections,
	// so every rejected quote on this request was rejected by the order being cancelled.
	await tx
		.update(quote)
		.set({ status: 'pending' })
		.where(and(eq(quote.requestId, cancelled.requestId), eq(quote.status, 'rejected')));
}

/**
 * Link to Stripe Checkout for an order that waits for payment (#46). Reuses the open Checkout
 * page if there is one, otherwise opens a new one. Returns null if the order is paid already.
 */
export async function startPayment(
	orderId: string,
	customer: { id: string; email: string },
	origin: string
): Promise<string | null> {
	const [row] = await db
		.select({ order, title: repairRequest.title })
		.from(order)
		.innerJoin(repairRequest, eq(order.requestId, repairRequest.id))
		.where(and(eq(order.id, orderId), eq(order.customerId, customer.id)));
	if (!row) throw new DomainError('Auftrag nicht gefunden.');
	if (row.order.status !== 'awaiting_payment') return null;

	if (row.order.stripeCheckoutSessionId) {
		const existing = await retrieveCheckoutSession(row.order.stripeCheckoutSessionId);
		if (existing.status === 'open' && existing.url) return existing.url;
		if (existing.status === 'complete') {
			await applyCheckoutSession(existing);
			return null;
		}
	}

	const session = await createCheckoutSession({
		orderId,
		title: row.title,
		priceCents: row.order.priceCents,
		customerEmail: customer.email,
		origin
	});
	await db
		.update(order)
		.set({ stripeCheckoutSessionId: session.id })
		.where(and(eq(order.id, orderId), eq(order.status, 'awaiting_payment')));
	if (!session.url) throw new DomainError('Stripe hat keine Zahlungsseite geliefert.');
	return session.url;
}

/**
 * Brings an order in line with its Checkout page, from the webhook or when the customer comes back
 * from Stripe (so it also works locally, where no webhook arrives):
 * - paid → order `paid`. A payment for an order that's no longer waiting for one (cancelled in
 *   the meantime, or paid twice from two tabs) is refunded right away.
 * - expired, or an asynchronous payment (e.g. SEPA) failed → order cancelled, request reopens.
 */
export async function applyCheckoutSession(
	session: CheckoutSession,
	opts: { paymentFailed?: boolean; tx?: Tx } = {}
) {
	const orderId = session.metadata?.order_id;
	if (!orderId) return;

	const run = async (tx: Tx) => {
		const [current] = await tx.select().from(order).where(eq(order.id, orderId)).for('update');
		if (!current) return;
		const paymentIntentId =
			typeof session.payment_intent === 'string'
				? session.payment_intent
				: session.payment_intent?.id;

		if (session.status === 'complete' && session.payment_status === 'paid' && paymentIntentId) {
			if (current.status === 'awaiting_payment') {
				await transition(tx, {
					orderId,
					actorId: null,
					party: 'either',
					from: ['awaiting_payment'],
					to: 'paid',
					set: {
						paidAt: new Date(),
						stripeCheckoutSessionId: session.id,
						stripePaymentIntentId: paymentIntentId
					},
					note: `Zahlung über ${formatCents(current.priceCents)} eingegangen`
				});
			} else if (current.stripePaymentIntentId !== paymentIntentId) {
				await refundPayment(paymentIntentId);
				console.warn('Refunded a payment for order', orderId, 'in status', current.status);
			}
			return;
		}

		const failed = session.status === 'expired' || opts.paymentFailed;
		if (
			failed &&
			current.status === 'awaiting_payment' &&
			current.stripeCheckoutSessionId === session.id
		) {
			await cancelInTx(
				tx,
				orderId,
				null,
				session.status === 'expired'
					? 'Zahlung nicht abgeschlossen, die Zahlungsseite ist abgelaufen'
					: 'Zahlung fehlgeschlagen'
			);
		}
	};

	if (opts.tx) await run(opts.tx);
	else await db.transaction(run);
}

/** Checks the order's open Checkout page with Stripe (customer back from Checkout, page loads). */
export async function syncPayment(orderId: string) {
	const current = await db.query.order.findFirst({ where: eq(order.id, orderId) });
	if (current?.status !== 'awaiting_payment' || !current.stripeCheckoutSessionId) return;
	await applyCheckoutSession(await retrieveCheckoutSession(current.stripeCheckoutSessionId));
}

/**
 * Pays the repairer of a completed order (#47): price minus commission goes to their connected
 * account. Held (returns false) while they have no active payout account; it's sent once they
 * finish onboarding (`releaseHeldPayouts`). Orders from before payments existed have nothing to pay.
 */
export async function releasePayout(orderId: string): Promise<boolean> {
	return db.transaction(async (tx) => {
		const [current] = await tx.select().from(order).where(eq(order.id, orderId)).for('update');
		if (
			current?.status !== 'completed' ||
			!current.stripePaymentIntentId ||
			current.stripeTransferId
		) {
			return false;
		}
		const profile = await tx.query.repairerProfile.findFirst({
			where: eq(repairerProfile.userId, current.repairerId)
		});
		if (profile?.stripeStatus !== 'active' || !profile.stripeAccountId) return false;

		const transferId = await transferPayout({
			orderId,
			paymentIntentId: current.stripePaymentIntentId,
			amountCents: current.payoutCents,
			destination: profile.stripeAccountId
		});
		await tx.update(order).set({ stripeTransferId: transferId }).where(eq(order.id, orderId));
		await tx.insert(orderEvent).values({
			orderId,
			actorId: null,
			fromStatus: 'completed',
			toStatus: 'completed',
			note: `${formatCents(current.payoutCents)} an den Reparateur ausgezahlt`
		});
		return true;
	});
}

/** Sends every payout that waited for this repairer's payout account. */
export async function releaseHeldPayouts(repairerId: string) {
	const held = await db
		.select({ id: order.id })
		.from(order)
		.where(
			and(
				eq(order.repairerId, repairerId),
				eq(order.status, 'completed'),
				isNotNull(order.stripePaymentIntentId),
				isNull(order.stripeTransferId)
			)
		);
	for (const { id } of held) {
		try {
			await releasePayout(id);
		} catch (e) {
			console.error('Payout failed for order', id, e);
		}
	}
}

/** Customer enters the tracking number after shipping the item. No status change. */
export async function setOutboundTracking(orderId: string, actorId: string, tracking: string) {
	const updated = await db
		.update(order)
		.set({ outboundTracking: tracking })
		.where(
			and(
				eq(order.id, orderId),
				eq(order.customerId, actorId),
				eq(order.handoverMode, 'shipping'),
				inArray(order.status, ['paid', 'in_progress'])
			)
		)
		.returning({ id: order.id });
	if (!updated.length) throw new DomainError('Sendungsnummer kann nicht mehr geändert werden.');
}

const customer = alias(user, 'customer');
const repairer = alias(user, 'repairer');

/** Order with both parties, or null if it doesn't exist or the user isn't part of it. */
export async function getOrderForUser(orderId: string, userId: string) {
	const [row] = await db
		.select({
			order,
			requestTitle: repairRequest.title,
			requestPlz: repairRequest.plz,
			requestCity: repairRequest.city,
			quoteMessage: quote.message,
			quotePartsNote: quote.partsNote,
			quoteEstimatedDays: quote.estimatedDays,
			quoteIncludesReturnShipping: quote.includesReturnShipping,
			customerName: customer.name,
			repairerName: repairer.name,
			conversationId: conversation.id
		})
		.from(order)
		.innerJoin(repairRequest, eq(order.requestId, repairRequest.id))
		.innerJoin(quote, eq(order.quoteId, quote.id))
		.leftJoin(
			conversation,
			and(
				eq(conversation.requestId, order.requestId),
				eq(conversation.repairerId, order.repairerId)
			)
		)
		.innerJoin(customer, eq(order.customerId, customer.id))
		.innerJoin(repairer, eq(order.repairerId, repairer.id))
		.where(
			and(eq(order.id, orderId), or(eq(order.customerId, userId), eq(order.repairerId, userId)))
		);
	if (!row) return null;

	const events = await db
		.select({
			id: orderEvent.id,
			toStatus: orderEvent.toStatus,
			note: orderEvent.note,
			createdAt: orderEvent.createdAt,
			actorName: user.name
		})
		.from(orderEvent)
		.leftJoin(user, eq(orderEvent.actorId, user.id))
		.where(eq(orderEvent.orderId, orderId))
		.orderBy(asc(orderEvent.createdAt));

	return { ...row, events };
}

/** All orders where the user is customer or repairer, newest first. */
export async function listOrdersForUser(userId: string) {
	const rows = await db
		.select({
			id: order.id,
			status: order.status,
			priceCents: order.priceCents,
			handoverMode: order.handoverMode,
			createdAt: order.createdAt,
			customerId: order.customerId,
			requestTitle: repairRequest.title,
			customerName: customer.name,
			repairerName: repairer.name,
			needsReview: needsReviewSql(userId)
		})
		.from(order)
		.innerJoin(repairRequest, eq(order.requestId, repairRequest.id))
		.innerJoin(customer, eq(order.customerId, customer.id))
		.innerJoin(repairer, eq(order.repairerId, repairer.id))
		.where(or(eq(order.customerId, userId), eq(order.repairerId, userId)))
		.orderBy(desc(order.createdAt));

	return rows.map(({ customerId, customerName, repairerName, ...row }) => {
		const asCustomer = customerId === userId;
		return {
			...row,
			role: asCustomer ? ('customer' as const) : ('repairer' as const),
			otherPartyName: asCustomer ? repairerName : customerName
		};
	});
}

/** The current (not cancelled) order of a request, for its owner. */
export async function getActiveOrderIdForRequest(requestId: string) {
	const [row] = await db
		.select({ id: order.id })
		.from(order)
		.where(and(eq(order.requestId, requestId), ne(order.status, 'cancelled')))
		.orderBy(desc(order.createdAt))
		.limit(1);
	return row?.id ?? null;
}

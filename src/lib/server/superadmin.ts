// Super admin tools (#64). Only the account named by SUPER_ADMIN_EMAIL gets these, and only while
// it acts as itself (not while impersonating). Everything that can't be undone from the UI is
// written to `admin_log`. Normal admin features stay in admin.ts.
import { error, redirect, type RequestEvent } from '@sveltejs/kit';
import { SUPER_ADMIN_EMAIL } from '$app/env/private';
import { APIError } from 'better-auth/api';
import {
	and,
	desc,
	eq,
	ilike,
	inArray,
	isNotNull,
	isNull,
	ne,
	or,
	sql,
	type SQL
} from 'drizzle-orm';
import { auth } from '#lib/server/auth.ts';
import { db } from '#lib/server/db/index.ts';
import {
	account,
	adminLog,
	category,
	order,
	orderEvent,
	quote,
	repairRequest,
	repairerProfile,
	requestImage,
	session,
	user,
	userAvatar
} from '#lib/server/db/schema.ts';
import { DomainError, failOnDomainError, isUniqueViolation } from '#lib/server/errors.ts';
import { lookupPlz, plzLocation, UNKNOWN_PLZ } from '#lib/server/geo.ts';
import { releasePayout } from '#lib/server/orders.ts';
import { refundPayment } from '#lib/server/payments.ts';
import { loginUrl } from '#lib/server/redirect.ts';
import { deletePhotos } from '#lib/server/storage.ts';
import { callStripe, stripeEnabled } from '#lib/server/stripe.ts';
import {
	QUOTE_MESSAGES,
	REQUEST_POOL,
	TEST_CUSTOMERS,
	TEST_PLZ,
	TEST_REPAIRERS
} from '#lib/server/testdata-pool.ts';
import type { OrderStatus, QuoteStatus, RequestStatus } from '#lib/status.ts';

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

// ---------------------------------------------------------------------------
// Access

export function isSuperAdmin(locals: App.Locals) {
	const u = locals.user;
	return Boolean(
		u && SUPER_ADMIN_EMAIL && u.email.toLowerCase() === SUPER_ADMIN_EMAIL && !locals.impersonator
	);
}

/** Guard for every super admin load and action. Everyone else gets a 404. */
export function requireSuperAdmin(event: Pick<RequestEvent, 'locals' | 'url'>) {
	if (!event.locals.user) redirect(303, loginUrl(event.url));
	if (!isSuperAdmin(event.locals)) error(404, 'Seite nicht gefunden');
	return event.locals.user!;
}

/**
 * Runs one super admin form action: checks access, hands over the form data and turns rule
 * violations into a form error. Returns `{ done: <message> }` on success for a calm confirmation.
 */
export async function superAction(
	event: RequestEvent,
	run: (actor: NonNullable<App.Locals['user']>, form: FormData) => Promise<string | void>
) {
	const actor = requireSuperAdmin(event);
	const form = await event.request.formData();
	try {
		const done = await run(actor, form);
		return { done: done || 'Gespeichert.' };
	} catch (e) {
		return failOnDomainError(e);
	}
}

/** Form field as trimmed text ('' when missing). */
export const field = (form: FormData, name: string, max = 10_000) =>
	(form.get(name)?.toString() ?? '').trim().slice(0, max);

/** Second factor for destructive actions: the super admin types their own password again. */
export async function confirmOwnPassword(event: RequestEvent, password: string) {
	if (!password) throw new DomainError('Bitte gib dein Passwort ein.');
	try {
		await auth.api.verifyPassword({ body: { password }, headers: event.request.headers });
	} catch {
		throw new DomainError('Das Passwort stimmt nicht.');
	}
}

export async function logAction(
	actorId: string,
	action: string,
	target: string,
	details?: Record<string, unknown>
) {
	await db.insert(adminLog).values({ actorId, action, target, details: details ?? null });
}

export async function listAdminLog() {
	return db
		.select({
			id: adminLog.id,
			action: adminLog.action,
			target: adminLog.target,
			details: adminLog.details,
			createdAt: adminLog.createdAt,
			actorName: user.name
		})
		.from(adminLog)
		.leftJoin(user, eq(adminLog.actorId, user.id))
		.orderBy(desc(adminLog.createdAt))
		.limit(300);
}

// ---------------------------------------------------------------------------
// Impersonation (the endpoints themselves live in impersonation.ts)

function authMessage(e: unknown, fallback: string): never {
	if (e instanceof APIError) throw new DomainError(e.body?.message || fallback);
	throw e;
}

export async function impersonate(event: RequestEvent, userId: string, password: string) {
	try {
		await auth.api.impersonateUser({
			body: { userId, password: password || undefined },
			headers: event.request.headers
		});
	} catch (e) {
		authMessage(e, 'Anmelden als dieser Nutzer hat nicht geklappt.');
	}
}

export async function stopImpersonating(event: RequestEvent) {
	try {
		await auth.api.stopImpersonating({ headers: event.request.headers });
	} catch (e) {
		authMessage(e, 'Zurückwechseln hat nicht geklappt.');
	}
}

// ---------------------------------------------------------------------------
// Users

export async function getUserForAdmin(userId: string) {
	const [row] = await db.select().from(user).where(eq(user.id, userId));
	if (!row) return null;
	const [profile] = await db
		.select({
			stripeAccountId: repairerProfile.stripeAccountId,
			stripeStatus: repairerProfile.stripeStatus
		})
		.from(repairerProfile)
		.where(eq(repairerProfile.userId, userId));
	const [hasPassword] = await db
		.select({ id: account.id })
		.from(account)
		.where(and(eq(account.userId, userId), eq(account.providerId, 'credential')));
	return { user: row, payout: profile ?? null, hasPassword: Boolean(hasPassword) };
}

export type UserEdit = {
	name: string;
	email: string;
	plz: string;
	bio: string;
	removeAvatar: boolean;
};

export async function updateUser(actorId: string, userId: string, input: UserEdit) {
	const target = await getUserForAdmin(userId);
	if (!target || target.user.deletedAt) throw new DomainError('Nutzer nicht gefunden.');
	if (target.user.isSuperAdmin && userId !== actorId) {
		throw new DomainError('Dieses Konto kann nicht bearbeitet werden.');
	}
	let city: string | null = null;
	if (input.plz) {
		const found = await lookupPlz(input.plz);
		if (!found) throw new DomainError(UNKNOWN_PLZ);
		city = found.city;
	}
	try {
		await db.transaction(async (tx) => {
			await tx
				.update(user)
				.set({
					name: input.name,
					email: input.email.toLowerCase(),
					plz: input.plz || null,
					city,
					bio: input.bio || null,
					...(input.removeAvatar ? { image: null } : {})
				})
				.where(eq(user.id, userId));
			if (input.removeAvatar) await tx.delete(userAvatar).where(eq(userAvatar.userId, userId));
		});
	} catch (e) {
		if (isUniqueViolation(e)) throw new DomainError('Diese E-Mail wird schon verwendet.');
		throw e;
	}
}

/**
 * Gives the user a temporary password and logs them out everywhere. On their next login they have
 * to choose a new one (`mustChangePassword`, enforced in hooks.server.ts).
 */
export async function setTemporaryPassword(actorId: string, userId: string, password: string) {
	if (password.length < 8 || password.length > 128) {
		throw new DomainError('Das Passwort muss 8 bis 128 Zeichen haben.');
	}
	const target = await getUserForAdmin(userId);
	if (!target || target.user.deletedAt) throw new DomainError('Nutzer nicht gefunden.');
	if (target.user.isSuperAdmin)
		throw new DomainError('Dein eigenes Passwort änderst du in den Einstellungen.');

	const ctx = await auth.$context;
	const hash = await ctx.password.hash(password);
	if (target.hasPassword) await ctx.internalAdapter.updatePassword(userId, hash);
	else {
		await ctx.internalAdapter.linkAccount({
			userId,
			providerId: 'credential',
			accountId: userId,
			password: hash
		});
	}
	await db.update(user).set({ mustChangePassword: true }).where(eq(user.id, userId));
	await db.delete(session).where(eq(session.userId, userId));
	await logAction(
		actorId,
		'Temporäres Passwort gesetzt',
		`${target.user.name} (${target.user.email})`
	);
}

/** The user replaces their temporary password (no old password needed, they just logged in with it). */
export async function replaceTemporaryPassword(userId: string, password: string) {
	const ctx = await auth.$context;
	await ctx.internalAdapter.updatePassword(userId, await ctx.password.hash(password));
	await db.update(user).set({ mustChangePassword: false }).where(eq(user.id, userId));
}

/**
 * Removes a user so the email can be used for a new account.
 * - `all`: the user and everything they touched, including orders, chats and reviews with others.
 *   Requests that were assigned through a deleted order open again.
 * - `anonymise`: their own requests and quotes without orders go; orders, chats and reviews with
 *   others stay, shown as "Gelöschter Nutzer". Login is removed and the email freed.
 */
export async function wipeUser(
	actorId: string,
	userId: string,
	mode: 'all' | 'anonymise',
	closeStripeAccount: boolean
) {
	if (userId === actorId) throw new DomainError('Du kannst dich nicht selbst löschen.');
	const target = await getUserForAdmin(userId);
	if (!target) throw new DomainError('Nutzer nicht gefunden.');
	if (target.user.isSuperAdmin) throw new DomainError('Dieses Konto kann nicht gelöscht werden.');

	let photoPaths: string[] = [];
	await db.transaction(async (tx) => {
		if (mode === 'all') {
			const ownRequests = tx
				.select({ id: repairRequest.id })
				.from(repairRequest)
				.where(eq(repairRequest.customerId, userId));
			photoPaths = await photoPathsWhere(tx, inArray(requestImage.requestId, ownRequests));

			const orders = await tx
				.select({ id: order.id, requestId: order.requestId, customerId: order.customerId })
				.from(order)
				.where(or(eq(order.customerId, userId), eq(order.repairerId, userId)));
			if (orders.length) {
				await tx.delete(order).where(
					inArray(
						order.id,
						orders.map((o) => o.id)
					)
				);
				// Other people's requests that this user was repairing are free again.
				const reopened = orders.filter((o) => o.customerId !== userId).map((o) => o.requestId);
				if (reopened.length) await reopenRequests(tx, reopened);
			}
			// Everything else (requests, quotes, chats, messages, reviews, avatar, sessions, payout
			// account) goes with the user through ON DELETE CASCADE.
			await tx.delete(user).where(eq(user.id, userId));
		} else {
			const withoutOrder = sql`not exists (select 1 from ${order} o where o.request_id = ${repairRequest.id})`;
			const deletable = tx
				.select({ id: repairRequest.id })
				.from(repairRequest)
				.where(and(eq(repairRequest.customerId, userId), withoutOrder));
			photoPaths = await photoPathsWhere(tx, inArray(requestImage.requestId, deletable));
			await tx.delete(repairRequest).where(and(eq(repairRequest.customerId, userId), withoutOrder));
			await tx
				.delete(quote)
				.where(
					and(
						eq(quote.repairerId, userId),
						sql`not exists (select 1 from ${order} o where o.quote_id = ${quote.id})`
					)
				);
			await tx.delete(account).where(eq(account.userId, userId));
			await tx.delete(session).where(eq(session.userId, userId));
			await tx.delete(userAvatar).where(eq(userAvatar.userId, userId));
			await tx
				.update(user)
				.set({
					name: 'Gelöschter Nutzer',
					email: `geloescht-${userId}@repairhub.invalid`,
					emailVerified: false,
					image: null,
					bio: null,
					plz: null,
					city: null,
					isAdmin: false,
					mustChangePassword: false,
					deletedAt: new Date()
				})
				.where(eq(user.id, userId));
		}
	});

	await deletePhotos(photoPaths);
	let stripeNote = '';
	if (closeStripeAccount && target.payout?.stripeAccountId && stripeEnabled) {
		const accountId = target.payout.stripeAccountId;
		try {
			await callStripe((s) =>
				s.v2.core.accounts.close(accountId, { applied_configurations: ['recipient'] })
			);
			stripeNote = 'Stripe-Konto geschlossen';
		} catch {
			stripeNote = 'Stripe-Konto konnte nicht geschlossen werden';
		}
	}
	await logAction(
		actorId,
		mode === 'all' ? 'Nutzer komplett gelöscht' : 'Nutzer anonymisiert',
		`${target.user.name} (${target.user.email})`,
		stripeNote ? { stripe: stripeNote } : undefined
	);
	return stripeNote;
}

// ---------------------------------------------------------------------------
// Requests and quotes

async function photoPathsWhere(tx: Tx, condition: SQL | undefined) {
	const rows = await tx
		.select({ path: requestImage.storagePath })
		.from(requestImage)
		.where(condition);
	return rows.map((r) => r.path);
}

/** Requests that lost their order go back to `open`, with the quotes that order had rejected. */
async function reopenRequests(tx: Tx, requestIds: string[]) {
	await tx
		.update(repairRequest)
		.set({ status: 'open' })
		.where(and(inArray(repairRequest.id, requestIds), eq(repairRequest.status, 'assigned')));
	await tx
		.update(quote)
		.set({ status: 'pending' })
		.where(and(inArray(quote.requestId, requestIds), eq(quote.status, 'rejected')));
}

export async function listRequestsForAdmin(search: string, onlyTest: boolean) {
	const conditions = [];
	if (search) {
		const pattern = `%${search.replace(/[%_\\]/g, '\\$&')}%`;
		conditions.push(or(ilike(repairRequest.title, pattern), ilike(user.name, pattern)));
	}
	if (onlyTest) conditions.push(eq(repairRequest.isTest, true));
	return db
		.select({
			id: repairRequest.id,
			title: repairRequest.title,
			status: repairRequest.status,
			plz: repairRequest.plz,
			city: repairRequest.city,
			isTest: repairRequest.isTest,
			createdAt: repairRequest.createdAt,
			customerName: user.name,
			quotes:
				sql<number>`(select count(*) from ${quote} q where q.request_id = ${repairRequest.id})`.mapWith(
					Number
				)
		})
		.from(repairRequest)
		.innerJoin(user, eq(repairRequest.customerId, user.id))
		.where(and(...conditions))
		.orderBy(desc(repairRequest.createdAt))
		.limit(100);
}

export async function getRequestForAdmin(requestId: string) {
	const [row] = await db
		.select({ request: repairRequest, customerName: user.name })
		.from(repairRequest)
		.innerJoin(user, eq(repairRequest.customerId, user.id))
		.where(eq(repairRequest.id, requestId));
	if (!row) return null;
	const quotes = await db
		.select({
			quote,
			repairerName: user.name,
			orderId: order.id,
			orderStatus: order.status
		})
		.from(quote)
		.innerJoin(user, eq(quote.repairerId, user.id))
		.leftJoin(order, eq(order.quoteId, quote.id))
		.where(eq(quote.requestId, requestId))
		.orderBy(desc(quote.createdAt));
	return { ...row, quotes };
}

export type RequestEdit = {
	title: string;
	description: string;
	categoryId: string;
	status: RequestStatus;
	plz: string;
	budgetCents: number | null;
	expiresAt: Date;
};

export async function updateRequestAsAdmin(requestId: string, input: RequestEdit) {
	const found = await lookupPlz(input.plz);
	if (!found) throw new DomainError(UNKNOWN_PLZ);
	const updated = await db
		.update(repairRequest)
		.set({
			title: input.title,
			description: input.description,
			categoryId: input.categoryId,
			status: input.status,
			plz: input.plz,
			city: found.city,
			location: plzLocation(input.plz),
			budgetCents: input.budgetCents,
			expiresAt: input.expiresAt
		})
		.where(eq(repairRequest.id, requestId))
		.returning({ id: repairRequest.id });
	if (!updated.length) throw new DomainError('Anfrage nicht gefunden.');
}

export type QuoteEdit = {
	priceCents: number;
	estimatedDays: number;
	message: string;
	status: QuoteStatus;
	validUntil: Date;
};

export async function updateQuoteAsAdmin(quoteId: string, input: QuoteEdit) {
	const updated = await db
		.update(quote)
		.set(input)
		.where(eq(quote.id, quoteId))
		.returning({ id: quote.id });
	if (!updated.length) throw new DomainError('Angebot nicht gefunden.');
}

/**
 * Deletes requests with everything attached (photos, quotes, orders with their history and reviews,
 * chats). With `refund`, Stripe payments of orders that weren't paid out or refunded yet are
 * refunded first; otherwise Stripe is left alone.
 */
async function deleteRequestsWhere(condition: SQL, refund: boolean) {
	const ids = (await db.select({ id: repairRequest.id }).from(repairRequest).where(condition)).map(
		(r) => r.id
	);
	if (!ids.length) return { requests: 0, refunds: 0, refundErrors: 0 };

	let refunds = 0;
	let refundErrors = 0;
	if (refund && stripeEnabled) {
		const refundable = await db
			.select({ paymentIntentId: order.stripePaymentIntentId })
			.from(order)
			.where(
				and(
					inArray(order.requestId, ids),
					isNotNull(order.stripePaymentIntentId),
					isNull(order.stripeRefundId),
					isNull(order.stripeTransferId)
				)
			);
		for (const { paymentIntentId } of refundable) {
			try {
				await refundPayment(paymentIntentId!);
				refunds++;
			} catch {
				refundErrors++;
			}
		}
	}

	let photoPaths: string[] = [];
	await db.transaction(async (tx) => {
		photoPaths = await photoPathsWhere(tx, inArray(requestImage.requestId, ids));
		await tx.delete(order).where(inArray(order.requestId, ids));
		await tx.delete(repairRequest).where(inArray(repairRequest.id, ids));
	});
	await deletePhotos(photoPaths);
	return { requests: ids.length, refunds, refundErrors };
}

export async function deleteRequestAsAdmin(actorId: string, requestId: string) {
	const [row] = await db
		.select({ title: repairRequest.title })
		.from(repairRequest)
		.where(eq(repairRequest.id, requestId));
	if (!row) throw new DomainError('Anfrage nicht gefunden.');
	await deleteRequestsWhere(eq(repairRequest.id, requestId), false);
	await logAction(actorId, 'Anfrage gelöscht', row.title);
}

export async function wipeRequests(actorId: string, scope: 'test' | 'all', refund: boolean) {
	const result = await deleteRequestsWhere(
		scope === 'test' ? eq(repairRequest.isTest, true) : sql`true`,
		refund
	);
	await logAction(
		actorId,
		scope === 'test' ? 'Alle Testanfragen gelöscht' : 'Alle Anfragen gelöscht',
		`${result.requests} Anfragen`,
		refund ? { erstattet: result.refunds, fehlgeschlagen: result.refundErrors } : undefined
	);
	return result;
}

// ---------------------------------------------------------------------------
// Orders

export async function listOrdersForAdmin(status: OrderStatus | null) {
	const customer = sql`(select name from ${user} u where u.id = ${order.customerId})`;
	const repairer = sql`(select name from ${user} u where u.id = ${order.repairerId})`;
	return db
		.select({
			id: order.id,
			status: order.status,
			priceCents: order.priceCents,
			createdAt: order.createdAt,
			title: repairRequest.title,
			customerName: customer.mapWith(String),
			repairerName: repairer.mapWith(String),
			viaStripe: sql<boolean>`${order.stripePaymentIntentId} is not null`
		})
		.from(order)
		.innerJoin(repairRequest, eq(order.requestId, repairRequest.id))
		.where(status ? eq(order.status, status) : undefined)
		.orderBy(desc(order.createdAt))
		.limit(100);
}

export async function getOrderForAdmin(orderId: string) {
	const [row] = await db
		.select({ order, title: repairRequest.title })
		.from(order)
		.innerJoin(repairRequest, eq(order.requestId, repairRequest.id))
		.where(eq(order.id, orderId));
	if (!row) return null;
	const names = await db
		.select({ id: user.id, name: user.name })
		.from(user)
		.where(inArray(user.id, [row.order.customerId, row.order.repairerId]));
	const nameOf = (id: string) => names.find((n) => n.id === id)?.name ?? '?';
	return {
		...row,
		customerName: nameOf(row.order.customerId),
		repairerName: nameOf(row.order.repairerId)
	};
}

const ENDED: OrderStatus[] = ['cancelled', 'refunded'];

/**
 * Sets any order status, bypassing the normal rules. The request follows (open again when the
 * order ends, assigned otherwise). With `withStripe`: ending a paid order refunds it, completing it
 * sends the payout. Without, Stripe is left as it is.
 */
export async function forceOrderStatus(
	actorId: string,
	orderId: string,
	to: OrderStatus,
	withStripe: boolean
) {
	const found = await getOrderForAdmin(orderId);
	if (!found) throw new DomainError('Auftrag nicht gefunden.');
	const from = found.order.status;
	if (from === to) throw new DomainError('Der Auftrag hat diesen Status schon.');
	const now = new Date();
	const o = found.order;

	let stripeNote = '';
	await db.transaction(async (tx) => {
		await tx
			.update(order)
			.set({
				status: to,
				...(to !== 'awaiting_payment' && !o.paidAt ? { paidAt: now } : {}),
				...(to === 'repaired' && !o.repairedAt ? { repairedAt: now } : {}),
				...(to === 'completed' && !o.completedAt ? { completedAt: now } : {})
			})
			.where(eq(order.id, orderId));

		if (
			withStripe &&
			ENDED.includes(to) &&
			o.stripePaymentIntentId &&
			!o.stripeRefundId &&
			!o.stripeTransferId
		) {
			const refundId = await refundPayment(o.stripePaymentIntentId);
			await tx.update(order).set({ stripeRefundId: refundId }).where(eq(order.id, orderId));
			stripeNote = 'Zahlung erstattet';
		}

		await tx.insert(orderEvent).values({
			orderId,
			actorId,
			fromStatus: from,
			toStatus: to,
			note: `Status von der Verwaltung gesetzt${stripeNote ? ` · ${stripeNote}` : ''}`
		});

		if (ENDED.includes(to)) await reopenRequests(tx, [o.requestId]);
		else {
			await tx
				.update(repairRequest)
				.set({ status: 'assigned' })
				.where(and(eq(repairRequest.id, o.requestId), ne(repairRequest.status, 'assigned')));
		}
	});

	if (withStripe && to === 'completed') {
		try {
			stripeNote = (await releasePayout(orderId))
				? 'Auszahlung gesendet'
				: 'Keine Auszahlung (kein Stripe-Auftrag oder Auszahlungskonto nicht aktiv)';
		} catch {
			stripeNote = 'Auszahlung fehlgeschlagen';
		}
	}
	await logAction(actorId, 'Auftragsstatus gesetzt', found.title, {
		von: from,
		nach: to,
		...(stripeNote ? { stripe: stripeNote } : {})
	});
	return stripeNote;
}

// ---------------------------------------------------------------------------
// Categories

/**
 * Deletes a category that may still be in use. `move`: its requests (and those of its
 * subcategories) move to `targetId`, then the category and its subcategories go. `delete`: the
 * requests are deleted with everything attached.
 */
export async function deleteCategoryWithContent(
	actorId: string,
	categoryId: string,
	mode: 'move' | 'delete',
	targetId: string | null
) {
	const [cat] = await db.select().from(category).where(eq(category.id, categoryId));
	if (!cat) throw new DomainError('Kategorie nicht gefunden.');
	const children = await db
		.select({ id: category.id })
		.from(category)
		.where(eq(category.parentId, categoryId));
	const ids = [categoryId, ...children.map((c) => c.id)];

	let moved = 0;
	let deleted = 0;
	if (mode === 'move') {
		if (!targetId || ids.includes(targetId)) {
			throw new DomainError('Wähle eine andere Kategorie als Ziel.');
		}
		const [target] = await db.select().from(category).where(eq(category.id, targetId));
		if (!target) throw new DomainError('Zielkategorie nicht gefunden.');
		await db.transaction(async (tx) => {
			const result = await tx
				.update(repairRequest)
				.set({ categoryId: targetId })
				.where(inArray(repairRequest.categoryId, ids))
				.returning({ id: repairRequest.id });
			moved = result.length;
			if (children.length) {
				await tx.delete(category).where(
					inArray(
						category.id,
						children.map((c) => c.id)
					)
				);
			}
			await tx.delete(category).where(eq(category.id, categoryId));
		});
	} else {
		deleted = (await deleteRequestsWhere(inArray(repairRequest.categoryId, ids), false)).requests;
		await db.transaction(async (tx) => {
			if (children.length) {
				await tx.delete(category).where(
					inArray(
						category.id,
						children.map((c) => c.id)
					)
				);
			}
			await tx.delete(category).where(eq(category.id, categoryId));
		});
	}
	await logAction(actorId, 'Kategorie mit Inhalt gelöscht', cat.name, {
		...(mode === 'move' ? { verschoben: moved } : { geloeschteAnfragen: deleted }),
		unterkategorien: children.length
	});
}

// ---------------------------------------------------------------------------
// Test data

const pick = <T>(list: readonly T[]) => list[Math.floor(Math.random() * list.length)];
const randomInt = (min: number, max: number) => min + Math.floor(Math.random() * (max - min + 1));
const slugName = (name: string) =>
	name
		.toLowerCase()
		.normalize('NFD')
		.replace(/[^a-z0-9]+/g, '.')
		.replace(/^\.|\.$/g, '');

/**
 * The fixed pool of test customers and repairers, created on first use. They have no password;
 * the super admin uses them through "Anmelden als …".
 */
async function ensureTestAccounts() {
	const wanted = [
		...TEST_CUSTOMERS.map((name) => ({ name, role: 'kunde' })),
		...TEST_REPAIRERS.map((name) => ({ name, role: 'reparatur' }))
	];
	await db
		.insert(user)
		.values(
			wanted.map(({ name, role }) => ({
				id: `test-${role}-${slugName(name)}`,
				name,
				email: `${slugName(name)}.${role}@test.repairhub.invalid`,
				emailVerified: true,
				isTest: true,
				plz: pick(TEST_PLZ)
			}))
		)
		.onConflictDoNothing();
	const ids = (prefix: string, names: string[]) =>
		names.map((n) => `test-${prefix}-${slugName(n)}`);
	return { customers: ids('kunde', TEST_CUSTOMERS), repairers: ids('reparatur', TEST_REPAIRERS) };
}

/** Owner of generated requests: the test customer pool, or one specific user. */
export type TestOwner = { kind: 'pool' } | { kind: 'user'; userId: string };

export async function generateTestRequests(actorId: string, count: number, owner: TestOwner) {
	if (count < 1 || count > 50) throw new DomainError('Bitte 1 bis 50 Anfragen.');
	const accounts = await ensureTestAccounts();
	if (owner.kind === 'user') {
		const [u] = await db.select({ id: user.id }).from(user).where(eq(user.id, owner.userId));
		if (!u) throw new DomainError('Nutzer nicht gefunden.');
	}

	const categories = await db
		.select({ id: category.id, slug: category.slug })
		.from(category)
		.where(inArray(category.slug, Object.keys(REQUEST_POOL)));
	if (!categories.length) throw new DomainError('Keine passenden Kategorien gefunden.');
	const handoverSets = [
		['shipping'],
		['dropoff'],
		['shipping', 'dropoff'],
		['onsite'],
		['dropoff', 'onsite']
	] as const;
	const days = (n: number) => new Date(Date.now() + n * 24 * 60 * 60 * 1000);

	let quotes = 0;
	await db.transaction(async (tx) => {
		for (let i = 0; i < count; i++) {
			const cat = pick(categories);
			const item = pick(REQUEST_POOL[cat.slug]);
			const plz = pick(TEST_PLZ);
			const customerId = owner.kind === 'user' ? owner.userId : pick(accounts.customers);
			const handoverModes = [...pick(handoverSets)];
			const [created] = await tx
				.insert(repairRequest)
				.values({
					customerId,
					categoryId: cat.id,
					title: item.title,
					description: item.description,
					brand: item.brand ?? null,
					model: item.model ?? null,
					budgetCents: Math.random() < 0.7 ? randomInt(3, 30) * 1000 : null,
					timeframe: pick(['flexible', 'within_week', 'urgent'] as const),
					handoverModes,
					plz,
					city: sql`(select city from plz where plz = ${plz})`,
					location: plzLocation(plz),
					expiresAt: days(30),
					isTest: true,
					// Spread over the last two weeks, so the list doesn't look generated.
					createdAt: new Date(Date.now() - randomInt(0, 14 * 24 * 60) * 60 * 1000)
				})
				.returning({ id: repairRequest.id });

			const repairers = accounts.repairers
				.filter((id) => id !== customerId)
				.sort(() => Math.random() - 0.5)
				.slice(0, randomInt(0, 3));
			for (const repairerId of repairers) {
				await tx.insert(quote).values({
					requestId: created.id,
					repairerId,
					priceCents: randomInt(15, 180) * 100 + pick([0, 0, 50, 90]),
					estimatedDays: randomInt(1, 10),
					handoverMode: pick(handoverModes),
					includesReturnShipping: Math.random() < 0.5,
					message: pick(QUOTE_MESSAGES),
					validUntil: days(7)
				});
				quotes++;
			}
		}
	});
	await logAction(actorId, 'Testanfragen erzeugt', `${count} Anfragen, ${quotes} Angebote`);
	return { requests: count, quotes };
}

/** Removes the test account pool and everything they did (like a full user wipe each). */
export async function deleteTestAccounts(actorId: string) {
	const testUsers = await db.select({ id: user.id }).from(user).where(eq(user.isTest, true));
	const ids = testUsers.map((u) => u.id);
	if (!ids.length) return 0;
	let photoPaths: string[] = [];
	await db.transaction(async (tx) => {
		photoPaths = await photoPathsWhere(
			tx,
			inArray(
				requestImage.requestId,
				tx
					.select({ id: repairRequest.id })
					.from(repairRequest)
					.where(inArray(repairRequest.customerId, ids))
			)
		);
		const orders = await tx
			.select({ id: order.id, requestId: order.requestId, customerId: order.customerId })
			.from(order)
			.where(or(inArray(order.customerId, ids), inArray(order.repairerId, ids)));
		if (orders.length) {
			await tx.delete(order).where(
				inArray(
					order.id,
					orders.map((o) => o.id)
				)
			);
			const reopened = orders.filter((o) => !ids.includes(o.customerId)).map((o) => o.requestId);
			if (reopened.length) await reopenRequests(tx, reopened);
		}
		await tx.delete(user).where(inArray(user.id, ids));
	});
	await deletePhotos(photoPaths);
	await logAction(actorId, 'Testkonten gelöscht', `${ids.length} Konten`);
	return ids.length;
}

export async function listUserOptions() {
	return db
		.select({ id: user.id, name: user.name, email: user.email, isTest: user.isTest })
		.from(user)
		.where(isNull(user.deletedAt))
		.orderBy(user.name);
}

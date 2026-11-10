import { and, asc, desc, eq, sql } from 'drizzle-orm';
import { db } from '#lib/server/db/index.ts';
import { conversation, order, plz, quote, repairRequest, user } from '#lib/server/db/schema.ts';
import { ensureConversation } from '#lib/server/conversations.ts';
import { DomainError, isUniqueViolation } from '#lib/server/errors.ts';
import { canSendQuotes } from '#lib/server/payouts.ts';
import { repairerRatingColumns } from '#lib/server/reviews.ts';
import type { QuoteInput } from '#lib/schemas/quote.ts';

const QUOTE_VALIDITY_DAYS = 7;

export async function createQuote(repairerId: string, requestId: string, input: QuoteInput) {
	const request = await db.query.repairRequest.findFirst({
		where: eq(repairRequest.id, requestId),
		with: { customer: { columns: { bannedAt: true } } }
	});
	if (!request) throw new DomainError('Anfrage nicht gefunden.');
	if (request.customer.bannedAt) throw new DomainError('Diese Anfrage ist nicht mehr verfügbar.');
	if (request.customerId === repairerId) {
		throw new DomainError('Du kannst kein Angebot auf deine eigene Anfrage abgeben.');
	}
	if (request.status !== 'open' || request.expiresAt <= new Date()) {
		throw new DomainError('Diese Anfrage nimmt keine Angebote mehr an.');
	}
	if (!request.handoverModes.includes(input.handoverMode)) {
		throw new DomainError('Diese Übergabeart ist für die Anfrage nicht möglich.');
	}
	// Without a payout account the repairer couldn't be paid (Technical.md 3.5).
	if (!(await canSendQuotes(repairerId))) {
		throw new DomainError('Richte zuerst Auszahlungen ein, um Angebote abzugeben.');
	}

	const validUntil = new Date(Date.now() + QUOTE_VALIDITY_DAYS * 24 * 60 * 60 * 1000);
	try {
		await db.transaction(async (tx) => {
			await tx.insert(quote).values({
				requestId,
				repairerId,
				priceCents: input.price,
				estimatedDays: input.estimatedDays,
				handoverMode: input.handoverMode,
				includesReturnShipping: input.includesReturnShipping,
				message: input.message,
				partsNote: input.partsNote || null,
				validUntil
			});
			// A quote starts the chat between customer and repairer (Technical.md 3.9).
			await ensureConversation(tx, request, repairerId);
		});
	} catch (error) {
		if (isUniqueViolation(error)) {
			throw new DomainError('Du hast bereits ein offenes Angebot für diese Anfrage.');
		}
		throw error;
	}
}

export async function withdrawQuote(repairerId: string, quoteId: string) {
	const updated = await db
		.update(quote)
		.set({ status: 'withdrawn' })
		.where(
			and(eq(quote.id, quoteId), eq(quote.repairerId, repairerId), eq(quote.status, 'pending'))
		)
		.returning({ id: quote.id });
	if (!updated.length) throw new DomainError('Das Angebot kann nicht mehr zurückgezogen werden.');
}

const quoteColumns = {
	id: quote.id,
	priceCents: quote.priceCents,
	estimatedDays: quote.estimatedDays,
	handoverMode: quote.handoverMode,
	includesReturnShipping: quote.includesReturnShipping,
	message: quote.message,
	partsNote: quote.partsNote,
	status: quote.status,
	validUntil: quote.validUntil,
	createdAt: quote.createdAt
};

/**
 * Quotes on a request, for its owner, with what's needed to compare them (Technical.md 3.5):
 * the repairer's rating and their distance (PLZ centres of request and repairer profile).
 * Withdrawn quotes are hidden.
 */
export async function listQuotesForRequest(requestId: string) {
	return db
		.select({
			...quoteColumns,
			repairerId: quote.repairerId,
			repairerName: user.name,
			repairerImage: user.image,
			repairerBanned: sql<boolean>`${user.bannedAt} is not null`,
			...repairerRatingColumns(quote.repairerId),
			// Null when the repairer has no PLZ in their profile.
			distanceKm: sql<number | null>`ST_Distance(
				${repairRequest.location},
				(select ${plz.location} from ${plz} where ${plz.plz} = ${user.plz})
			) / 1000`.mapWith(Number),
			orderStatus: order.status,
			conversationId: conversation.id
		})
		.from(quote)
		.innerJoin(repairRequest, eq(quote.requestId, repairRequest.id))
		.innerJoin(user, eq(quote.repairerId, user.id))
		.leftJoin(order, eq(order.quoteId, quote.id))
		.leftJoin(
			conversation,
			and(
				eq(conversation.requestId, quote.requestId),
				eq(conversation.repairerId, quote.repairerId)
			)
		)
		.where(and(eq(quote.requestId, requestId), sql`${quote.status} <> 'withdrawn'`))
		.orderBy(
			// current acceptance first, then open quotes by price, then the rest
			sql`case
				when ${order.status} = 'cancelled' then 2
				when ${quote.status} = 'accepted' then 0
				when ${quote.status} = 'pending' then 1
				else 2 end`,
			asc(quote.priceCents)
		);
}

/** The repairer's most recent quote on a request, if any. */
export async function getLatestOwnQuote(requestId: string, repairerId: string) {
	const [row] = await db
		.select({ ...quoteColumns, orderId: order.id, orderStatus: order.status })
		.from(quote)
		.leftJoin(order, eq(order.quoteId, quote.id))
		.where(and(eq(quote.requestId, requestId), eq(quote.repairerId, repairerId)))
		.orderBy(desc(quote.createdAt))
		.limit(1);
	return row ?? null;
}

export async function listOwnQuotes(repairerId: string) {
	return db
		.select({
			...quoteColumns,
			requestId: repairRequest.id,
			requestTitle: repairRequest.title,
			orderId: order.id,
			orderStatus: order.status
		})
		.from(quote)
		.innerJoin(repairRequest, eq(quote.requestId, repairRequest.id))
		.leftJoin(order, eq(order.quoteId, quote.id))
		.where(eq(quote.repairerId, repairerId))
		.orderBy(desc(quote.createdAt));
}

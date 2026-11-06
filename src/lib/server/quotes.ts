import { and, asc, desc, eq, sql } from 'drizzle-orm';
import { db } from '#lib/server/db/index.ts';
import { order, quote, repairRequest, user } from '#lib/server/db/schema.ts';
import { DomainError, isUniqueViolation } from '#lib/server/errors.ts';
import type { QuoteInput } from '#lib/schemas/quote.ts';

const QUOTE_VALIDITY_DAYS = 7;

export async function createQuote(repairerId: string, requestId: string, input: QuoteInput) {
	const request = await db.query.repairRequest.findFirst({
		where: eq(repairRequest.id, requestId)
	});
	if (!request) throw new DomainError('Anfrage nicht gefunden.');
	if (request.customerId === repairerId) {
		throw new DomainError('Du kannst kein Angebot auf deine eigene Anfrage abgeben.');
	}
	if (request.status !== 'open' || request.expiresAt <= new Date()) {
		throw new DomainError('Diese Anfrage nimmt keine Angebote mehr an.');
	}
	if (!request.handoverModes.includes(input.handoverMode)) {
		throw new DomainError('Diese Übergabeart ist für die Anfrage nicht möglich.');
	}

	const validUntil = new Date(Date.now() + QUOTE_VALIDITY_DAYS * 24 * 60 * 60 * 1000);
	try {
		await db.insert(quote).values({
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

/** Quotes on a request, for its owner. Withdrawn quotes are hidden. */
export async function listQuotesForRequest(requestId: string) {
	return db
		.select({ ...quoteColumns, repairerId: quote.repairerId, repairerName: user.name })
		.from(quote)
		.innerJoin(user, eq(quote.repairerId, user.id))
		.where(and(eq(quote.requestId, requestId), sql`${quote.status} <> 'withdrawn'`))
		.orderBy(
			// accepted first, then open quotes by price, then the rest
			sql`case ${quote.status} when 'accepted' then 0 when 'pending' then 1 else 2 end`,
			asc(quote.priceCents)
		);
}

/** The repairer's most recent quote on a request, if any. */
export async function getLatestOwnQuote(requestId: string, repairerId: string) {
	const [row] = await db
		.select({ ...quoteColumns, orderId: order.id })
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
			orderId: order.id
		})
		.from(quote)
		.innerJoin(repairRequest, eq(quote.requestId, repairRequest.id))
		.leftJoin(order, eq(order.quoteId, quote.id))
		.where(eq(quote.repairerId, repairerId))
		.orderBy(desc(quote.createdAt));
}

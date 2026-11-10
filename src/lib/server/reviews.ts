import { and, avg, count, desc, eq, isNull, sql, type AnyColumn, type SQL } from 'drizzle-orm';
import { db } from '#lib/server/db/index.ts';
import { order, repairRequest, review, user } from '#lib/server/db/schema.ts';
import { DomainError, isUniqueViolation } from '#lib/server/errors.ts';
import type { ReviewInput } from '#lib/schemas/review.ts';

// Reviews after a completed order, in both directions (Technical.md 3.10).

/** Days after completion in which both sides can review. Afterwards every review is shown. */
export const REVIEW_WINDOW_DAYS = 14;

export type ReviewDirection = (typeof review.direction.enumValues)[number];

/**
 * A review is public once both sides reviewed (`published_at`) or the window is over, and as long
 * as no admin removed it. Needs `order` joined. No cron job needed: it's decided when reading.
 */
const isVisible: SQL = sql`(${review.removedAt} is null and (
	${review.publishedAt} is not null
	or ${order.completedAt} <= now() - make_interval(days => ${REVIEW_WINDOW_DAYS})
))`;

export function reviewWindowEnd(completedAt: Date) {
	return new Date(completedAt.getTime() + REVIEW_WINDOW_DAYS * 24 * 60 * 60 * 1000);
}

export async function createReview(orderId: string, authorId: string, input: ReviewInput) {
	try {
		await db.transaction(async (tx) => {
			// Locked, so two reviews arriving at the same time can't both miss each other.
			const [current] = await tx.select().from(order).where(eq(order.id, orderId)).for('update');
			const isCustomer = current?.customerId === authorId;
			if (!current || (!isCustomer && current.repairerId !== authorId)) {
				throw new DomainError('Auftrag nicht gefunden.');
			}
			if (current.status !== 'completed' || !current.completedAt) {
				throw new DomainError('Bewerten geht erst, wenn der Auftrag abgeschlossen ist.');
			}
			if (reviewWindowEnd(current.completedAt) <= new Date()) {
				throw new DomainError('Der Bewertungszeitraum ist vorbei.');
			}

			const direction: ReviewDirection = isCustomer
				? 'customer_to_repairer'
				: 'repairer_to_customer';
			await tx.insert(review).values({
				orderId,
				authorId,
				subjectId: isCustomer ? current.repairerId : current.customerId,
				direction,
				rating: input.rating,
				text: input.text || null
			});

			// The second review publishes both at once.
			const both = await tx
				.select({ id: review.id })
				.from(review)
				.where(eq(review.orderId, orderId));
			if (both.length === 2) {
				await tx.update(review).set({ publishedAt: new Date() }).where(eq(review.orderId, orderId));
			}
		});
	} catch (e) {
		if (isUniqueViolation(e)) throw new DomainError('Du hast diesen Auftrag schon bewertet.');
		throw e;
	}
}

const reviewColumns = {
	id: review.id,
	rating: review.rating,
	text: review.text,
	direction: review.direction,
	createdAt: review.createdAt
};

/**
 * The review state of an order for one of its parties: their own review, the other side's
 * review (only once it's visible), and until when reviewing is possible.
 */
export async function getOrderReviews(orderId: string, userId: string, completedAt: Date | null) {
	const rows = await db
		.select({
			...reviewColumns,
			authorId: review.authorId,
			publishedAt: review.publishedAt,
			removedAt: review.removedAt,
			visible: sql<boolean>`${isVisible}`
		})
		.from(review)
		.innerJoin(order, eq(review.orderId, order.id))
		.where(eq(review.orderId, orderId));

	const own = rows.find((r) => r.authorId === userId) ?? null;
	const other = rows.find((r) => r.authorId !== userId) ?? null;
	const windowEnd = completedAt ? reviewWindowEnd(completedAt) : null;
	return {
		own,
		// Only whether it exists until it's visible, so nobody can react to it.
		other: other?.visible ? other : null,
		otherIsHidden: Boolean(other && !other.visible && !other.removedAt),
		windowEnd,
		canReview: !own && windowEnd !== null && windowEnd > new Date()
	};
}

export type RatingSummary = { average: number | null; count: number };

/** Average and number of visible reviews a user received, per role. */
export async function getRatingSummary(userId: string) {
	const rows = await db
		.select({ direction: review.direction, average: avg(review.rating), count: count() })
		.from(review)
		.innerJoin(order, eq(review.orderId, order.id))
		.where(and(eq(review.subjectId, userId), isVisible))
		.groupBy(review.direction);
	const summary = (direction: ReviewDirection): RatingSummary => {
		const row = rows.find((r) => r.direction === direction);
		return { average: row?.average ? Number(row.average) : null, count: row?.count ?? 0 };
	};
	return {
		asRepairer: summary('customer_to_repairer'),
		asCustomer: summary('repairer_to_customer')
	};
}

/** Visible reviews a user received, newest first, for their profile. */
export async function listReviewsAbout(userId: string, limit = 50) {
	return db
		.select({
			...reviewColumns,
			authorId: review.authorId,
			authorName: user.name,
			authorImage: user.image,
			requestTitle: repairRequest.title
		})
		.from(review)
		.innerJoin(order, eq(review.orderId, order.id))
		.innerJoin(repairRequest, eq(order.requestId, repairRequest.id))
		.innerJoin(user, eq(review.authorId, user.id))
		.where(and(eq(review.subjectId, userId), isVisible))
		.orderBy(desc(review.createdAt))
		.limit(limit);
}

/**
 * Average rating of a repairer as SQL, for lists like the quote comparison (#37).
 * `repairerId` is the column holding the repairer's user id.
 */
export function repairerRatingColumns(repairerId: SQL | AnyColumn) {
	const visibleAbout = sql`from ${review} r
		join ${order} o on o.id = r.order_id
		where r.subject_id = ${repairerId}
			and r.direction = 'customer_to_repairer'
			and r.removed_at is null
			and (r.published_at is not null
				or o.completed_at <= now() - make_interval(days => ${REVIEW_WINDOW_DAYS}))`;
	return {
		ratingAverage: sql<number | null>`(select avg(r.rating) ${visibleAbout})`.mapWith(Number),
		ratingCount: sql<number>`(select count(*) ${visibleAbout})`.mapWith(Number)
	};
}

/** Admins can take a review down (Technical.md 3.10). It stays in the table. */
export async function removeReview(reviewId: string) {
	const updated = await db
		.update(review)
		.set({ removedAt: new Date() })
		.where(and(eq(review.id, reviewId), isNull(review.removedAt)))
		.returning({ id: review.id });
	if (!updated.length) throw new DomainError('Bewertung nicht gefunden.');
}

/** Orders where the user can still leave a review, for a hint in the order list. */
export function needsReviewSql(userId: string): SQL<boolean> {
	return sql<boolean>`(${order.status} = 'completed'
		and ${order.completedAt} > now() - make_interval(days => ${REVIEW_WINDOW_DAYS})
		and not exists (select 1 from ${review} r where r.order_id = ${order.id} and r.author_id = ${userId}))`;
}

import { and, asc, count, desc, eq, gt, ilike, or, inArray, type SQL } from 'drizzle-orm';
import { db } from '#lib/server/db/index.ts';
import { category, quote, repairRequest, user } from '#lib/server/db/schema.ts';
import type { HandoverMode } from '#lib/handover.ts';

const REQUEST_LIFETIME_DAYS = 30;

export type CategoryGroup = { id: string; name: string; slug: string; children: CategoryGroup[] };

/** All categories as a two-level tree, sorted for dropdowns and filters. */
export async function listCategoryTree(): Promise<CategoryGroup[]> {
	const rows = await db.select().from(category).orderBy(asc(category.sortOrder));
	const toNode = (c: (typeof rows)[number]): CategoryGroup => ({
		id: c.id,
		name: c.name,
		slug: c.slug,
		children: rows.filter((child) => child.parentId === c.id).map(toNode)
	});
	return rows.filter((c) => c.parentId === null).map(toNode);
}

const listColumns = {
	id: repairRequest.id,
	title: repairRequest.title,
	plz: repairRequest.plz,
	city: repairRequest.city,
	budgetCents: repairRequest.budgetCents,
	handoverModes: repairRequest.handoverModes,
	createdAt: repairRequest.createdAt,
	categoryName: category.name
};

export async function listOpenRequests(filters: {
	categorySlug?: string;
	q?: string;
	limit?: number;
}) {
	const conditions: SQL[] = [
		eq(repairRequest.status, 'open'),
		gt(repairRequest.expiresAt, new Date())
	];

	if (filters.categorySlug) {
		// A top-level category also matches requests in its subcategories.
		const selected = await db.query.category.findFirst({
			where: eq(category.slug, filters.categorySlug),
			with: { children: true }
		});
		if (selected) {
			const ids = [selected.id, ...selected.children.map((c) => c.id)];
			conditions.push(inArray(repairRequest.categoryId, ids));
		}
	}

	if (filters.q) {
		const pattern = `%${filters.q.replace(/[%_\\]/g, '\\$&')}%`;
		conditions.push(
			or(ilike(repairRequest.title, pattern), ilike(repairRequest.description, pattern))!
		);
	}

	return db
		.select(listColumns)
		.from(repairRequest)
		.innerJoin(category, eq(repairRequest.categoryId, category.id))
		.where(and(...conditions))
		.orderBy(desc(repairRequest.createdAt))
		.limit(filters.limit ?? 50);
}

export async function getRequest(id: string) {
	const [row] = await db
		.select({
			...listColumns,
			description: repairRequest.description,
			brand: repairRequest.brand,
			model: repairRequest.model,
			status: repairRequest.status,
			expiresAt: repairRequest.expiresAt,
			customerId: repairRequest.customerId,
			customerName: user.name
		})
		.from(repairRequest)
		.innerJoin(category, eq(repairRequest.categoryId, category.id))
		.innerJoin(user, eq(repairRequest.customerId, user.id))
		.where(eq(repairRequest.id, id));
	return row ?? null;
}

export async function createRequest(
	customerId: string,
	input: {
		title: string;
		categoryId: string;
		description: string;
		brand?: string;
		model?: string;
		budget: number | null;
		handoverModes: HandoverMode[];
		plz: string;
		city: string;
	}
) {
	const expiresAt = new Date(Date.now() + REQUEST_LIFETIME_DAYS * 24 * 60 * 60 * 1000);
	const [created] = await db
		.insert(repairRequest)
		.values({
			customerId,
			categoryId: input.categoryId,
			title: input.title,
			description: input.description,
			brand: input.brand || null,
			model: input.model || null,
			budgetCents: input.budget,
			handoverModes: input.handoverModes,
			plz: input.plz,
			city: input.city,
			expiresAt
		})
		.returning({ id: repairRequest.id });
	return created;
}

/** The user's own requests with the number of open quotes, newest first. */
export async function listOwnRequests(customerId: string) {
	return db
		.select({
			id: repairRequest.id,
			title: repairRequest.title,
			status: repairRequest.status,
			expiresAt: repairRequest.expiresAt,
			createdAt: repairRequest.createdAt,
			pendingQuotes: count(quote.id)
		})
		.from(repairRequest)
		.leftJoin(quote, and(eq(quote.requestId, repairRequest.id), eq(quote.status, 'pending')))
		.where(eq(repairRequest.customerId, customerId))
		.groupBy(repairRequest.id)
		.orderBy(desc(repairRequest.createdAt));
}

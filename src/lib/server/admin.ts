import { error, redirect, type RequestEvent } from '@sveltejs/kit';
import { and, asc, count, desc, eq, ilike, isNull, max, or, sql } from 'drizzle-orm';
import { db } from '#lib/server/db/index.ts';
import {
	category,
	conversation,
	message,
	order,
	quote,
	repairRequest,
	session,
	user
} from '#lib/server/db/schema.ts';
import { DomainError, isUniqueViolation } from '#lib/server/errors.ts';
import { loginUrl } from '#lib/server/redirect.ts';

/**
 * Guard for everything under /admin. Form actions don't run the layout load, so every
 * load *and* action calls this. Non-admins get a 404, so the area isn't advertised.
 */
export function requireAdmin(event: Pick<RequestEvent, 'locals' | 'url'>) {
	const current = event.locals.user;
	if (!current) redirect(303, loginUrl(event.url));
	if (!current.isAdmin) error(404, 'Seite nicht gefunden');
	return current;
}

// ---------------------------------------------------------------------------
// Dashboard (Technical.md 3.13)

/** Orders that count as booked volume: paid and not cancelled or refunded. */
const bookedOrder = sql`${order.status} in ('paid', 'in_progress', 'repaired', 'completed', 'disputed')`;

export async function getDashboardStats() {
	const [users, requests, quotes, orders, chat, weekly] = await Promise.all([
		db
			.select({
				total: count(),
				newThisWeek: count(
					sql`case when ${user.createdAt} >= now() - interval '7 days' then 1 end`
				),
				admins: count(sql`case when ${user.isAdmin} then 1 end`),
				banned: count(user.bannedAt)
			})
			.from(user)
			.then(([r]) => r),
		db
			.select({
				total: count(),
				// Expiry isn't written back yet (no cron), so derive it here like the pages do.
				open: count(
					sql`case when ${repairRequest.status} = 'open' and ${repairRequest.expiresAt} > now() then 1 end`
				),
				expired: count(
					sql`case when ${repairRequest.status} = 'expired' or (${repairRequest.status} = 'open' and ${repairRequest.expiresAt} <= now()) then 1 end`
				),
				assigned: count(sql`case when ${repairRequest.status} = 'assigned' then 1 end`),
				closed: count(sql`case when ${repairRequest.status} = 'closed' then 1 end`)
			})
			.from(repairRequest)
			.then(([r]) => r),
		db
			.select({
				total: count(),
				requestsWithQuote: sql<number>`count(distinct ${quote.requestId})`.mapWith(Number)
			})
			.from(quote)
			.then(([r]) => r),
		db
			.select({
				total: count(),
				running: count(
					sql`case when ${order.status} in ('paid', 'in_progress', 'repaired', 'disputed') then 1 end`
				),
				completed: count(sql`case when ${order.status} = 'completed' then 1 end`),
				booked: count(sql`case when ${bookedOrder} then 1 end`),
				cancelled: count(sql`case when ${order.status} in ('cancelled', 'refunded') then 1 end`),
				gmvCents:
					sql<number>`coalesce(sum(${order.priceCents}) filter (where ${bookedOrder}), 0)`.mapWith(
						Number
					),
				commissionEarnedCents:
					sql<number>`coalesce(sum(${order.commissionCents}) filter (where ${order.status} = 'completed'), 0)`.mapWith(
						Number
					),
				commissionPendingCents:
					sql<number>`coalesce(sum(${order.commissionCents}) filter (where ${order.status} in ('paid', 'in_progress', 'repaired', 'disputed')), 0)`.mapWith(
						Number
					),
				requestsWithOrder:
					sql<number>`count(distinct ${order.requestId}) filter (where ${bookedOrder})`.mapWith(
						Number
					)
			})
			.from(order)
			.then(([r]) => r),
		Promise.all([
			db.select({ n: count() }).from(conversation),
			db
				.select({
					n: count(),
					flagged: count(sql`case when ${message.flaggedContactInfo} then 1 end`)
				})
				.from(message)
		]).then(([[c], [m]]) => ({ conversations: c.n, messages: m.n, flagged: m.flagged })),
		getWeeklyStats(8)
	]);

	return { users, requests, quotes, orders, chat, weekly };
}

/** New users, requests and orders per calendar week (Monday start), newest week first. */
async function getWeeklyStats(weeks: number) {
	const rows = await db.execute<{
		week: string;
		users: number;
		requests: number;
		orders: number;
		gmv_cents: number;
	}>(sql`
		with w as (
			select generate_series(
				date_trunc('week', now()) - make_interval(weeks => ${weeks - 1}),
				date_trunc('week', now()),
				interval '1 week'
			) as week
		)
		select
			to_char(w.week, 'YYYY-MM-DD') as week,
			(select count(*) from ${user} u where date_trunc('week', u.created_at) = w.week)::int as users,
			(select count(*) from ${repairRequest} r where date_trunc('week', r.created_at) = w.week)::int as requests,
			(select count(*) from ${order} o where date_trunc('week', o.created_at) = w.week)::int as orders,
			(select coalesce(sum(o.price_cents), 0) from ${order} o
				where date_trunc('week', o.created_at) = w.week
				and o.status in ('paid', 'in_progress', 'repaired', 'completed', 'disputed'))::int as gmv_cents
		from w
		order by w.week desc
	`);
	return rows.map((r) => ({
		weekStart: new Date(`${r.week}T00:00:00`),
		users: r.users,
		requests: r.requests,
		orders: r.orders,
		gmvCents: r.gmv_cents
	}));
}

// ---------------------------------------------------------------------------
// Users

// Drizzle leaves column names unqualified inside select fields, so the correlated subqueries
// below name the outer table explicitly.

export async function listUsers(search: string) {
	const conditions = [];
	if (search) {
		const pattern = `%${search.replace(/[%_\\]/g, '\\$&')}%`;
		conditions.push(or(ilike(user.name, pattern), ilike(user.email, pattern)));
	}

	return db
		.select({
			id: user.id,
			name: user.name,
			email: user.email,
			image: user.image,
			isAdmin: user.isAdmin,
			isSuperAdmin: user.isSuperAdmin,
			isTest: user.isTest,
			deletedAt: user.deletedAt,
			bannedAt: user.bannedAt,
			createdAt: user.createdAt,
			requests:
				sql<number>`(select count(*) from ${repairRequest} r where r.customer_id = "user".id)`.mapWith(
					Number
				),
			quotes:
				sql<number>`(select count(*) from ${quote} q where q.repairer_id = "user".id)`.mapWith(
					Number
				),
			orders:
				sql<number>`(select count(*) from ${order} o where "user".id in (o.customer_id, o.repairer_id))`.mapWith(
					Number
				)
		})
		.from(user)
		.where(and(...conditions))
		.orderBy(desc(user.createdAt))
		.limit(100);
}

/**
 * Bans or unbans a user. A ban deletes all their sessions (logs them out everywhere), blocks
 * new logins and hides their open requests. Nothing is deleted, so unbanning restores everything.
 */
export async function setBanned(adminId: string, userId: string, banned: boolean) {
	if (adminId === userId) throw new DomainError('Du kannst dich nicht selbst sperren.');

	await db.transaction(async (tx) => {
		const [target] = await tx
			.select({ isAdmin: user.isAdmin, isSuperAdmin: user.isSuperAdmin })
			.from(user)
			.where(eq(user.id, userId))
			.for('update');
		if (!target) throw new DomainError('Nutzer nicht gefunden.');
		if (target.isSuperAdmin) throw new DomainError('Dieses Konto kann nicht gesperrt werden.');
		if (banned && target.isAdmin) {
			throw new DomainError(
				'Admins können nicht gesperrt werden. Entziehe zuerst die Adminrechte.'
			);
		}

		await tx
			.update(user)
			.set({ bannedAt: banned ? new Date() : null })
			.where(and(eq(user.id, userId), banned ? isNull(user.bannedAt) : sql`true`));
		if (banned) await tx.delete(session).where(eq(session.userId, userId));
	});
}

export async function setAdmin(adminId: string, userId: string, isAdmin: boolean) {
	// Also guarantees there is always at least one admin left.
	if (adminId === userId && !isAdmin) {
		throw new DomainError('Du kannst dir die Adminrechte nicht selbst entziehen.');
	}
	// The super admin is always admin; only SUPER_ADMIN_EMAIL can change that, not the UI.
	const [target] = await db
		.select({ isSuperAdmin: user.isSuperAdmin })
		.from(user)
		.where(eq(user.id, userId));
	if (target?.isSuperAdmin && !isAdmin) {
		throw new DomainError('Diesem Konto können die Adminrechte nicht entzogen werden.');
	}
	const updated = await db
		.update(user)
		.set({ isAdmin })
		.where(and(eq(user.id, userId), isAdmin ? isNull(user.bannedAt) : sql`true`))
		.returning({ id: user.id });
	if (!updated.length) throw new DomainError('Gesperrte Nutzer können keine Admins werden.');
}

// ---------------------------------------------------------------------------
// Categories (two levels, Technical.md 3.2)

export async function listCategoriesForAdmin() {
	const rows = await db
		.select({
			id: category.id,
			parentId: category.parentId,
			slug: category.slug,
			name: category.name,
			sortOrder: category.sortOrder,
			requests:
				sql<number>`(select count(*) from ${repairRequest} r where r.category_id = category.id)`.mapWith(
					Number
				)
		})
		.from(category)
		.orderBy(asc(category.sortOrder), asc(category.name));

	return rows
		.filter((c) => c.parentId === null)
		.map((top) => ({ ...top, children: rows.filter((c) => c.parentId === top.id) }));
}

export async function renameCategory(id: string, name: string) {
	const updated = await db
		.update(category)
		.set({ name })
		.where(eq(category.id, id))
		.returning({ id: category.id });
	if (!updated.length) throw new DomainError('Kategorie nicht gefunden.');
}

/** Swaps a category with its neighbour among its siblings, then renumbers them 10, 20, 30 … */
export async function moveCategory(id: string, direction: 'up' | 'down') {
	await db.transaction(async (tx) => {
		const [current] = await tx.select().from(category).where(eq(category.id, id));
		if (!current) throw new DomainError('Kategorie nicht gefunden.');

		const siblings = await tx
			.select({ id: category.id })
			.from(category)
			.where(
				current.parentId === null
					? isNull(category.parentId)
					: eq(category.parentId, current.parentId)
			)
			.orderBy(asc(category.sortOrder), asc(category.name))
			.for('update');

		const index = siblings.findIndex((s) => s.id === id);
		const target = direction === 'up' ? index - 1 : index + 1;
		if (target < 0 || target >= siblings.length) return;
		[siblings[index], siblings[target]] = [siblings[target], siblings[index]];

		for (const [i, s] of siblings.entries()) {
			await tx
				.update(category)
				.set({ sortOrder: (i + 1) * 10 })
				.where(eq(category.id, s.id));
		}
	});
}

/** Lowercase ASCII slug, e.g. "Möbel & Holz" → "moebel-holz". */
export function slugify(name: string): string {
	return name
		.toLowerCase()
		.replace(/ä/g, 'ae')
		.replace(/ö/g, 'oe')
		.replace(/ü/g, 'ue')
		.replace(/ß/g, 'ss')
		.normalize('NFKD')
		.replace(/[̀-ͯ]/g, '')
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '');
}

export async function createCategory(parentId: string | null, name: string) {
	if (parentId) {
		const parent = await db.query.category.findFirst({ where: eq(category.id, parentId) });
		if (!parent) throw new DomainError('Oberkategorie nicht gefunden.');
		if (parent.parentId) throw new DomainError('Kategorien haben nur zwei Ebenen.');
	}

	const [{ last }] = await db
		.select({ last: max(category.sortOrder) })
		.from(category)
		.where(parentId ? eq(category.parentId, parentId) : isNull(category.parentId));

	// Slugs appear in URLs (?kategorie=…) and must be unique across the whole tree.
	const base = slugify(name) || 'kategorie';
	for (let attempt = 1; attempt <= 20; attempt++) {
		const slug = attempt === 1 ? base : `${base}-${attempt}`;
		try {
			await db.insert(category).values({ parentId, name, slug, sortOrder: (last ?? 0) + 10 });
			return;
		} catch (e) {
			if (!isUniqueViolation(e)) throw e;
		}
	}
	throw new DomainError('Für diesen Namen konnte keine eindeutige Adresse erzeugt werden.');
}

/** Only unused categories can be deleted (requests reference them), e.g. to fix a typo. */
export async function deleteCategory(id: string) {
	await db.transaction(async (tx) => {
		const [[children], [requests]] = await Promise.all([
			tx.select({ n: count() }).from(category).where(eq(category.parentId, id)),
			tx.select({ n: count() }).from(repairRequest).where(eq(repairRequest.categoryId, id))
		]);
		if (children.n) throw new DomainError('Lösche zuerst die Unterkategorien.');
		if (requests.n) {
			throw new DomainError(
				'Die Kategorie wird von Anfragen verwendet und kann nur umbenannt werden.'
			);
		}
		await tx.delete(category).where(eq(category.id, id));
	});
}

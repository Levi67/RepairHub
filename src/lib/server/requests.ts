import {
	and,
	asc,
	count,
	desc,
	eq,
	gt,
	ilike,
	isNull,
	ne,
	or,
	inArray,
	sql,
	type SQL
} from 'drizzle-orm';
import { db } from '#lib/server/db/index.ts';
import { category, quote, repairRequest, requestImage, user } from '#lib/server/db/schema.ts';
import { DomainError, isUniqueViolation } from '#lib/server/errors.ts';
import { latOf, lngOf, lookupPlz, plzLocation, pointOf, UNKNOWN_PLZ } from '#lib/server/geo.ts';
import { deletePhotos, isOwnPhotoPath, photoUrl, verifyPhoto } from '#lib/server/storage.ts';
import { canRenewRequest } from '#lib/status.ts';
import {
	MAX_PHOTOS,
	type repairRequestSchema,
	type RequestAdditionInput
} from '#lib/schemas/request.ts';
import type { z } from 'zod';

type RequestData = z.output<typeof repairRequestSchema>;

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

const baseColumns = {
	id: repairRequest.id,
	title: repairRequest.title,
	plz: repairRequest.plz,
	city: repairRequest.city,
	budgetCents: repairRequest.budgetCents,
	handoverModes: repairRequest.handoverModes,
	createdAt: repairRequest.createdAt,
	categoryName: category.name
};

const listColumns = {
	...baseColumns,
	coverPath: sql<string | null>`(
		select ${requestImage.storagePath} from ${requestImage}
		where ${requestImage.requestId} = ${repairRequest.id}
		order by ${requestImage.sortOrder} limit 1
	)`
};

/** Adds the public URL of the cover photo for request cards. */
const withCoverUrl = <T extends { coverPath: string | null }>({ coverPath, ...row }: T) => ({
	...row,
	coverUrl: coverPath ? photoUrl(coverPath) : null
});

export type DistanceFilter = {
	/** Where to measure from: the centre of a PLZ (see `lookupPlz`). */
	origin: { lat: number; lng: number };
	/** Only requests within this many km; null = everywhere, but still show the distance. */
	radiusKm: number | null;
	/** Requests that can be shipped are shown regardless of distance (Technical.md 3.11). */
	includeShipping: boolean;
};

export async function listOpenRequests(filters: {
	categorySlug?: string;
	q?: string;
	customerId?: string;
	distance?: DistanceFilter;
	limit?: number;
}) {
	const conditions: SQL[] = [
		eq(repairRequest.status, 'open'),
		gt(repairRequest.expiresAt, new Date()),
		// Requests of banned users are hidden (Technical.md 9), and come back on unban.
		isNull(user.bannedAt)
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

	if (filters.customerId) conditions.push(eq(repairRequest.customerId, filters.customerId));

	if (filters.q) {
		const pattern = `%${filters.q.replace(/[%_\\]/g, '\\$&')}%`;
		conditions.push(
			or(ilike(repairRequest.title, pattern), ilike(repairRequest.description, pattern))!
		);
	}

	const origin = filters.distance ? pointOf(filters.distance.origin) : null;
	if (filters.distance?.radiusKm && origin) {
		const within = sql`ST_DWithin(${repairRequest.location}, ${origin}, ${filters.distance.radiusKm * 1000})`;
		conditions.push(
			filters.distance.includeShipping
				? or(within, sql`'shipping' = any(${repairRequest.handoverModes})`)!
				: within
		);
	}

	const rows = await db
		.select({
			...listColumns,
			lat: latOf(repairRequest.location),
			lng: lngOf(repairRequest.location),
			distanceKm: origin
				? sql<number | null>`ST_Distance(${repairRequest.location}, ${origin}) / 1000`.mapWith(
						Number
					)
				: sql<null>`null`
		})
		.from(repairRequest)
		.innerJoin(category, eq(repairRequest.categoryId, category.id))
		.innerJoin(user, eq(repairRequest.customerId, user.id))
		.where(and(...conditions))
		.orderBy(desc(repairRequest.createdAt))
		.limit(filters.limit ?? 50);
	return rows.map(withCoverUrl);
}

async function listPhotos(requestId: string) {
	const rows = await db
		.select({ path: requestImage.storagePath })
		.from(requestImage)
		.where(eq(requestImage.requestId, requestId))
		.orderBy(asc(requestImage.sortOrder));
	return rows.map(({ path }) => ({ path, url: photoUrl(path) }));
}

/** Quotes that count as "the request has quotes": every one except withdrawn ones. */
async function hasQuotes(requestId: string) {
	const [row] = await db
		.select({ n: count() })
		.from(quote)
		.where(and(eq(quote.requestId, requestId), ne(quote.status, 'withdrawn')));
	return row.n > 0;
}

export async function getRequest(id: string) {
	const [row] = await db
		.select({
			...baseColumns,
			description: repairRequest.description,
			categoryId: repairRequest.categoryId,
			timeframe: repairRequest.timeframe,
			brand: repairRequest.brand,
			model: repairRequest.model,
			status: repairRequest.status,
			expiresAt: repairRequest.expiresAt,
			customerId: repairRequest.customerId,
			customerName: user.name,
			customerBanned: sql<boolean>`${user.bannedAt} is not null`
		})
		.from(repairRequest)
		.innerJoin(category, eq(repairRequest.categoryId, category.id))
		.innerJoin(user, eq(repairRequest.customerId, user.id))
		.where(eq(repairRequest.id, id));
	if (!row) return null;
	return { ...row, photos: await listPhotos(id) };
}

/**
 * Checks photos the user just uploaded: own upload folder, and the file is a real WebP image.
 * Photos already attached to the request (`known`) are not checked again.
 */
async function verifyNewPhotos(userId: string, paths: string[], known = new Set<string>()) {
	const fresh = paths.filter((p) => !known.has(p));
	if (fresh.some((p) => !isOwnPhotoPath(p, userId))) throw new DomainError('Ungültiges Foto.');
	const ok = await Promise.all(fresh.map(verifyPhoto));
	if (ok.includes(false)) {
		throw new DomainError('Ein Foto ist nicht angekommen. Bitte entferne es und lade es neu hoch.');
	}
}

function photoRows(requestId: string, paths: string[], offset = 0) {
	return paths.map((storagePath, i) => ({ requestId, storagePath, sortOrder: offset + i }));
}

/** A photo path can only belong to one request (unique index). */
function rethrowPhotoReuse(error: unknown): never {
	if (isUniqueViolation(error))
		throw new DomainError('Ein Foto gehört schon zu einer anderen Anfrage.');
	throw error;
}

/** Every request needs a known PLZ, so it has a location for distance search. */
async function requireKnownPlz(plz: string) {
	if (!(await lookupPlz(plz))) throw new DomainError(UNKNOWN_PLZ);
}

const requestFields = (input: RequestData) => ({
	categoryId: input.categoryId,
	title: input.title,
	description: input.description,
	brand: input.brand || null,
	model: input.model || null,
	budgetCents: input.budget,
	timeframe: input.timeframe,
	handoverModes: input.handoverModes,
	plz: input.plz,
	city: input.city,
	location: plzLocation(input.plz)
});

const newExpiry = () => new Date(Date.now() + REQUEST_LIFETIME_DAYS * 24 * 60 * 60 * 1000);

export async function createRequest(customerId: string, input: RequestData) {
	await requireKnownPlz(input.plz);
	await verifyNewPhotos(customerId, input.photos);
	try {
		return await db.transaction(async (tx) => {
			const [created] = await tx
				.insert(repairRequest)
				.values({ customerId, ...requestFields(input), expiresAt: newExpiry() })
				.returning({ id: repairRequest.id });
			await tx.insert(requestImage).values(photoRows(created.id, input.photos));
			return created;
		});
	} catch (e) {
		rethrowPhotoReuse(e);
	}
}

/**
 * The owner's request for editing (Technical.md 3.3): `full` until the first quote, after that
 * the customer can only add a note and photos. Null if it can't be edited at all.
 */
export async function getRequestForEdit(requestId: string, customerId: string) {
	const request = await getRequest(requestId);
	if (!request || request.customerId !== customerId) return null;
	if (request.status !== 'open') return { request, mode: 'locked' as const };
	return { request, mode: (await hasQuotes(requestId)) ? ('addOnly' as const) : ('full' as const) };
}

async function requireEditable(requestId: string, customerId: string) {
	const found = await getRequestForEdit(requestId, customerId);
	if (!found) throw new DomainError('Anfrage nicht gefunden.');
	if (found.mode === 'locked') {
		throw new DomainError('Diese Anfrage kann nicht mehr bearbeitet werden.');
	}
	return found;
}

export async function updateRequest(requestId: string, customerId: string, input: RequestData) {
	const { request, mode } = await requireEditable(requestId, customerId);
	if (mode !== 'full') {
		throw new DomainError(
			'Es gibt schon Angebote. Du kannst nur noch einen Nachtrag und Fotos hinzufügen.'
		);
	}
	await requireKnownPlz(input.plz);
	const known = new Set(request.photos.map((p) => p.path));
	await verifyNewPhotos(customerId, input.photos, known);

	try {
		await db.transaction(async (tx) => {
			await tx
				.update(repairRequest)
				.set(requestFields(input))
				.where(and(eq(repairRequest.id, requestId), eq(repairRequest.status, 'open')));
			// Simplest way to apply removals and the new order: replace all rows.
			await tx.delete(requestImage).where(eq(requestImage.requestId, requestId));
			await tx.insert(requestImage).values(photoRows(requestId, input.photos));
		});
	} catch (e) {
		rethrowPhotoReuse(e);
	}
	const kept = new Set(input.photos);
	await deletePhotos([...known].filter((p) => !kept.has(p)));
}

/** After the first quote: a dated note below the description, and more photos. Nothing is removed. */
export async function addToRequest(
	requestId: string,
	customerId: string,
	input: RequestAdditionInput
) {
	const { request } = await requireEditable(requestId, customerId);
	const known = new Set(request.photos.map((p) => p.path));
	const added = input.photos.filter((p) => !known.has(p));
	if (known.size + added.length > MAX_PHOTOS) {
		throw new DomainError(`Höchstens ${MAX_PHOTOS} Fotos pro Anfrage.`);
	}
	await verifyNewPhotos(customerId, added);

	const date = new Date().toLocaleDateString('de-DE', { timeZone: 'Europe/Berlin' });
	try {
		await db.transaction(async (tx) => {
			if (input.addendum) {
				await tx
					.update(repairRequest)
					.set({
						description: sql`${repairRequest.description} || ${`\n\nNachtrag vom ${date}:\n${input.addendum}`}`
					})
					.where(eq(repairRequest.id, requestId));
			}
			if (added.length) {
				await tx.insert(requestImage).values(photoRows(requestId, added, known.size));
			}
		});
	} catch (e) {
		rethrowPhotoReuse(e);
	}
}

/**
 * The customer takes the request down (Technical.md 3.3 `closed`). Open quotes are rejected.
 * A request with a running order can't be closed; the order has to be cancelled first.
 */
export async function closeRequest(requestId: string, customerId: string) {
	await db.transaction(async (tx) => {
		const [closed] = await tx
			.update(repairRequest)
			.set({ status: 'closed' })
			.where(
				and(
					eq(repairRequest.id, requestId),
					eq(repairRequest.customerId, customerId),
					inArray(repairRequest.status, ['open', 'expired'])
				)
			)
			.returning({ id: repairRequest.id });
		if (!closed) throw new DomainError('Diese Anfrage kann nicht zurückgezogen werden.');
		await tx
			.update(quote)
			.set({ status: 'rejected' })
			.where(and(eq(quote.requestId, requestId), eq(quote.status, 'pending')));
	});
}

/** Another 30 days from now, once the request has expired or is about to. */
export async function renewRequest(requestId: string, customerId: string) {
	const request = await db.query.repairRequest.findFirst({
		where: and(eq(repairRequest.id, requestId), eq(repairRequest.customerId, customerId))
	});
	if (!request) throw new DomainError('Anfrage nicht gefunden.');
	if (!canRenewRequest(request)) {
		throw new DomainError('Diese Anfrage kann gerade nicht verlängert werden.');
	}
	await db
		.update(repairRequest)
		.set({ status: 'open', expiresAt: newExpiry() })
		.where(
			and(eq(repairRequest.id, requestId), inArray(repairRequest.status, ['open', 'expired']))
		);
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

import { eq, sql, type AnyColumn, type SQL } from 'drizzle-orm';
import { db } from '#lib/server/db/index.ts';
import { plz as plzTable } from '#lib/server/db/schema.ts';

// Every location is the centre of a PLZ area, never an exact address (Technical.md 3.11).

export type PlzInfo = { plz: string; city: string; places: string[]; lat: number; lng: number };

export const UNKNOWN_PLZ = 'Diese PLZ kennen wir nicht. Bitte prüfe sie.';

export async function lookupPlz(plz: string): Promise<PlzInfo | null> {
	if (!/^\d{5}$/.test(plz)) return null;
	const [row] = await db
		.select({
			plz: plzTable.plz,
			city: plzTable.city,
			places: plzTable.places,
			lat: sql<number>`ST_Y(${plzTable.location}::geometry)`.mapWith(Number),
			lng: sql<number>`ST_X(${plzTable.location}::geometry)`.mapWith(Number)
		})
		.from(plzTable)
		.where(eq(plzTable.plz, plz));
	return row ?? null;
}

/** The centre of a PLZ as a value for a geography column; null if the PLZ is unknown. */
export const plzLocation = (plz: string): SQL =>
	sql`(select ${plzTable.location} from ${plzTable} where ${plzTable.plz} = ${plz})`;

/** A point to measure from, e.g. `pointOf(origin)` from `lookupPlz`. */
export const pointOf = ({ lat, lng }: { lat: number; lng: number }): SQL =>
	sql`ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography`;

/** Latitude/longitude of a geography column, for markers on the map. */
export const latOf = (column: AnyColumn | SQL) =>
	sql<number | null>`ST_Y(${column}::geometry)`.mapWith(Number);
export const lngOf = (column: AnyColumn | SQL) =>
	sql<number | null>`ST_X(${column}::geometry)`.mapWith(Number);

// All amounts are stored as integer cents (see Technical.md 3.8).

const euro = new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' });

export function formatCents(cents: number): string {
	return euro.format(cents / 100);
}

/**
 * Highest amount a user can enter (budget, quote price). Amounts are stored as Postgres
 * `integer` cents, which ends at 2 147 483 647 (≈ 21,4 Mio. €); 100.000 € is far below that
 * and far above any real repair.
 */
export const MAX_AMOUNT_CENTS = 100_000_00;

/** Parses user input like "49", "49,90" or "1.234,50" into cents. Returns null if invalid. */
export function parseEuroToCents(input: string): number | null {
	const normalized = input.trim().replace(/\s|€/g, '').replace(/\./g, '').replace(',', '.');
	if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return null;
	return Math.round(Number(normalized) * 100);
}

/** Commission in cents, rounded to whole cents. `rateBp` is in basis points (1000 = 10 %). */
export function commissionCents(priceCents: number, rateBp: number): number {
	return Math.round((priceCents * rateBp) / 10_000);
}

/** Cents as a value for a form input that `parseEuroToCents` reads back, e.g. "50" or "49,90". */
export function centsToInput(cents: number | null): string {
	if (cents === null) return '';
	return cents % 100 === 0 ? String(cents / 100) : (cents / 100).toFixed(2).replace('.', ',');
}

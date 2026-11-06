// All amounts are stored as integer cents (see Technical.md 3.8).

const euro = new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' });

export function formatCents(cents: number): string {
	return euro.format(cents / 100);
}

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

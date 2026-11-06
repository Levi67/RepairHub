// Status values mirror the pg enums in src/lib/server/db/schema.ts.

export const requestStatusLabels = {
	open: 'Offen',
	assigned: 'Vergeben',
	closed: 'Geschlossen',
	expired: 'Abgelaufen'
} as const;

export const quoteStatusLabels = {
	pending: 'Offen',
	accepted: 'Angenommen',
	rejected: 'Nicht gewählt',
	withdrawn: 'Zurückgezogen',
	expired: 'Abgelaufen'
} as const;

export const orderStatusLabels = {
	awaiting_payment: 'Wartet auf Zahlung',
	paid: 'Bezahlt',
	in_progress: 'In Arbeit',
	repaired: 'Repariert',
	completed: 'Abgeschlossen',
	cancelled: 'Storniert',
	disputed: 'Problem gemeldet',
	refunded: 'Erstattet'
} as const;

export type RequestStatus = keyof typeof requestStatusLabels;
export type QuoteStatus = keyof typeof quoteStatusLabels;
export type OrderStatus = keyof typeof orderStatusLabels;

/** Tailwind classes for the small status badges. */
export function statusTone(status: RequestStatus | QuoteStatus | OrderStatus): string {
	switch (status) {
		case 'open':
		case 'pending':
		case 'paid':
		case 'in_progress':
			return 'bg-sky-100 text-sky-800';
		case 'accepted':
		case 'assigned':
		case 'repaired':
		case 'completed':
			return 'bg-emerald-100 text-emerald-800';
		case 'disputed':
			return 'bg-amber-100 text-amber-800';
		default:
			return 'bg-stone-100 text-stone-600';
	}
}

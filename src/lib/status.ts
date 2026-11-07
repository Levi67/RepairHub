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

/**
 * What a quote shows to users: an open quote past its validity is "expired", and an accepted
 * quote whose order was cancelled shows the cancellation.
 */
export function quoteDisplayStatus(
	q: { status: QuoteStatus; validUntil: Date; orderStatus?: OrderStatus | null },
	now = new Date()
): { status: QuoteStatus | OrderStatus; label: string } {
	if (q.status === 'pending' && q.validUntil <= now) {
		return { status: 'expired', label: quoteStatusLabels.expired };
	}
	if (q.status === 'accepted' && q.orderStatus === 'cancelled') {
		return { status: 'cancelled', label: orderStatusLabels.cancelled };
	}
	return { status: q.status, label: quoteStatusLabels[q.status] };
}

/** Requests past `expires_at` count as expired, even before the expiry cron job sets the status. */
export function requestDisplayStatus(
	r: { status: RequestStatus; expiresAt: Date },
	now = new Date()
): RequestStatus {
	return r.status === 'open' && r.expiresAt <= now ? 'expired' : r.status;
}

/** Days before expiry from which the customer may renew a request. */
export const RENEW_WINDOW_DAYS = 3;

/** Renewing is possible once a request has expired, or shortly before. */
export function canRenewRequest(
	r: { status: RequestStatus; expiresAt: Date },
	now = new Date()
): boolean {
	if (r.status === 'expired') return true;
	const windowStart = r.expiresAt.getTime() - RENEW_WINDOW_DAYS * 24 * 60 * 60 * 1000;
	return r.status === 'open' && now.getTime() >= windowStart;
}

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

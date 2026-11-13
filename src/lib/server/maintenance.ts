// Background jobs (#49), run once a day by Vercel Cron through /api/cron, or by hand by the super
// admin (Protokoll → "Jetzt ausführen"). Every step is safe to repeat and only touches what is due,
// so a run that is late, doubled or interrupted does no harm.
import { and, eq, isNotNull, isNull, lte, sql } from 'drizzle-orm';
import { db } from '#lib/server/db/index.ts';
import { order, quote, repairRequest, repairerProfile } from '#lib/server/db/schema.ts';
import {
	autoConfirmOrder,
	cancelUnpaidOrder,
	releasePayout,
	UNPAID_ORDER_HOURS
} from '#lib/server/orders.ts';
import { logAction } from '#lib/server/superadmin.ts';

/** Orders handled per step and run, so one run stays well inside Vercel's time limit. */
const BATCH = 25;

export const MAINTENANCE_ACTION = 'Automatische Wartung';

export type MaintenanceResult = {
	requestsExpired: number;
	quotesExpired: number;
	ordersCancelled: number;
	ordersConfirmed: number;
	payoutsSent: number;
	errors: number;
};

/** Runs every job once. `actorId` is the super admin for a manual run, null for the cron job. */
export async function runMaintenance(actorId: string | null = null): Promise<MaintenanceResult> {
	const now = new Date();
	const result: MaintenanceResult = {
		requestsExpired: 0,
		quotesExpired: 0,
		ordersCancelled: 0,
		ordersConfirmed: 0,
		payoutsSent: 0,
		errors: 0
	};

	// Pages already treat these as expired by date; this makes the stored status match.
	result.requestsExpired = (
		await db
			.update(repairRequest)
			.set({ status: 'expired' })
			.where(and(eq(repairRequest.status, 'open'), lte(repairRequest.expiresAt, now)))
			.returning({ id: repairRequest.id })
	).length;
	result.quotesExpired = (
		await db
			.update(quote)
			.set({ status: 'expired' })
			.where(and(eq(quote.status, 'pending'), lte(quote.validUntil, now)))
			.returning({ id: quote.id })
	).length;

	const each = async (ids: { id: string }[], step: (id: string) => Promise<boolean>) => {
		let done = 0;
		for (const { id } of ids) {
			try {
				if (await step(id)) done++;
			} catch (e) {
				result.errors++;
				console.error('Maintenance step failed for order', id, e);
			}
		}
		return done;
	};

	const unpaidBefore = new Date(now.getTime() - UNPAID_ORDER_HOURS * 60 * 60 * 1000);
	result.ordersCancelled = await each(
		await db
			.select({ id: order.id })
			.from(order)
			.where(and(eq(order.status, 'awaiting_payment'), lte(order.createdAt, unpaidBefore)))
			.limit(BATCH),
		cancelUnpaidOrder
	);

	result.ordersConfirmed = await each(
		await db
			.select({ id: order.id })
			.from(order)
			.where(and(eq(order.status, 'repaired'), lte(order.autoConfirmAt, now)))
			.limit(BATCH),
		autoConfirmOrder
	);

	// Payouts that failed earlier (Stripe error) and are not waiting for onboarding anymore.
	result.payoutsSent = await each(
		await db
			.select({ id: order.id })
			.from(order)
			.innerJoin(repairerProfile, eq(repairerProfile.userId, order.repairerId))
			.where(
				and(
					eq(order.status, 'completed'),
					isNotNull(order.stripePaymentIntentId),
					isNull(order.stripeTransferId),
					eq(repairerProfile.stripeStatus, 'active'),
					sql`${repairerProfile.stripeAccountId} is not null`
				)
			)
			.limit(BATCH),
		releasePayout
	);

	// The daily run only shows up in the Protokoll when it changed something; a manual one always.
	const changed = Object.values(result).some((n) => n > 0);
	if (changed || actorId) {
		await logAction(actorId, MAINTENANCE_ACTION, actorId ? 'Manuell' : 'Täglicher Cron-Job', {
			Ergebnis: describeMaintenance(result)
		});
	}
	return result;
}

/** One German line for the admin, e.g. "3 Anfragen abgelaufen · 1 Auftrag bestätigt". */
export function describeMaintenance(r: MaintenanceResult): string {
	const parts = [
		[r.requestsExpired, 'Anfrage abgelaufen', 'Anfragen abgelaufen'],
		[r.quotesExpired, 'Angebot abgelaufen', 'Angebote abgelaufen'],
		[r.ordersCancelled, 'unbezahlter Auftrag storniert', 'unbezahlte Aufträge storniert'],
		[r.ordersConfirmed, 'Auftrag automatisch bestätigt', 'Aufträge automatisch bestätigt'],
		[r.payoutsSent, 'Auszahlung nachgeholt', 'Auszahlungen nachgeholt'],
		[r.errors, 'Fehler (siehe Server-Logs)', 'Fehler (siehe Server-Logs)']
	] as const;
	const text = parts
		.filter(([n]) => n > 0)
		.map(([n, one, many]) => `${n} ${n === 1 ? one : many}`)
		.join(' · ');
	return text || 'Nichts zu tun.';
}

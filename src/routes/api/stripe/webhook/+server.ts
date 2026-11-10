import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '#lib/server/db/index.ts';
import { stripeEvent } from '#lib/server/db/schema.ts';
import { syncAccount } from '#lib/server/payouts.ts';
import { stripeEnabled, verifyWebhook } from '#lib/server/stripe.ts';

/**
 * Stripe webhook (Technical.md 8.2), "thin" payload style: an event only names the affected
 * object, and we fetch its current state from Stripe. Each event is recorded in `stripe_event`
 * in the same transaction as its handling: a repeated delivery is skipped, and a failed one is
 * rolled back and answered with 500, so Stripe tries again.
 */
export const POST: RequestHandler = async ({ request }) => {
	if (!stripeEnabled) error(404, 'Not found');
	const signature = request.headers.get('stripe-signature');
	if (!signature) error(400, 'Missing signature');

	let event: Awaited<ReturnType<typeof verifyWebhook>>;
	try {
		// The signature covers the raw body, so it must be read as text, not parsed.
		event = await verifyWebhook(await request.text(), signature);
	} catch {
		error(400, 'Invalid signature');
	}

	await db.transaction(async (tx) => {
		const [fresh] = await tx
			.insert(stripeEvent)
			.values({ id: event.id, type: event.type })
			.onConflictDoNothing()
			.returning({ id: stripeEvent.id });
		if (!fresh) return;

		switch (event.type) {
			// Connect: a repairer's account can (or can no longer) receive transfers, or Stripe needs
			// new information from them.
			case 'v2.core.account[configuration.recipient].capability_status_updated':
			case 'v2.core.account[requirements].updated':
				if (event.related_object) await syncAccount(event.related_object.id, tx);
				break;
			// Payments (#46–48) will be handled here too, e.g. 'v1.checkout.session.completed'.
		}
	});

	return json({ received: true });
};

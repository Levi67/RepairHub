// Customer payments (#46–48), "separate charges and transfers" (Technical.md 3.8): the customer pays
// the full price to the platform through Stripe Checkout, the platform keeps it until the order is
// completed, then transfers price minus commission to the repairer. Cancelling refunds the payment.
// Only the Stripe calls live here; the order state changes around them are in orders.ts.
import { callStripe, type Stripe } from '#lib/server/stripe.ts';

/** Checkout pages live on Stripe; SvelteKit only redirects to origins we allow. */
export const STRIPE_CHECKOUT = { external: ['https://checkout.stripe.com'] };

/** How long the Checkout page stays valid. Stripe's minimum is 30 minutes. */
const CHECKOUT_MINUTES = 60;

export function createCheckoutSession(opts: {
	orderId: string;
	title: string;
	priceCents: number;
	customerEmail: string;
	origin: string;
}) {
	const orderUrl = `${opts.origin}/auftraege/${opts.orderId}`;
	return callStripe((s) =>
		s.checkout.sessions.create({
			mode: 'payment',
			line_items: [
				{
					quantity: 1,
					price_data: {
						currency: 'eur',
						unit_amount: opts.priceCents,
						product_data: { name: `Reparatur: ${opts.title}`.slice(0, 250) }
					}
				}
			],
			customer_email: opts.customerEmail,
			locale: 'de',
			client_reference_id: opts.orderId,
			metadata: { order_id: opts.orderId },
			// The transfer to the repairer later uses the same group, so Stripe links the two.
			payment_intent_data: {
				transfer_group: `order_${opts.orderId}`,
				metadata: { order_id: opts.orderId }
			},
			expires_at: Math.floor(Date.now() / 1000) + CHECKOUT_MINUTES * 60,
			success_url: `${orderUrl}?zahlung=erfolgreich`,
			cancel_url: orderUrl
		})
	);
}

export function retrieveCheckoutSession(sessionId: string) {
	return callStripe((s) => s.checkout.sessions.retrieve(sessionId));
}

/** Closes an open Checkout page so it can't be paid anymore. Fails quietly if it's already closed. */
export async function expireCheckoutSession(sessionId: string) {
	try {
		await callStripe((s) => s.checkout.sessions.expire(sessionId));
	} catch {
		// Already paid or expired. A payment that still arrives is refunded by the webhook.
	}
}

/** Full refund of a payment. Safe to repeat: Stripe returns the same refund for the same key. */
export async function refundPayment(paymentIntentId: string) {
	const refund = await callStripe((s) =>
		s.refunds.create(
			{ payment_intent: paymentIntentId, reason: 'requested_by_customer' },
			{ idempotencyKey: `refund-${paymentIntentId}` }
		)
	);
	return refund.id;
}

/**
 * Sends the repairer's share to their connected account. `source_transaction` ties the transfer to
 * the customer's charge, so it works even while that money is still pending on the platform
 * balance (always the case in test mode). Safe to repeat thanks to the idempotency key.
 */
export async function transferPayout(opts: {
	orderId: string;
	paymentIntentId: string;
	amountCents: number;
	destination: string;
}) {
	const transfer = await callStripe(async (s) => {
		const intent = await s.paymentIntents.retrieve(opts.paymentIntentId);
		const charge = intent.latest_charge;
		return s.transfers.create(
			{
				amount: opts.amountCents,
				currency: 'eur',
				destination: opts.destination,
				transfer_group: `order_${opts.orderId}`,
				metadata: { order_id: opts.orderId },
				...(charge ? { source_transaction: typeof charge === 'string' ? charge : charge.id } : {})
			},
			{ idempotencyKey: `transfer-${opts.orderId}` }
		);
	});
	return transfer.id;
}

export type CheckoutSession = Stripe.Checkout.Session;

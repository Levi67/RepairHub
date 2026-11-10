// Stripe Connect in test mode (Technical.md 3.8). Without STRIPE_SECRET_KEY the app runs without
// Stripe: no payout onboarding, and quoting doesn't require it.
import Stripe from 'stripe';
import { STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET } from '$app/env/private';
import { DomainError } from '#lib/server/errors.ts';

export const stripeEnabled = Boolean(STRIPE_SECRET_KEY);

let client: Stripe | undefined;

/** The Stripe client, created on first use so a missing key doesn't break the build. */
export function stripe(): Stripe {
	if (!STRIPE_SECRET_KEY) {
		throw new DomainError('Zahlungen sind auf diesem Server noch nicht eingerichtet.');
	}
	client ??= new Stripe(STRIPE_SECRET_KEY);
	return client;
}

/**
 * Runs a Stripe call and turns Stripe failures (wrong key, Stripe unreachable, …) into a message
 * for the user instead of an error page. The details go to the server log.
 */
export async function callStripe<T>(fn: (client: Stripe) => Promise<T>): Promise<T> {
	const client = stripe();
	try {
		return await fn(client);
	} catch (e) {
		if (e instanceof Stripe.errors.StripeError) {
			console.error('Stripe error:', e.type, e.message);
			throw new DomainError(
				'Die Verbindung zu Stripe hat nicht geklappt. Bitte versuche es später noch einmal.'
			);
		}
		throw e;
	}
}

/** Checks the signature of a webhook call and returns the event. Throws if it's not from Stripe. */
export async function verifyWebhook(body: string, signature: string) {
	if (!STRIPE_WEBHOOK_SECRET) throw new Error('STRIPE_WEBHOOK_SECRET is not set');
	return stripe().webhooks.constructEventAsync(body, signature, STRIPE_WEBHOOK_SECRET);
}

export type { Stripe };

import { redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { failOnDomainError } from '#lib/server/errors.ts';
import { dashboardLink, getPayoutAccount, startOnboarding } from '#lib/server/payouts.ts';
import { loginUrl } from '#lib/server/redirect.ts';
import { releaseHeldPayouts } from '#lib/server/orders.ts';
import { payoutAccountRequired, stripeEnabled } from '#lib/server/stripe.ts';

// Onboarding and Express Dashboard links point to Stripe; SvelteKit only redirects to origins we allow.
const STRIPE = { external: ['https://connect.stripe.com'] };

export const load: PageServerLoad = async (event) => {
	const user = event.locals.user;
	if (!user) return redirect(302, loginUrl(event.url));
	if (!stripeEnabled) {
		return { stripeEnabled, payoutAccountRequired, status: 'none' as const, hasAccount: false };
	}

	// Stripe sends people here when their onboarding link expired: give them a fresh one.
	if (event.url.searchParams.has('neu')) {
		return redirect(303, await startOnboarding(user, event.url.origin), STRIPE);
	}
	const account = await getPayoutAccount(user.id);
	// Payouts that waited for this account go out now (also covers local development without webhook).
	if (account.status === 'active') await releaseHeldPayouts(user.id);
	return { stripeEnabled, payoutAccountRequired, ...account };
};

export const actions: Actions = {
	start: async (event) => {
		const user = event.locals.user;
		if (!user) return redirect(302, loginUrl(event.url));
		let url: string;
		try {
			url = await startOnboarding(user, event.url.origin);
		} catch (e) {
			return failOnDomainError(e);
		}
		return redirect(303, url, STRIPE);
	},

	dashboard: async (event) => {
		const user = event.locals.user;
		if (!user) return redirect(302, loginUrl(event.url));
		let url: string | null;
		try {
			url = await dashboardLink(user.id);
		} catch (e) {
			return failOnDomainError(e);
		}
		return url ? redirect(303, url, STRIPE) : redirect(303, '/profil/auszahlungen');
	}
};

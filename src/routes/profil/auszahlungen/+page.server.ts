import { redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { failOnDomainError } from '#lib/server/errors.ts';
import { dashboardLink, getPayoutAccount, startOnboarding } from '#lib/server/payouts.ts';
import { loginUrl } from '#lib/server/redirect.ts';
import { stripeEnabled } from '#lib/server/stripe.ts';

export const load: PageServerLoad = async (event) => {
	const user = event.locals.user;
	if (!user) return redirect(302, loginUrl(event.url));
	if (!stripeEnabled) return { stripeEnabled, status: 'none' as const, hasAccount: false };

	// Stripe sends people here when their onboarding link expired: give them a fresh one.
	if (event.url.searchParams.has('neu')) {
		return redirect(303, await startOnboarding(user.id, user.email, event.url.origin));
	}
	return { stripeEnabled, ...(await getPayoutAccount(user.id)) };
};

export const actions: Actions = {
	start: async (event) => {
		const user = event.locals.user;
		if (!user) return redirect(302, loginUrl(event.url));
		let url: string;
		try {
			url = await startOnboarding(user.id, user.email, event.url.origin);
		} catch (e) {
			return failOnDomainError(e);
		}
		return redirect(303, url);
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
		return redirect(303, url ?? '/profil/auszahlungen');
	}
};

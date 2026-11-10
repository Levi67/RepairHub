import { error, fail } from '@sveltejs/kit';
import { z } from 'zod';
import type { Actions, PageServerLoad } from './$types';
import { failOnDomainError } from '#lib/server/errors.ts';
import { getPublicProfile } from '#lib/server/profiles.ts';
import { listOpenRequests } from '#lib/server/requests.ts';
import { getRatingSummary, listReviewsAbout, removeReview } from '#lib/server/reviews.ts';

export const load: PageServerLoad = async ({ params, locals }) => {
	const profile = await getPublicProfile(params.id);
	// Banned users' profiles are hidden, except from admins.
	if (!profile || (profile.bannedAt && !locals.user?.isAdmin)) error(404, 'Nutzer nicht gefunden');
	const [openRequests, ratings, reviews] = await Promise.all([
		listOpenRequests({ customerId: profile.id, limit: 20 }),
		getRatingSummary(profile.id),
		listReviewsAbout(profile.id)
	]);
	return {
		profile,
		openRequests,
		ratings,
		reviews,
		isOwn: locals.user?.id === profile.id,
		isAdmin: Boolean(locals.user?.isAdmin)
	};
};

export const actions: Actions = {
	/** Admins can take down a review (Technical.md 3.10). */
	removeReview: async ({ request, locals }) => {
		if (!locals.user?.isAdmin) return fail(403, { message: 'Nicht erlaubt.' });
		const reviewId = (await request.formData()).get('reviewId')?.toString() ?? '';
		if (!z.uuid().safeParse(reviewId).success) return fail(400, { message: 'Ungültig.' });
		try {
			await removeReview(reviewId);
		} catch (e) {
			return failOnDomainError(e);
		}
	}
};

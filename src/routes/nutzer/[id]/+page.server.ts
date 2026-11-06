import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getPublicProfile } from '#lib/server/profiles.ts';
import { listOpenRequests } from '#lib/server/requests.ts';

export const load: PageServerLoad = async ({ params, locals }) => {
	const profile = await getPublicProfile(params.id);
	// Banned users' profiles are hidden, except from admins.
	if (!profile || (profile.bannedAt && !locals.user?.isAdmin)) error(404, 'Nutzer nicht gefunden');
	return {
		profile,
		openRequests: await listOpenRequests({ customerId: profile.id, limit: 20 }),
		isOwn: locals.user?.id === profile.id,
		isAdmin: Boolean(locals.user?.isAdmin)
	};
};

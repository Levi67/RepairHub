import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { listOwnQuotes } from '#lib/server/quotes.ts';
import { loginUrl } from '#lib/server/redirect.ts';

export const load: PageServerLoad = async (event) => {
	const user = event.locals.user;
	if (!user) return redirect(302, loginUrl(event.url));
	return { quotes: await listOwnQuotes(user.id) };
};

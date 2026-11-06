import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { listConversationsForUser } from '#lib/server/conversations.ts';
import { loginUrl } from '#lib/server/redirect.ts';

export const load: PageServerLoad = async (event) => {
	const user = event.locals.user;
	if (!user) return redirect(302, loginUrl(event.url));
	return { conversations: await listConversationsForUser(user.id) };
};

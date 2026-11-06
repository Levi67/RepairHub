import type { LayoutServerLoad } from './$types';
import { countUnreadMessages } from '#lib/server/conversations.ts';

export const load: LayoutServerLoad = async (event) => {
	// Re-run by `invalidate('app:unread')`: polled from the layout, and after reading a chat.
	event.depends('app:unread');
	const user = event.locals.user;
	if (!user) return { user: null, unreadMessages: 0 };
	return {
		user: { id: user.id, name: user.name, image: user.image ?? null, isAdmin: user.isAdmin },
		unreadMessages: await countUnreadMessages(user.id)
	};
};

import { error, json } from '@sveltejs/kit';
import { z } from 'zod';
import type { RequestHandler } from './$types';
import { getConversationForUser, listMessages, markRead } from '#lib/server/conversations.ts';

/** Polled by the open chat every few seconds: `?after=<ISO time>` returns newer messages. */
export const GET: RequestHandler = async ({ params, url, locals }) => {
	const user = locals.user;
	if (!user) error(401, 'Nicht angemeldet');
	if (!z.uuid().safeParse(params.id).success) error(404, 'Nicht gefunden');

	const conversation = await getConversationForUser(params.id, user.id);
	if (!conversation) error(404, 'Nicht gefunden');

	const after = z.iso.datetime().safeParse(url.searchParams.get('after'));
	const messages = await listMessages(
		conversation.id,
		after.success ? new Date(after.data) : undefined
	);
	if (messages.length) await markRead(conversation.id, user.id);

	return json({ messages });
};

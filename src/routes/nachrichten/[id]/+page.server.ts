import { error, fail, redirect } from '@sveltejs/kit';
import { z } from 'zod';
import type { Actions, PageServerLoad } from './$types';
import {
	getConversationForUser,
	listMessages,
	markRead,
	sendMessage
} from '#lib/server/conversations.ts';
import { failOnDomainError } from '#lib/server/errors.ts';
import { loginUrl } from '#lib/server/redirect.ts';

const MAX_LENGTH = 2000;

export const load: PageServerLoad = async (event) => {
	const user = event.locals.user;
	if (!user) return redirect(302, loginUrl(event.url));
	if (!z.uuid().safeParse(event.params.id).success) error(404, 'Unterhaltung nicht gefunden');

	const conversation = await getConversationForUser(event.params.id, user.id);
	if (!conversation) error(404, 'Unterhaltung nicht gefunden');

	const messages = await listMessages(conversation.id);
	await markRead(conversation.id, user.id);

	return { conversation, messages, userId: user.id, maxLength: MAX_LENGTH };
};

export const actions: Actions = {
	default: async (event) => {
		const user = event.locals.user;
		if (!user) return redirect(302, loginUrl(event.url));
		if (!z.uuid().safeParse(event.params.id).success)
			return fail(404, { message: 'Nicht gefunden.' });

		const body = (await event.request.formData()).get('body')?.toString().trim() ?? '';
		if (!body) return fail(400, { body, message: 'Die Nachricht ist leer.' });
		if (body.length > MAX_LENGTH) {
			return fail(400, { body, message: `Höchstens ${MAX_LENGTH} Zeichen.` });
		}

		try {
			await sendMessage(event.params.id, user.id, body);
		} catch (e) {
			return failOnDomainError(e);
		}
	}
};

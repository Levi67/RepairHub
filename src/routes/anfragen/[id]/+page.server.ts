import { error, fail, redirect } from '@sveltejs/kit';
import { z } from 'zod';
import type { Actions, PageServerLoad } from './$types';
import { getRequest } from '#lib/server/requests.ts';
import {
	createQuote,
	getLatestOwnQuote,
	listQuotesForRequest,
	withdrawQuote
} from '#lib/server/quotes.ts';
import { acceptQuote, getActiveOrderIdForRequest } from '#lib/server/orders.ts';
import { getConversationIdFor, startConversation } from '#lib/server/conversations.ts';
import { failOnDomainError } from '#lib/server/errors.ts';
import { loginUrl } from '#lib/server/redirect.ts';
import { fieldErrors } from '#lib/schemas/form.ts';
import { quoteSchema } from '#lib/schemas/quote.ts';

export const load: PageServerLoad = async ({ params, locals }) => {
	if (!z.uuid().safeParse(params.id).success) error(404, 'Anfrage nicht gefunden');

	const request = await getRequest(params.id);
	if (!request) error(404, 'Anfrage nicht gefunden');

	const userId = locals.user?.id;
	const isOwner = userId === request.customerId;

	if (isOwner) {
		const [quotes, orderId] = await Promise.all([
			listQuotesForRequest(request.id),
			getActiveOrderIdForRequest(request.id)
		]);
		return { request, isOwner, quotes, orderId, ownQuote: null, conversationId: null };
	}

	const [ownQuote, conversationId] = userId
		? await Promise.all([
				getLatestOwnQuote(request.id, userId),
				getConversationIdFor(request.id, userId)
			])
		: [null, null];
	return { request, isOwner, quotes: [], orderId: null, ownQuote, conversationId };
};

export const actions: Actions = {
	quote: async (event) => {
		const user = event.locals.user;
		if (!user) return redirect(302, loginUrl(event.url));

		const formData = await event.request.formData();
		const raw = {
			price: formData.get('price')?.toString() ?? '',
			estimatedDays: formData.get('estimatedDays')?.toString() ?? '',
			handoverMode: formData.get('handoverMode')?.toString() ?? '',
			includesReturnShipping: formData.get('includesReturnShipping') === 'on',
			message: formData.get('message')?.toString() ?? '',
			partsNote: formData.get('partsNote')?.toString() ?? ''
		};

		const parsed = quoteSchema.safeParse(raw);
		if (!parsed.success) {
			return fail(400, { values: raw, errors: fieldErrors(parsed.error) });
		}

		try {
			await createQuote(user.id, event.params.id, parsed.data);
		} catch (e) {
			return failOnDomainError(e);
		}
		return { quoteSent: true };
	},

	ask: async (event) => {
		const user = event.locals.user;
		if (!user) return redirect(302, loginUrl(event.url));

		let conversationId: string;
		try {
			conversationId = await startConversation(user.id, event.params.id);
		} catch (e) {
			return failOnDomainError(e);
		}
		return redirect(303, `/nachrichten/${conversationId}`);
	},

	withdraw: async (event) => {
		const user = event.locals.user;
		if (!user) return redirect(302, loginUrl(event.url));

		const quoteId = (await event.request.formData()).get('quoteId')?.toString() ?? '';
		if (!z.uuid().safeParse(quoteId).success) return fail(400, { message: 'Ungültiges Angebot.' });

		try {
			await withdrawQuote(user.id, quoteId);
		} catch (e) {
			return failOnDomainError(e);
		}
	},

	accept: async (event) => {
		const user = event.locals.user;
		if (!user) return redirect(302, loginUrl(event.url));

		const quoteId = (await event.request.formData()).get('quoteId')?.toString() ?? '';
		if (!z.uuid().safeParse(quoteId).success) return fail(400, { message: 'Ungültiges Angebot.' });

		let orderId: string;
		try {
			orderId = await acceptQuote(user.id, quoteId);
		} catch (e) {
			return failOnDomainError(e);
		}
		return redirect(303, `/auftraege/${orderId}`);
	}
};

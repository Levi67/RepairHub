import { error, fail, redirect } from '@sveltejs/kit';
import { z } from 'zod';
import type { Actions, PageServerLoad } from './$types';
import { fieldErrors } from '#lib/schemas/form.ts';
import {
	readRequestForm,
	repairRequestSchema,
	requestAdditionSchema
} from '#lib/schemas/request.ts';
import { failOnDomainError } from '#lib/server/errors.ts';
import {
	addToRequest,
	getRequestForEdit,
	listCategoryTree,
	updateRequest
} from '#lib/server/requests.ts';
import { loginUrl } from '#lib/server/redirect.ts';
import { centsToInput } from '#lib/money.ts';

export const load: PageServerLoad = async (event) => {
	const user = event.locals.user;
	if (!user) return redirect(302, loginUrl(event.url));
	if (!z.uuid().safeParse(event.params.id).success) error(404, 'Anfrage nicht gefunden');

	// Other people's requests look like missing ones.
	const found = await getRequestForEdit(event.params.id, user.id);
	if (!found) error(404, 'Anfrage nicht gefunden');
	if (found.mode === 'locked') return redirect(303, `/anfragen/${event.params.id}`);

	const { request, mode } = found;
	return {
		mode,
		requestId: request.id,
		title: request.title,
		categories: mode === 'full' ? await listCategoryTree() : [],
		values: {
			title: request.title,
			categoryId: request.categoryId,
			description: request.description,
			brand: request.brand ?? '',
			model: request.model ?? '',
			budget: centsToInput(request.budgetCents),
			handoverModes: request.handoverModes,
			plz: request.plz,
			city: request.city,
			timeframe: request.timeframe ?? ''
		},
		// With quotes, existing photos can't be removed.
		photos: request.photos.map((p) => ({ ...p, locked: mode === 'addOnly' }))
	};
};

export const actions: Actions = {
	update: async (event) => {
		const user = event.locals.user;
		if (!user) return redirect(302, loginUrl(event.url));

		const raw = readRequestForm(await event.request.formData());
		const parsed = repairRequestSchema.safeParse(raw);
		if (!parsed.success) return fail(400, { values: raw, errors: fieldErrors(parsed.error) });

		try {
			await updateRequest(event.params.id, user.id, parsed.data);
		} catch (e) {
			return failOnDomainError(e);
		}
		return redirect(303, `/anfragen/${event.params.id}`);
	},

	add: async (event) => {
		const user = event.locals.user;
		if (!user) return redirect(302, loginUrl(event.url));

		const formData = await event.request.formData();
		const raw = {
			addendum: formData.get('addendum')?.toString() ?? '',
			photos: formData.getAll('photos').map(String)
		};
		const parsed = requestAdditionSchema.safeParse(raw);
		if (!parsed.success) {
			return fail(400, { addendum: raw.addendum, errors: fieldErrors(parsed.error) });
		}

		try {
			await addToRequest(event.params.id, user.id, parsed.data);
		} catch (e) {
			return failOnDomainError(e);
		}
		return redirect(303, `/anfragen/${event.params.id}`);
	}
};

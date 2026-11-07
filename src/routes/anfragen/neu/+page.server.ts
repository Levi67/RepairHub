import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { fieldErrors } from '#lib/schemas/form.ts';
import { readRequestForm, repairRequestSchema } from '#lib/schemas/request.ts';
import { failOnDomainError } from '#lib/server/errors.ts';
import { getOwnProfile } from '#lib/server/profiles.ts';
import { createRequest, listCategoryTree } from '#lib/server/requests.ts';
import { loginUrl } from '#lib/server/redirect.ts';
import { storageEnabled } from '#lib/server/storage.ts';

export const load: PageServerLoad = async (event) => {
	const user = event.locals.user;
	if (!user) return redirect(302, loginUrl(event.url));
	const [categories, profile] = await Promise.all([listCategoryTree(), getOwnProfile(user.id)]);
	// Location from the profile as a starting point; the customer can change it per request.
	return {
		categories,
		defaultPlz: profile?.plz ?? '',
		defaultCity: profile?.city ?? '',
		storageEnabled
	};
};

export const actions: Actions = {
	default: async (event) => {
		const user = event.locals.user;
		if (!user) return redirect(302, loginUrl(event.url));

		const raw = readRequestForm(await event.request.formData());
		const parsed = repairRequestSchema.safeParse(raw);
		if (!parsed.success) {
			return fail(400, { values: raw, errors: fieldErrors(parsed.error) });
		}

		let created: { id: string };
		try {
			created = await createRequest(user.id, parsed.data);
		} catch (e) {
			return failOnDomainError(e);
		}
		return redirect(303, `/anfragen/${created.id}`);
	}
};

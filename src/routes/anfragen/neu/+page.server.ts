import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { fieldErrors } from '#lib/schemas/form.ts';
import { repairRequestSchema } from '#lib/schemas/request.ts';
import { getOwnProfile } from '#lib/server/profiles.ts';
import { createRequest, listCategoryTree } from '#lib/server/requests.ts';
import { loginUrl } from '#lib/server/redirect.ts';

export const load: PageServerLoad = async (event) => {
	const user = event.locals.user;
	if (!user) return redirect(302, loginUrl(event.url));
	const [categories, profile] = await Promise.all([listCategoryTree(), getOwnProfile(user.id)]);
	// Location from the profile as a starting point; the customer can change it per request.
	return { categories, defaultPlz: profile?.plz ?? '', defaultCity: profile?.city ?? '' };
};

export const actions: Actions = {
	default: async (event) => {
		const user = event.locals.user;
		if (!user) return redirect(302, loginUrl(event.url));

		const formData = await event.request.formData();
		const raw = {
			title: formData.get('title')?.toString() ?? '',
			categoryId: formData.get('categoryId')?.toString() ?? '',
			description: formData.get('description')?.toString() ?? '',
			brand: formData.get('brand')?.toString() ?? '',
			model: formData.get('model')?.toString() ?? '',
			budget: formData.get('budget')?.toString() ?? '',
			handoverModes: formData.getAll('handoverModes').map(String),
			plz: formData.get('plz')?.toString() ?? '',
			city: formData.get('city')?.toString() ?? ''
		};

		const parsed = repairRequestSchema.safeParse(raw);
		if (!parsed.success) {
			return fail(400, { values: raw, errors: fieldErrors(parsed.error) });
		}

		const created = await createRequest(user.id, parsed.data);
		return redirect(303, `/anfragen/${created.id}`);
	}
};

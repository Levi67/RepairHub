import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { repairRequestSchema } from '#lib/schemas/request.ts';
import { createRequest, listCategoryTree } from '#lib/server/requests.ts';
import { loginUrl } from '#lib/server/redirect.ts';

export const load: PageServerLoad = async (event) => {
	if (!event.locals.user) return redirect(302, loginUrl(event.url));
	return { categories: await listCategoryTree() };
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
			const errors: Record<string, string> = {};
			for (const issue of parsed.error.issues) {
				const key = String(issue.path[0]);
				errors[key] ??= issue.message;
			}
			return fail(400, { values: raw, errors });
		}

		const created = await createRequest(user.id, parsed.data);
		return redirect(303, `/anfragen/${created.id}`);
	}
};

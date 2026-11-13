import { fail, redirect } from '@sveltejs/kit';
import { z } from 'zod';
import type { Actions, PageServerLoad } from './$types';
import { fieldErrors } from '#lib/schemas/form.ts';
import { loginUrl } from '#lib/server/redirect.ts';
import { replaceTemporaryPassword } from '#lib/server/superadmin.ts';

// Shown after the super admin gave this user a temporary password: hooks.server.ts sends every
// page here until a new one is chosen.

const schema = z
	.object({
		newPassword: z.string().min(8, 'Das Passwort muss mindestens 8 Zeichen haben').max(128),
		confirmPassword: z.string()
	})
	.refine((p) => p.newPassword === p.confirmPassword, {
		message: 'Die Passwörter stimmen nicht überein',
		path: ['confirmPassword']
	});

export const load: PageServerLoad = (event) => {
	const user = event.locals.user;
	if (!user) return redirect(302, loginUrl(event.url));
	if (!user.mustChangePassword) return redirect(302, '/');
	return {};
};

export const actions: Actions = {
	default: async (event) => {
		const user = event.locals.user;
		if (!user) return redirect(302, loginUrl(event.url));
		if (!user.mustChangePassword) return redirect(303, '/');
		const parsed = schema.safeParse(Object.fromEntries(await event.request.formData()));
		if (!parsed.success) return fail(400, { errors: fieldErrors(parsed.error) });
		await replaceTemporaryPassword(user.id, parsed.data.newPassword);
		return redirect(303, '/');
	}
};

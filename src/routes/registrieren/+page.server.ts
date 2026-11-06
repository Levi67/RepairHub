import { fail, redirect } from '@sveltejs/kit';
import { APIError } from 'better-auth/api';
import { z } from 'zod';
import type { Actions, PageServerLoad } from './$types';
import { auth } from '#lib/server/auth.ts';
import { safeRedirectTarget } from '#lib/server/redirect.ts';

const signUpSchema = z.object({
	name: z.string().trim().min(2, 'Bitte einen Namen angeben').max(50),
	email: z.email('Bitte eine gültige E-Mail angeben'),
	password: z.string().min(8, 'Das Passwort muss mindestens 8 Zeichen haben').max(128)
});

export const load: PageServerLoad = (event) => {
	if (event.locals.user) return redirect(302, safeRedirectTarget(event.url));
	return {};
};

export const actions: Actions = {
	default: async (event) => {
		const formData = Object.fromEntries(await event.request.formData());
		const parsed = signUpSchema.safeParse(formData);
		const values = { name: String(formData.name ?? ''), email: String(formData.email ?? '') };

		if (!parsed.success) {
			return fail(400, { ...values, message: parsed.error.issues[0].message });
		}

		try {
			await auth.api.signUpEmail({ body: parsed.data });
		} catch (error) {
			if (error instanceof APIError) {
				const message =
					error.body?.code === 'USER_ALREADY_EXISTS'
						? 'Mit dieser E-Mail gibt es bereits ein Konto.'
						: 'Registrierung fehlgeschlagen.';
				return fail(400, { ...values, message });
			}
			return fail(500, {
				...values,
				message: 'Unerwarteter Fehler. Bitte später erneut versuchen.'
			});
		}

		return redirect(302, safeRedirectTarget(event.url));
	}
};

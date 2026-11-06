import { fail, redirect } from '@sveltejs/kit';
import { APIError } from 'better-auth/api';
import type { Actions, PageServerLoad } from './$types';
import { auth } from '#lib/server/auth.ts';
import { safeRedirectTarget } from '#lib/server/redirect.ts';

export const load: PageServerLoad = (event) => {
	if (event.locals.user) return redirect(302, safeRedirectTarget(event.url));
	return {};
};

export const actions: Actions = {
	default: async (event) => {
		const formData = await event.request.formData();
		const email = formData.get('email')?.toString() ?? '';
		const password = formData.get('password')?.toString() ?? '';

		try {
			await auth.api.signInEmail({ body: { email, password } });
		} catch (error) {
			if (error instanceof APIError) {
				return fail(400, { email, message: 'E-Mail oder Passwort ist falsch.' });
			}
			return fail(500, { email, message: 'Unerwarteter Fehler. Bitte später erneut versuchen.' });
		}

		return redirect(302, safeRedirectTarget(event.url));
	}
};

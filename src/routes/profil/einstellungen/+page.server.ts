import { error, fail, redirect } from '@sveltejs/kit';
import { APIError } from 'better-auth/api';
import type { Actions, PageServerLoad } from './$types';
import { emailNotificationTypes, type NotificationPrefs } from '#lib/notifications.ts';
import { fieldErrors } from '#lib/schemas/form.ts';
import { changeEmailSchema, changePasswordSchema } from '#lib/schemas/profile.ts';
import { auth } from '#lib/server/auth.ts';
import { getOwnProfile, updateNotificationPrefs } from '#lib/server/profiles.ts';
import { loginUrl } from '#lib/server/redirect.ts';

export const load: PageServerLoad = async (event) => {
	const user = event.locals.user;
	if (!user) return redirect(302, loginUrl(event.url));
	const profile = await getOwnProfile(user.id);
	if (!profile) error(404, 'Nicht gefunden');
	return { email: profile.email, notificationPrefs: profile.notificationPrefs };
};

function authErrorMessage(e: unknown): string {
	if (e instanceof APIError && e.body?.code === 'INVALID_PASSWORD') {
		return 'Das aktuelle Passwort ist falsch.';
	}
	throw e;
}

export const actions: Actions = {
	email: async (event) => {
		const user = event.locals.user;
		if (!user) return redirect(302, loginUrl(event.url));

		const formData = Object.fromEntries(await event.request.formData());
		const parsed = changeEmailSchema.safeParse(formData);
		const email = String(formData.email ?? '');
		if (!parsed.success) {
			return fail(400, { form: 'email', email, errors: fieldErrors(parsed.error) });
		}
		if (parsed.data.email.toLowerCase() === user.email) {
			return fail(400, { form: 'email', email, errors: { email: 'Das ist schon deine E-Mail.' } });
		}

		const headers = event.request.headers;
		try {
			await auth.api.verifyPassword({ body: { password: parsed.data.currentPassword }, headers });
			await auth.api.changeEmail({ body: { newEmail: parsed.data.email }, headers });
		} catch (e) {
			return fail(400, { form: 'email', email, errors: { currentPassword: authErrorMessage(e) } });
		}

		// Better Auth answers "ok" without changing anything when the address is taken (so it can't
		// be used to probe for accounts). Sign-up already tells, so we can tell here too.
		const updated = await getOwnProfile(user.id);
		if (updated?.email !== parsed.data.email.toLowerCase()) {
			return fail(400, {
				form: 'email',
				email,
				errors: { email: 'Mit dieser E-Mail gibt es bereits ein Konto.' }
			});
		}
		return { saved: 'email' as const };
	},

	password: async (event) => {
		const user = event.locals.user;
		if (!user) return redirect(302, loginUrl(event.url));

		const formData = Object.fromEntries(await event.request.formData());
		const parsed = changePasswordSchema.safeParse(formData);
		if (!parsed.success) {
			return fail(400, { form: 'password', errors: fieldErrors(parsed.error) });
		}

		try {
			await auth.api.changePassword({
				body: {
					currentPassword: parsed.data.currentPassword,
					newPassword: parsed.data.newPassword,
					revokeOtherSessions: true
				},
				headers: event.request.headers
			});
		} catch (e) {
			return fail(400, { form: 'password', errors: { currentPassword: authErrorMessage(e) } });
		}
		return { saved: 'password' as const };
	},

	notifications: async (event) => {
		const user = event.locals.user;
		if (!user) return redirect(302, loginUrl(event.url));

		const formData = await event.request.formData();
		const prefs = Object.fromEntries(
			emailNotificationTypes.map((type) => [type, formData.has(type)])
		) as NotificationPrefs;
		await updateNotificationPrefs(user.id, prefs);
		return { saved: 'notifications' as const };
	}
};

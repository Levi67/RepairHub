import { error, fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { fieldErrors } from '#lib/schemas/form.ts';
import { profileSchema } from '#lib/schemas/profile.ts';
import { failOnDomainError } from '#lib/server/errors.ts';
import { lookupPlz, UNKNOWN_PLZ } from '#lib/server/geo.ts';
import { getOwnProfile, removeAvatar, setAvatar, updateProfile } from '#lib/server/profiles.ts';
import { loginUrl } from '#lib/server/redirect.ts';

export const load: PageServerLoad = async (event) => {
	const user = event.locals.user;
	if (!user) return redirect(302, loginUrl(event.url));
	const profile = await getOwnProfile(user.id);
	if (!profile) error(404, 'Nicht gefunden');
	return { profile };
};

export const actions: Actions = {
	profile: async (event) => {
		const user = event.locals.user;
		if (!user) return redirect(302, loginUrl(event.url));

		const formData = await event.request.formData();
		const raw = {
			name: formData.get('name')?.toString() ?? '',
			plz: formData.get('plz')?.toString() ?? '',
			city: formData.get('city')?.toString() ?? '',
			bio: formData.get('bio')?.toString() ?? ''
		};
		const parsed = profileSchema.safeParse(raw);
		if (!parsed.success) return fail(400, { values: raw, errors: fieldErrors(parsed.error) });
		// The profile PLZ is the default starting point for distance search.
		if (parsed.data.plz && !(await lookupPlz(parsed.data.plz))) {
			return fail(400, { values: raw, errors: { plz: UNKNOWN_PLZ } });
		}

		await updateProfile(user.id, parsed.data);
		return { saved: 'profile' as const };
	},

	avatar: async (event) => {
		const user = event.locals.user;
		if (!user) return redirect(302, loginUrl(event.url));

		const file = (await event.request.formData()).get('avatar');
		if (!(file instanceof File) || file.size === 0) {
			return fail(400, { message: 'Bitte ein Bild auswählen.' });
		}
		try {
			await setAvatar(user.id, file);
		} catch (e) {
			return failOnDomainError(e);
		}
		return { saved: 'avatar' as const };
	},

	removeAvatar: async (event) => {
		const user = event.locals.user;
		if (!user) return redirect(302, loginUrl(event.url));
		await removeAvatar(user.id);
		return { saved: 'avatar' as const };
	}
};

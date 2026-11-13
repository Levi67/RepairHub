import { error, redirect } from '@sveltejs/kit';
import { z } from 'zod';
import type { Actions, PageServerLoad } from './$types';
import { DomainError } from '#lib/server/errors.ts';
import {
	confirmOwnPassword,
	field,
	getUserForAdmin,
	impersonate,
	logAction,
	requireSuperAdmin,
	setTemporaryPassword,
	superAction,
	updateUser,
	wipeUser
} from '#lib/server/superadmin.ts';

export const load: PageServerLoad = async (event) => {
	requireSuperAdmin(event);
	const found = await getUserForAdmin(event.params.id);
	if (!found) error(404, 'Nutzer nicht gefunden');
	return { ...found, isSelf: found.user.id === event.locals.user!.id };
};

const userSchema = z.object({
	name: z.string().trim().min(2, 'Der Name braucht mindestens 2 Zeichen.').max(50),
	email: z.email('Bitte eine gültige E-Mail angeben.'),
	plz: z.union([z.literal(''), z.string().regex(/^\d{5}$/, 'Die PLZ hat 5 Ziffern.')]),
	bio: z.string().max(1000)
});

export const actions: Actions = {
	save: (event) =>
		superAction(event, async (actor, form) => {
			const parsed = userSchema.safeParse({
				name: field(form, 'name'),
				email: field(form, 'email'),
				plz: field(form, 'plz'),
				bio: field(form, 'bio')
			});
			if (!parsed.success) throw new DomainError(parsed.error.issues[0].message);
			await updateUser(actor.id, event.params.id, {
				...parsed.data,
				removeAvatar: form.get('removeAvatar') === 'on'
			});
			return 'Profil gespeichert.';
		}),
	password: (event) =>
		superAction(event, async (actor, form) => {
			await setTemporaryPassword(actor.id, event.params.id, form.get('password')?.toString() ?? '');
			return 'Temporäres Passwort gesetzt. Die Person wurde abgemeldet und muss nach dem nächsten Login ein neues wählen.';
		}),
	impersonate: async (event) => {
		const result = await superAction(event, async (actor, form) => {
			const target = await getUserForAdmin(event.params.id);
			if (!target) throw new DomainError('Nutzer nicht gefunden.');
			await impersonate(event, event.params.id, field(form, 'ownPassword'));
			await logAction(
				actor.id,
				target.user.isTest ? 'Als Testkonto angemeldet' : 'Als echter Nutzer angemeldet',
				`${target.user.name} (${target.user.email})`
			);
		});
		if ('done' in result) redirect(303, '/');
		return result;
	},
	wipe: async (event) => {
		const result = await superAction(event, async (actor, form) => {
			await confirmOwnPassword(event, field(form, 'ownPassword'));
			const mode = form.get('mode') === 'anonymise' ? 'anonymise' : 'all';
			const stripe = await wipeUser(
				actor.id,
				event.params.id,
				mode,
				form.get('closeStripe') === 'on'
			);
			return stripe;
		});
		if ('done' in result) redirect(303, '/admin/nutzer');
		return result;
	}
};

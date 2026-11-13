import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad, RequestEvent } from './$types';
import { listUsers, requireAdmin, setAdmin, setBanned } from '#lib/server/admin.ts';
import { failOnDomainError } from '#lib/server/errors.ts';
import { isSuperAdmin } from '#lib/server/superadmin.ts';

export const load: PageServerLoad = async (event) => {
	requireAdmin(event);
	const q = event.url.searchParams.get('q')?.trim() ?? '';
	return {
		q,
		users: await listUsers(q),
		currentUserId: event.locals.user!.id,
		isSuperAdmin: isSuperAdmin(event.locals)
	};
};

/** Runs one admin change on the user named in the form's `userId`. */
async function change(
	event: RequestEvent,
	run: (adminId: string, userId: string) => Promise<void>
) {
	const admin = requireAdmin(event);
	const userId = (await event.request.formData()).get('userId')?.toString();
	if (!userId) return fail(400, { message: 'Nutzer fehlt.' });
	try {
		await run(admin.id, userId);
	} catch (error) {
		return failOnDomainError(error);
	}
}

export const actions: Actions = {
	ban: (event) => change(event, (adminId, userId) => setBanned(adminId, userId, true)),
	unban: (event) => change(event, (adminId, userId) => setBanned(adminId, userId, false)),
	makeAdmin: (event) => change(event, (adminId, userId) => setAdmin(adminId, userId, true)),
	removeAdmin: (event) => change(event, (adminId, userId) => setAdmin(adminId, userId, false))
};

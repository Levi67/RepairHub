import { redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { stopImpersonating } from '#lib/server/superadmin.ts';

export const load: PageServerLoad = () => redirect(302, '/');

/** Ends "Anmelden als …" and brings the super admin back to their own account. */
export const actions: Actions = {
	default: async (event) => {
		const target = event.locals.user?.id;
		try {
			await stopImpersonating(event);
		} catch {
			return redirect(303, '/anmelden');
		}
		return redirect(303, target ? `/admin/nutzer/${target}` : '/admin/nutzer');
	}
};

import type { LayoutServerLoad } from './$types';
import { requireAdmin } from '#lib/server/admin.ts';
import { isSuperAdmin } from '#lib/server/superadmin.ts';

export const load: LayoutServerLoad = (event) => {
	requireAdmin(event);
	return { isSuperAdmin: isSuperAdmin(event.locals) };
};

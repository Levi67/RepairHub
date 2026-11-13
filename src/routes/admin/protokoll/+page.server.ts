import type { PageServerLoad } from './$types';
import { listAdminLog, requireSuperAdmin } from '#lib/server/superadmin.ts';

export const load: PageServerLoad = async (event) => {
	requireSuperAdmin(event);
	return { entries: await listAdminLog() };
};

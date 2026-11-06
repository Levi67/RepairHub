import type { PageServerLoad } from './$types';
import { getDashboardStats, requireAdmin } from '#lib/server/admin.ts';

export const load: PageServerLoad = async (event) => {
	requireAdmin(event);
	return { stats: await getDashboardStats() };
};

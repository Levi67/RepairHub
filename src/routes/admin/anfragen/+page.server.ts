import type { PageServerLoad } from './$types';
import { listRequestsForAdmin, requireSuperAdmin } from '#lib/server/superadmin.ts';

export const load: PageServerLoad = async (event) => {
	requireSuperAdmin(event);
	const q = event.url.searchParams.get('q')?.trim() ?? '';
	const onlyTest = event.url.searchParams.get('test') === '1';
	return { q, onlyTest, requests: await listRequestsForAdmin(q, onlyTest) };
};

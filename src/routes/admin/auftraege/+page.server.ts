import type { PageServerLoad } from './$types';
import { listOrdersForAdmin, requireSuperAdmin } from '#lib/server/superadmin.ts';
import { orderStatusLabels, type OrderStatus } from '#lib/status.ts';

export const load: PageServerLoad = async (event) => {
	requireSuperAdmin(event);
	const raw = event.url.searchParams.get('status') ?? '';
	const status = raw in orderStatusLabels ? (raw as OrderStatus) : null;
	return { status, orders: await listOrdersForAdmin(status) };
};

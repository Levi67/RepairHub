import type { LayoutServerLoad } from './$types';
import { requireAdmin } from '#lib/server/admin.ts';

export const load: LayoutServerLoad = (event) => {
	requireAdmin(event);
	return {};
};

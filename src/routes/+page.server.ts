import type { PageServerLoad } from './$types';
import { listCategoryTree, listOpenRequests } from '#lib/server/requests.ts';

export const load: PageServerLoad = async () => {
	const [categories, latest] = await Promise.all([
		listCategoryTree(),
		listOpenRequests({ limit: 6 })
	]);
	return { categories, latest };
};

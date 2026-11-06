import type { PageServerLoad } from './$types';
import { listCategoryTree, listOpenRequests } from '#lib/server/requests.ts';

export const load: PageServerLoad = async ({ url }) => {
	const categorySlug = url.searchParams.get('kategorie') ?? '';
	const q = url.searchParams.get('q')?.trim() ?? '';

	const [categories, requests] = await Promise.all([
		listCategoryTree(),
		listOpenRequests({ categorySlug: categorySlug || undefined, q: q || undefined })
	]);
	return { categories, requests, filters: { categorySlug, q } };
};

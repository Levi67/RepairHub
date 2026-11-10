import type { PageServerLoad } from './$types';
import { lookupPlz } from '#lib/server/geo.ts';
import { listCategoryTree, listOpenRequests } from '#lib/server/requests.ts';
import { RADIUS_OPTIONS } from '#lib/geo.ts';

export const load: PageServerLoad = async ({ url, locals }) => {
	const params = url.searchParams;
	const categorySlug = params.get('kategorie') ?? '';
	const q = params.get('q')?.trim() ?? '';
	const view = params.get('ansicht') === 'karte' ? 'karte' : 'liste';

	// Distance is measured from the PLZ in the URL, or else from the user's profile PLZ.
	// An empty `plz=` means "no location", so the profile PLZ isn't forced on anyone.
	const plz = (params.has('plz') ? params.get('plz') : locals.user?.plz)?.trim() ?? '';
	const radius = Number(params.get('umkreis'));
	const radiusKm = (RADIUS_OPTIONS as readonly number[]).includes(radius) ? radius : null;
	// Requests that can be shipped show up regardless of distance, unless the user hides them.
	const includeShipping = params.get('versand') !== 'nein';

	const origin = plz ? await lookupPlz(plz) : null;
	let locationError = '';
	if (plz && !origin) locationError = 'Diese PLZ kennen wir nicht.';
	else if (radiusKm && !origin) locationError = 'Für die Umkreissuche bitte eine PLZ angeben.';

	const [categories, requests] = await Promise.all([
		listCategoryTree(),
		listOpenRequests({
			categorySlug: categorySlug || undefined,
			q: q || undefined,
			distance: origin ? { origin, radiusKm, includeShipping } : undefined,
			// The map shows more at once than the list.
			limit: view === 'karte' ? 300 : 50
		})
	]);

	return {
		categories,
		requests,
		view,
		origin: origin && { plz: origin.plz, city: origin.city, lat: origin.lat, lng: origin.lng },
		locationError,
		filters: { categorySlug, q, plz, radiusKm, includeShipping }
	};
};

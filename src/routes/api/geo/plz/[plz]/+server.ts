import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { lookupPlz } from '#lib/server/geo.ts';

/** PLZ → city and the places in it, to fill in "Ort" in forms. Public data, cached for a day. */
export const GET: RequestHandler = async ({ params }) => {
	const info = await lookupPlz(params.plz);
	if (!info) error(404, 'Unbekannte PLZ');
	return json(
		{ plz: info.plz, city: info.city, places: info.places },
		{ headers: { 'Cache-Control': 'public, max-age=86400' } }
	);
};

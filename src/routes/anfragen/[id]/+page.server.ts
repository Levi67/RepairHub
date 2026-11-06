import { error } from '@sveltejs/kit';
import { z } from 'zod';
import type { PageServerLoad } from './$types';
import { getRequest } from '#lib/server/requests.ts';

export const load: PageServerLoad = async ({ params, locals }) => {
	if (!z.uuid().safeParse(params.id).success) error(404, 'Anfrage nicht gefunden');

	const request = await getRequest(params.id);
	if (!request) error(404, 'Anfrage nicht gefunden');

	return { request, isOwner: locals.user?.id === request.customerId };
};

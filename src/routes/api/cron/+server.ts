import { createHash, timingSafeEqual } from 'node:crypto';
import { error, json } from '@sveltejs/kit';
import { CRON_SECRET } from '$app/env/private';
import type { RequestHandler } from './$types';
import { runMaintenance } from '#lib/server/maintenance.ts';

const digest = (value: string) => createHash('sha256').update(value).digest();

/**
 * Daily background jobs (#49). Vercel Cron calls this with `Authorization: Bearer <CRON_SECRET>`
 * (schedule in vercel.json). Without CRON_SECRET the endpoint is off.
 */
export const GET: RequestHandler = async ({ request }) => {
	if (!CRON_SECRET) error(404, 'Not found');
	const header = request.headers.get('authorization') ?? '';
	if (!timingSafeEqual(digest(header), digest(`Bearer ${CRON_SECRET}`))) {
		error(401, 'Unauthorized');
	}
	return json(await runMaintenance());
};

import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getAvatar } from '#lib/server/profiles.ts';

/** Profile pictures are public, like the name. Links carry `?v=<upload time>`, so they can be cached for good. */
export const GET: RequestHandler = async ({ params }) => {
	const avatar = await getAvatar(params.userId);
	if (!avatar) error(404, 'Nicht gefunden');

	return new Response(new Uint8Array(avatar.data), {
		headers: {
			'Content-Type': avatar.contentType,
			'Cache-Control': 'public, max-age=31536000, immutable',
			'X-Content-Type-Options': 'nosniff',
			'Content-Security-Policy': "default-src 'none'"
		}
	});
};

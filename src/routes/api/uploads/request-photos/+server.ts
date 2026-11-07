import { error, json } from '@sveltejs/kit';
import { z } from 'zod';
import type { RequestHandler } from './$types';
import { DomainError } from '#lib/server/errors.ts';
import { createPhotoUploads, MAX_REQUEST_PHOTOS, photoTypes } from '#lib/server/storage.ts';

/**
 * Step 1 of a photo upload (Technical.md 8): the browser asks for signed URLs, uploads the
 * shrunk images (WebP, or JPEG from Safari) straight to storage, then submits the paths with
 * the form. The form action checks that each file exists, is a real image and belongs to the user.
 */
export const POST: RequestHandler = async ({ request, locals }) => {
	const user = locals.user;
	if (!user) error(401, 'Nicht angemeldet');

	const body = z
		.object({
			types: z
				.array(z.enum(Object.keys(photoTypes) as (keyof typeof photoTypes)[]))
				.min(1)
				.max(MAX_REQUEST_PHOTOS)
		})
		.safeParse(await request.json().catch(() => null));
	if (!body.success) error(400, 'Ungültige Anfrage');

	try {
		return json({ uploads: await createPhotoUploads(user.id, body.data.types) });
	} catch (e) {
		if (e instanceof DomainError) error(503, e.message);
		throw e;
	}
};

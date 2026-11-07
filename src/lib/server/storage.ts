// Supabase Storage over its REST API (Technical.md 8: only reached through our server).
// Request photos are public like the request itself, so they sit in a public bucket and are
// served straight from Supabase. File names are random UUIDs, so they can't be guessed.
import { SUPABASE_SECRET_KEY, SUPABASE_URL, STORAGE_BUCKET } from '$app/env/private';
import { DomainError } from '#lib/server/errors.ts';
export { MAX_PHOTOS as MAX_REQUEST_PHOTOS } from '#lib/schemas/request.ts';

/** Same limit as the bucket (scripts/setup-storage.js). Photos are ~200–500 KB after shrinking. */
export const PHOTO_MAX_BYTES = 2 * 1024 * 1024;

export const storageEnabled = Boolean(SUPABASE_URL && SUPABASE_SECRET_KEY);

function config() {
	if (!SUPABASE_URL || !SUPABASE_SECRET_KEY) {
		throw new DomainError('Foto-Upload ist auf diesem Server noch nicht eingerichtet.');
	}
	return {
		base: `${SUPABASE_URL}/storage/v1`,
		// New `sb_secret_…` keys go in `apikey`; legacy JWT keys also need `Authorization`.
		headers: { apikey: SUPABASE_SECRET_KEY, Authorization: `Bearer ${SUPABASE_SECRET_KEY}` }
	};
}

const encodePath = (path: string) => path.split('/').map(encodeURIComponent).join('/');

// The browser shrinks photos to WebP; Safari can't encode WebP, so it sends JPEG instead.
export const photoTypes = { 'image/webp': 'webp', 'image/jpeg': 'jpg' } as const;
export type PhotoType = keyof typeof photoTypes;

/** `<userId>/<uuid>.<ext>`: the first segment tells whose upload it is. */
const PHOTO_PATH = /^([A-Za-z0-9_-]{1,64})\/[0-9a-f-]{36}\.(webp|jpg)$/;

export function isOwnPhotoPath(path: string, userId: string): boolean {
	return PHOTO_PATH.exec(path)?.[1] === userId;
}

export function photoUrl(path: string): string {
	return `${SUPABASE_URL ?? ''}/storage/v1/object/public/${STORAGE_BUCKET}/${encodePath(path)}`;
}

/** Signed URLs the browser can PUT one image each to, valid for 2 hours. */
export async function createPhotoUploads(userId: string, types: PhotoType[]) {
	const { base, headers } = config();
	return Promise.all(
		types.map(async (type) => {
			const path = `${userId}/${crypto.randomUUID()}.${photoTypes[type]}`;
			const res = await fetch(`${base}/object/upload/sign/${STORAGE_BUCKET}/${encodePath(path)}`, {
				method: 'POST',
				headers
			});
			if (!res.ok) throw new Error(`Storage sign failed: ${res.status} ${await res.text()}`);
			const { url } = (await res.json()) as { url: string };
			return { path, uploadUrl: `${base}${url}` };
		})
	);
}

/**
 * Checks that an uploaded photo exists, really is an image of the type its name says, and is
 * within the size limit. Reads only the first 16 bytes.
 */
export async function verifyPhoto(path: string): Promise<boolean> {
	const { base, headers } = config();
	const res = await fetch(`${base}/object/authenticated/${STORAGE_BUCKET}/${encodePath(path)}`, {
		headers: { ...headers, Range: 'bytes=0-15' }
	});
	if (!res.ok) return false;
	const bytes = new Uint8Array(await res.arrayBuffer());
	const total = Number(res.headers.get('content-range')?.split('/')[1] ?? bytes.length);
	const ascii = (from: number, to: number) => String.fromCharCode(...bytes.subarray(from, to));
	const isType = path.endsWith('.webp')
		? ascii(0, 4) === 'RIFF' && ascii(8, 12) === 'WEBP'
		: bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
	return isType && total <= PHOTO_MAX_BYTES;
}

/** Best effort: a leftover file only costs storage, so failures are logged, not thrown. */
export async function deletePhotos(paths: string[]) {
	if (!paths.length || !storageEnabled) return;
	const { base, headers } = config();
	try {
		const res = await fetch(`${base}/object/${STORAGE_BUCKET}`, {
			method: 'DELETE',
			headers: { ...headers, 'Content-Type': 'application/json' },
			body: JSON.stringify({ prefixes: paths })
		});
		if (!res.ok) console.error('Storage delete failed', res.status, await res.text());
	} catch (e) {
		console.error('Storage delete failed', e);
	}
}

// Creates (or updates) the public bucket for request photos. Run once per Supabase project and bucket.
// Usage: pnpm storage:setup   (uses SUPABASE_URL, SUPABASE_SECRET_KEY, STORAGE_BUCKET from .env)
// Only the origin, in case the URL was copied with `/rest/v1/` at the end.
const url = process.env.SUPABASE_URL ? new URL(process.env.SUPABASE_URL).origin : undefined;
const key = process.env.SUPABASE_SECRET_KEY;
const bucket = process.env.STORAGE_BUCKET || 'request-photos';
if (!url || !key) {
	console.error('SUPABASE_URL and SUPABASE_SECRET_KEY must be set');
	process.exit(1);
}

const headers = { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' };
const settings = {
	public: true,
	// Matches PHOTO_MAX_BYTES in src/lib/server/storage.ts. The browser shrinks every photo to
	// WebP, or to JPEG in Safari, which can't encode WebP.
	file_size_limit: 2 * 1024 * 1024,
	allowed_mime_types: ['image/webp', 'image/jpeg']
};

let res = await fetch(`${url}/storage/v1/bucket`, {
	method: 'POST',
	headers,
	body: JSON.stringify({ id: bucket, name: bucket, ...settings })
});
let action = 'Created';
let body = res.ok ? '' : await res.text();
if (body.includes('already exists')) {
	res = await fetch(`${url}/storage/v1/bucket/${bucket}`, {
		method: 'PUT',
		headers,
		body: JSON.stringify({ id: bucket, ...settings })
	});
	action = 'Updated';
	body = res.ok ? '' : await res.text();
}
if (!res.ok) {
	console.error(`Failed: ${res.status} ${body}`);
	process.exit(1);
}
console.log(`${action} public bucket "${bucket}" (WebP/JPEG only, max 2 MB per file).`);

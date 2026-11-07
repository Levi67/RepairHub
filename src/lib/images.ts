// Browser-only helpers for photo uploads (Technical.md 3.3: max 1600 px, WebP).

export const PHOTO_MAX_SIDE_PX = 1600;
/** Original files larger than this are refused before shrinking (Technical.md 8). */
export const PHOTO_MAX_ORIGINAL_BYTES = 10 * 1024 * 1024;

/**
 * Shrinks a photo to at most 1600 px on the long side and re-encodes it. This also drops
 * EXIF data such as the GPS position. Safari can't encode WebP, so it gets JPEG instead.
 * Throws if the browser can't read the format (e.g. HEIC outside Safari).
 */
export async function shrinkPhoto(file: File): Promise<Blob> {
	const bitmap = await createImageBitmap(file);
	const scale = Math.min(1, PHOTO_MAX_SIDE_PX / Math.max(bitmap.width, bitmap.height));
	const canvas = document.createElement('canvas');
	canvas.width = Math.round(bitmap.width * scale);
	canvas.height = Math.round(bitmap.height * scale);
	canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
	bitmap.close();

	const encode = (type: string, quality: number) =>
		new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));
	const webp = await encode('image/webp', 0.82);
	if (webp?.type === 'image/webp') return webp;
	const jpeg = await encode('image/jpeg', 0.85);
	if (!jpeg) throw new Error('encode failed');
	return jpeg;
}

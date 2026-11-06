import { and, count, eq } from 'drizzle-orm';
import { db } from '#lib/server/db/index.ts';
import { order, user, userAvatar } from '#lib/server/db/schema.ts';
import { DomainError } from '#lib/server/errors.ts';
import { readNotificationPrefs, type NotificationPrefs } from '#lib/notifications.ts';
import type { ProfileInput } from '#lib/schemas/profile.ts';

export const AVATAR_MAX_BYTES = 200 * 1024;

export async function getOwnProfile(userId: string) {
	const [row] = await db
		.select({
			id: user.id,
			name: user.name,
			email: user.email,
			image: user.image,
			plz: user.plz,
			city: user.city,
			bio: user.bio,
			notificationPrefs: user.notificationPrefs
		})
		.from(user)
		.where(eq(user.id, userId));
	if (!row) return null;
	return { ...row, notificationPrefs: readNotificationPrefs(row.notificationPrefs) };
}

export async function updateProfile(userId: string, input: ProfileInput) {
	await db
		.update(user)
		.set({
			name: input.name,
			plz: input.plz || null,
			city: input.city || null,
			bio: input.bio || null
		})
		.where(eq(user.id, userId));
}

export async function updateNotificationPrefs(userId: string, prefs: NotificationPrefs) {
	await db.update(user).set({ notificationPrefs: prefs }).where(eq(user.id, userId));
}

/** Only real images: checks the first bytes instead of trusting the browser's content type. */
function detectImageType(bytes: Uint8Array): string | null {
	const ascii = (from: number, to: number) => String.fromCharCode(...bytes.subarray(from, to));
	if (ascii(0, 4) === 'RIFF' && ascii(8, 12) === 'WEBP') return 'image/webp';
	if (bytes[0] === 0x89 && ascii(1, 4) === 'PNG') return 'image/png';
	if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg';
	return null;
}

export async function setAvatar(userId: string, file: File) {
	if (file.size > AVATAR_MAX_BYTES) throw new DomainError('Das Bild ist zu groß (max. 200 KB).');
	const data = new Uint8Array(await file.arrayBuffer());
	const contentType = detectImageType(data);
	if (!contentType) throw new DomainError('Bitte ein Bild im Format JPEG, PNG oder WebP wählen.');

	const updatedAt = new Date();
	await db.transaction(async (tx) => {
		await tx
			.insert(userAvatar)
			.values({ userId, contentType, data, updatedAt })
			.onConflictDoUpdate({ target: userAvatar.userId, set: { contentType, data, updatedAt } });
		// `?v=` changes with every upload, so browsers may cache each version forever.
		await tx
			.update(user)
			.set({ image: `/api/avatar/${userId}?v=${updatedAt.getTime()}` })
			.where(eq(user.id, userId));
	});
}

export async function removeAvatar(userId: string) {
	await db.transaction(async (tx) => {
		await tx.delete(userAvatar).where(eq(userAvatar.userId, userId));
		await tx.update(user).set({ image: null }).where(eq(user.id, userId));
	});
}

export async function getAvatar(userId: string) {
	const [row] = await db.select().from(userAvatar).where(eq(userAvatar.userId, userId));
	return row ?? null;
}

/** What anyone may see about a user: no email, no exact address. */
export async function getPublicProfile(userId: string) {
	const [row] = await db
		.select({
			id: user.id,
			name: user.name,
			image: user.image,
			plz: user.plz,
			city: user.city,
			bio: user.bio,
			createdAt: user.createdAt,
			bannedAt: user.bannedAt
		})
		.from(user)
		.where(eq(user.id, userId));
	if (!row) return null;

	const completed = (side: 'customerId' | 'repairerId') =>
		db
			.select({ n: count() })
			.from(order)
			.where(and(eq(order[side], userId), eq(order.status, 'completed')))
			.then(([r]) => r.n);
	const [completedAsCustomer, completedAsRepairer] = await Promise.all([
		completed('customerId'),
		completed('repairerId')
	]);

	return { ...row, completedAsCustomer, completedAsRepairer };
}

import { redirect } from '@sveltejs/kit';
import { sequence, type Handle } from '@sveltejs/kit/hooks';
import { building } from '$app/env';
import { SUPER_ADMIN_EMAIL } from '$app/env/private';
import { eq } from 'drizzle-orm';
import { auth } from '#lib/server/auth.ts';
import { db } from '#lib/server/db/index.ts';
import { user as userTable } from '#lib/server/db/schema.ts';
import { svelteKitHandler } from 'better-auth/svelte-kit';

const handleBetterAuth: Handle = async ({ event, resolve }) => {
	const session = await auth.api.getSession({ headers: event.request.headers });

	// A ban deletes the user's sessions; this also covers any session created before the ban.
	if (session && !session.user.bannedAt && !session.user.deletedAt) {
		event.locals.session = session.session;
		event.locals.user = session.user;
		await syncSuperAdmin(session.user);

		const impersonatorId = session.session.impersonatedBy;
		if (impersonatorId) {
			const [impersonator] = await db
				.select({ id: userTable.id, name: userTable.name })
				.from(userTable)
				.where(eq(userTable.id, impersonatorId));
			if (impersonator) event.locals.impersonator = impersonator;
		}
	}

	return svelteKitHandler({ event, resolve, auth, building });
};

/**
 * SUPER_ADMIN_EMAIL decides who the super admin is; the `is_super_admin` column only mirrors it,
 * so it can't be granted or taken away from inside the app. The super admin is always admin too.
 */
async function syncSuperAdmin(u: NonNullable<App.Locals['user']>) {
	const shouldBe = Boolean(SUPER_ADMIN_EMAIL) && u.email.toLowerCase() === SUPER_ADMIN_EMAIL;
	if (u.isSuperAdmin === shouldBe && (!shouldBe || u.isAdmin)) return;
	await db
		.update(userTable)
		.set(shouldBe ? { isSuperAdmin: true, isAdmin: true } : { isSuperAdmin: false })
		.where(eq(userTable.id, u.id));
	u.isSuperAdmin = shouldBe;
	if (shouldBe) u.isAdmin = true;
}

/** Paths that stay reachable while a temporary password has to be replaced. */
const PASSWORD_CHANGE_ALLOWED = ['/passwort-aendern', '/abmelden', '/api/'];

/** After the super admin set a temporary password, the user must choose a new one first. */
const handleForcedPasswordChange: Handle = ({ event, resolve }) => {
	const u = event.locals.user;
	if (
		u?.mustChangePassword &&
		!event.locals.impersonator &&
		!PASSWORD_CHANGE_ALLOWED.some((p) => event.url.pathname.startsWith(p))
	) {
		redirect(303, '/passwort-aendern');
	}
	return resolve(event);
};

export const handle: Handle = sequence(handleBetterAuth, handleForcedPasswordChange);

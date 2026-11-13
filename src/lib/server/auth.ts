import { ORIGIN, BETTER_AUTH_SECRET } from '$app/env/private';
import { betterAuth } from 'better-auth/minimal';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { sveltekitCookies } from 'better-auth/svelte-kit';
import { APIError } from 'better-auth/api';
import { getRequestEvent } from '$app/server';
import { eq } from 'drizzle-orm';
import { db } from '#lib/server/db/index.ts';
import { user } from '#lib/server/db/auth.schema.ts';
import { impersonation } from '#lib/server/impersonation.ts';

export const auth = betterAuth({
	baseURL: ORIGIN,
	secret: BETTER_AUTH_SECRET,
	database: drizzleAdapter(db, { provider: 'pg' }),
	emailAndPassword: { enabled: true },
	user: {
		// Profile fields (Technical.md 6.1). `input: false`: only our own validated actions write them,
		// not Better Auth's public sign-up / update-user endpoints.
		additionalFields: {
			bio: { type: 'string', required: false, input: false },
			plz: { type: 'string', required: false, input: false },
			city: { type: 'string', required: false, input: false },
			notificationPrefs: { type: 'json', required: false, input: false },
			// Set only from the admin area (Technical.md 3.13).
			isAdmin: { type: 'boolean', required: true, defaultValue: false, input: false },
			bannedAt: { type: 'date', required: false, input: false },
			// Super admin tools (#64), see hooks.server.ts and admin-super.ts.
			isSuperAdmin: { type: 'boolean', required: true, defaultValue: false, input: false },
			mustChangePassword: { type: 'boolean', required: true, defaultValue: false, input: false },
			isTest: { type: 'boolean', required: true, defaultValue: false, input: false },
			deletedAt: { type: 'date', required: false, input: false }
		},
		// Unverified emails can be changed directly. Once email verification exists, verified
		// users will need a confirmation email instead.
		changeEmail: { enabled: true, updateEmailWithoutVerification: true }
	},
	databaseHooks: {
		session: {
			create: {
				// Banned users can't log in. Their existing sessions are deleted when they are banned.
				async before(session) {
					const [row] = await db
						.select({ bannedAt: user.bannedAt, deletedAt: user.deletedAt })
						.from(user)
						.where(eq(user.id, session.userId));
					if (row?.deletedAt) {
						throw APIError.from('FORBIDDEN', {
							message: 'Dieses Konto wurde gelöscht.',
							code: 'DELETED_USER'
						});
					}
					if (row?.bannedAt) {
						throw APIError.from('FORBIDDEN', {
							message: 'Dieses Konto wurde gesperrt.',
							code: 'BANNED_USER'
						});
					}
				}
			}
		}
	},
	plugins: [
		impersonation(),
		sveltekitCookies(getRequestEvent) // make sure this is the last plugin in the array
	]
});

// "Anmelden als …" for the super admin (#64). A small Better Auth plugin, built like the official
// admin plugin's impersonation but on our own fields (isSuperAdmin, isTest) instead of its roles:
// the super admin gets a fresh 1-hour session as the target user, and their own session token is
// kept in a signed cookie so "Zurück" restores it. Real (non-test) users need the super admin's
// password first. Every check happens in here, so the endpoints are safe even when called directly.
import type { AuthContext, BetterAuthPlugin } from 'better-auth';
import { APIError, createAuthEndpoint, getSessionFromCtx } from 'better-auth/api';
import { deleteSessionCookie, expireCookie, setSessionCookie } from 'better-auth/cookies';
import { z } from 'zod';

const IMPERSONATION_SECONDS = 60 * 60;
const ADMIN_COOKIE = 'impersonator_session';

/** Checks a password against a user's email/password login. False if they have none. */
export async function verifyUserPassword(context: AuthContext, userId: string, password: string) {
	const accounts = await context.internalAdapter.findAccounts(userId);
	const credential = accounts.find((a) => a.providerId === 'credential');
	if (!credential?.password) return false;
	return context.password.verify({ hash: credential.password, password });
}

export const impersonation = () =>
	({
		id: 'repairhub-impersonation',
		schema: {
			session: {
				fields: { impersonatedBy: { type: 'string', required: false, input: false } }
			}
		},
		endpoints: {
			impersonateUser: createAuthEndpoint(
				'/repairhub/impersonate',
				{
					method: 'POST',
					body: z.object({ userId: z.string(), password: z.string().optional() })
				},
				async (ctx) => {
					const current = await getSessionFromCtx(ctx);
					const actor = current?.user as { id: string; isSuperAdmin?: boolean } | undefined;
					if (!current || !actor?.isSuperAdmin) throw APIError.fromStatus('FORBIDDEN');
					if ((current.session as { impersonatedBy?: string | null }).impersonatedBy) {
						throw APIError.fromStatus('BAD_REQUEST', {
							message: 'Du bist schon als jemand anderes angemeldet.'
						});
					}

					const target = (await ctx.context.internalAdapter.findUserById(ctx.body.userId)) as
						| ({ id: string; isTest?: boolean; deletedAt?: Date | null } & Record<string, unknown>)
						| null;
					if (!target || target.deletedAt) {
						throw APIError.fromStatus('NOT_FOUND', { message: 'Nutzer nicht gefunden.' });
					}
					if (target.id === actor.id) {
						throw APIError.fromStatus('BAD_REQUEST', { message: 'Das bist du selbst.' });
					}
					if (!target.isTest) {
						const ok =
							ctx.body.password &&
							(await verifyUserPassword(ctx.context, actor.id, ctx.body.password));
						if (!ok) {
							throw APIError.fromStatus('UNAUTHORIZED', { message: 'Falsches Passwort.' });
						}
					}

					const session = await ctx.context.internalAdapter.createSession(
						target.id,
						true,
						{
							impersonatedBy: actor.id,
							expiresAt: new Date(Date.now() + IMPERSONATION_SECONDS * 1000)
						},
						true
					);
					if (!session) throw APIError.fromStatus('INTERNAL_SERVER_ERROR');

					const authCookies = ctx.context.authCookies;
					deleteSessionCookie(ctx);
					const dontRemember = await ctx.getSignedCookie(
						authCookies.dontRememberToken.name,
						ctx.context.secret
					);
					await ctx.setSignedCookie(
						ctx.context.createAuthCookie(ADMIN_COOKIE).name,
						`${current.session.token}:${dontRemember || ''}`,
						ctx.context.secret,
						authCookies.sessionToken.attributes
					);
					await setSessionCookie(ctx, { session, user: target as never }, true);
					return ctx.json({ userId: target.id });
				}
			),
			stopImpersonating: createAuthEndpoint(
				'/repairhub/stop-impersonating',
				{ method: 'POST', requireHeaders: true },
				async (ctx) => {
					const current = await getSessionFromCtx(ctx);
					const impersonatedBy = (
						current?.session as { impersonatedBy?: string | null } | undefined
					)?.impersonatedBy;
					if (!current || !impersonatedBy) throw APIError.fromStatus('BAD_REQUEST');

					const adminCookie = ctx.context.createAuthCookie(ADMIN_COOKIE);
					const stored = await ctx.getSignedCookie(adminCookie.name, ctx.context.secret);
					const [adminToken, dontRemember] = (stored || '').split(':');
					const adminSession = adminToken
						? await ctx.context.internalAdapter.findSession(adminToken)
						: null;

					await ctx.context.internalAdapter.deleteSession(current.session.token);
					expireCookie(ctx, adminCookie);
					// The super admin's own session is gone (e.g. expired): just log out completely.
					if (!adminSession || adminSession.session.userId !== impersonatedBy) {
						deleteSessionCookie(ctx);
						return ctx.json({ restored: false });
					}
					await setSessionCookie(ctx, adminSession, !!dontRemember);
					return ctx.json({ restored: true });
				}
			)
		}
	}) satisfies BetterAuthPlugin;

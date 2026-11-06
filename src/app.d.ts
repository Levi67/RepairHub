import type { auth } from '#lib/server/auth.ts';

// Inferred from the auth config, so the extra user fields (isAdmin, bannedAt, …) are typed too.
type Session = typeof auth.$Infer.Session;

// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	namespace App {
		interface Locals {
			user?: Session['user'];
			session?: Session['session'];
		}

		// interface Error {}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};

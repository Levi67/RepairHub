import { defineEnvVars } from '@sveltejs/kit/env';

export const variables = defineEnvVars({
	DATABASE_URL: { description: 'The database connection string.' },
	ORIGIN: {
		description: 'The app origin (base URL), e.g. `http://localhost:5173`.'
	},
	BETTER_AUTH_SECRET: {
		description:
			'Secret used to sign tokens. For production use 32 characters generated with high entropy. See [Better Auth installation](https://www.better-auth.com/docs/installation).'
	},
	SUPABASE_URL: {
		description:
			'Supabase project URL for file storage, e.g. `https://abcd.supabase.co`. Without it, photo uploads are disabled.',
		// Only the origin: the "API URL" Supabase shows ends in `/rest/v1/`, which storage can't use.
		schema: (value) => (value ? new URL(value).origin : undefined)
	},
	SUPABASE_SECRET_KEY: {
		description:
			'Supabase secret key (`sb_secret_…`) or legacy `service_role` key. Server only, never sent to the browser.',
		schema: (value) => value || undefined
	},
	STRIPE_SECRET_KEY: {
		description:
			'Stripe secret key (`sk_test_…`). Without it, Stripe is off: no payout onboarding, and anyone can send quotes.',
		schema: (value) => value || undefined
	},
	STRIPE_WEBHOOK_SECRET: {
		description:
			'Signing secret (`whsec_…`) of the Stripe webhook endpoint `/api/stripe/webhook` (Connect events).',
		schema: (value) => value || undefined
	},
	REQUIRE_PAYOUT_ACCOUNT: {
		description:
			'`true` = repairers need an active Stripe payout account to send quotes (Technical.md 3.5). Off by default, so the whole app can be used for testing without one.',
		schema: (value) => value === 'true'
	},
	SUPER_ADMIN_EMAIL: {
		description:
			'Email of the one super admin account (#64). It is always admin, no other admin can change it, and it gets the extra tools in /admin. Empty = no super admin.',
		schema: (value) => value?.trim().toLowerCase() || undefined
	},
	STORAGE_BUCKET: {
		description:
			'Storage bucket for request photos. Use a separate one for local development, e.g. `request-photos-dev`.',
		schema: (value) => value || 'request-photos'
	}
});

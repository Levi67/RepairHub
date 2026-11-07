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
	STORAGE_BUCKET: {
		description:
			'Storage bucket for request photos. Use a separate one for local development, e.g. `request-photos-dev`.',
		schema: (value) => value || 'request-photos'
	}
});

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';
import { DATABASE_URL } from '$app/env/private';

if (!DATABASE_URL) throw new Error('DATABASE_URL is not set');

// `prepare: false` is required for Supabase's transaction pooler, which serverless functions use.
const client = postgres(DATABASE_URL, { prepare: false });

export const db = drizzle(client, { schema });

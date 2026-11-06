import { fail } from '@sveltejs/kit';

/** A rule was broken (wrong status, not allowed, …). The message is shown to the user. */
export class DomainError extends Error {}

/** Turns a DomainError into a form failure; anything else is a real bug and is rethrown. */
export function failOnDomainError(error: unknown) {
	if (error instanceof DomainError) return fail(409, { message: error.message });
	throw error;
}

/** Postgres unique violation, also when wrapped by Drizzle. */
export function isUniqueViolation(error: unknown): boolean {
	const e = error as { code?: string; cause?: { code?: string } };
	return e?.code === '23505' || e?.cause?.code === '23505';
}

import type { z } from 'zod';

/** First error message per field, for showing next to form inputs. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
	const errors: Record<string, string> = {};
	for (const issue of error.issues) {
		errors[String(issue.path[0])] ??= issue.message;
	}
	return errors;
}

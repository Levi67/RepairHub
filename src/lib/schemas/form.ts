import { z } from 'zod';
import { formatCents, MAX_AMOUNT_CENTS, parseEuroToCents } from '#lib/money.ts';

function toCents(value: string, ctx: z.RefinementCtx, invalidMessage: string) {
	const cents = parseEuroToCents(value);
	if (cents === null || cents <= 0) {
		ctx.addIssue({ code: 'custom', message: invalidMessage });
		return z.NEVER;
	}
	if (cents > MAX_AMOUNT_CENTS) {
		ctx.addIssue({ code: 'custom', message: `Höchstens ${formatCents(MAX_AMOUNT_CENTS)}` });
		return z.NEVER;
	}
	return cents;
}

/** A euro amount typed by the user ("49", "49,90"), as cents up to `MAX_AMOUNT_CENTS`. */
export const euroAmount = (invalidMessage: string) =>
	z
		.string()
		.trim()
		.transform((value, ctx) => toCents(value, ctx, invalidMessage));

/** Like `euroAmount`, but an empty field is allowed and gives null. */
export const optionalEuroAmount = (invalidMessage: string) =>
	z
		.string()
		.trim()
		.optional()
		.transform((value, ctx) => (value ? toCents(value, ctx, invalidMessage) : null));

/** First error message per field, for showing next to form inputs. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
	const errors: Record<string, string> = {};
	for (const issue of error.issues) {
		errors[String(issue.path[0])] ??= issue.message;
	}
	return errors;
}

import { z } from 'zod';
import { handoverModes } from '#lib/handover.ts';
import { parseEuroToCents } from '#lib/money.ts';

// Field rules from Technical.md 3.5.
export const quoteSchema = z.object({
	price: z
		.string()
		.trim()
		.transform((value, ctx) => {
			const cents = parseEuroToCents(value);
			if (cents === null || cents <= 0) {
				ctx.addIssue({ code: 'custom', message: 'Bitte einen gültigen Preis angeben' });
				return z.NEVER;
			}
			return cents;
		}),
	estimatedDays: z.coerce
		.number('Bitte eine Dauer angeben')
		.int('Bitte ganze Tage angeben')
		.min(1, 'Mindestens 1 Tag')
		.max(90, 'Höchstens 90 Tage'),
	handoverMode: z.enum(handoverModes, 'Bitte eine Übergabeart wählen'),
	includesReturnShipping: z.boolean(),
	message: z
		.string()
		.trim()
		.min(10, 'Bitte schreib ein paar Worte zu deinem Angebot (mind. 10 Zeichen)')
		.max(2000, 'Höchstens 2000 Zeichen'),
	partsNote: z.string().trim().max(300, 'Höchstens 300 Zeichen').optional()
});

export type QuoteInput = z.output<typeof quoteSchema>;

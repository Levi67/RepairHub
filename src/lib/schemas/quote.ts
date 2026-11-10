import { z } from 'zod';
import { handoverModes } from '#lib/handover.ts';
import { euroAmount } from '#lib/schemas/form.ts';

// Field rules from Technical.md 3.5.
export const quoteSchema = z.object({
	price: euroAmount('Bitte einen gültigen Preis angeben'),
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

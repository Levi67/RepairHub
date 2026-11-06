import { z } from 'zod';
import { handoverModes } from '#lib/handover.ts';
import { parseEuroToCents } from '#lib/money.ts';

// Field rules from Technical.md 3.3.
export const repairRequestSchema = z.object({
	title: z.string().trim().min(5, 'Mindestens 5 Zeichen').max(80, 'Höchstens 80 Zeichen'),
	categoryId: z.uuid('Bitte eine Kategorie wählen'),
	description: z
		.string()
		.trim()
		.min(20, 'Bitte beschreibe den Defekt etwas genauer (mind. 20 Zeichen)')
		.max(2000, 'Höchstens 2000 Zeichen'),
	brand: z.string().trim().max(80).optional(),
	model: z.string().trim().max(80).optional(),
	budget: z
		.string()
		.trim()
		.optional()
		.transform((value, ctx) => {
			if (!value) return null;
			const cents = parseEuroToCents(value);
			if (cents === null || cents <= 0) {
				ctx.addIssue({ code: 'custom', message: 'Ungültiger Betrag' });
				return z.NEVER;
			}
			return cents;
		}),
	handoverModes: z.array(z.enum(handoverModes)).min(1, 'Mindestens eine Übergabeart wählen'),
	plz: z
		.string()
		.trim()
		.regex(/^\d{5}$/, 'Bitte eine gültige PLZ angeben'),
	city: z.string().trim().min(2, 'Bitte einen Ort angeben').max(80)
});

export type RepairRequestInput = z.input<typeof repairRequestSchema>;

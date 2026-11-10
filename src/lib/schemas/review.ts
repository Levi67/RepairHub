import { z } from 'zod';

// Technical.md 3.10: 1–5 stars, optional text up to 1000 characters.
export const reviewSchema = z.object({
	rating: z.coerce
		.number('Bitte Sterne vergeben')
		.int('Bitte Sterne vergeben')
		.min(1, 'Bitte Sterne vergeben')
		.max(5, 'Höchstens 5 Sterne'),
	text: z.string().trim().max(1000, 'Höchstens 1000 Zeichen').optional()
});

export type ReviewInput = z.output<typeof reviewSchema>;

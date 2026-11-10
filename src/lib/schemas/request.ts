import { z } from 'zod';
import { handoverModes } from '#lib/handover.ts';
import { optionalEuroAmount } from '#lib/schemas/form.ts';
import { timeframes } from '#lib/timeframe.ts';

export const MAX_PHOTOS = 8;

// Storage paths from the upload step. Ownership and the files themselves are checked on the server.
const photoPaths = z
	.array(z.string().max(200))
	.max(MAX_PHOTOS, `Höchstens ${MAX_PHOTOS} Fotos`)
	.refine((paths) => new Set(paths).size === paths.length, 'Ein Foto ist doppelt');

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
	budget: optionalEuroAmount('Ungültiger Betrag'),
	handoverModes: z.array(z.enum(handoverModes)).min(1, 'Mindestens eine Übergabeart wählen'),
	plz: z
		.string()
		.trim()
		.regex(/^\d{5}$/, 'Bitte eine gültige PLZ angeben'),
	city: z.string().trim().min(2, 'Bitte einen Ort angeben').max(80),
	timeframe: z.enum(['', ...timeframes]).transform((value) => value || null),
	photos: photoPaths.min(1, 'Bitte mindestens ein Foto hinzufügen')
});

export type RepairRequestInput = z.input<typeof repairRequestSchema>;

/** Raw form values, as typed by the user or loaded from an existing request. */
export type RequestFormValues = Omit<ReturnType<typeof readRequestForm>, 'photos'>;

export function readRequestForm(formData: FormData) {
	const text = (key: string) => formData.get(key)?.toString() ?? '';
	return {
		title: text('title'),
		categoryId: text('categoryId'),
		description: text('description'),
		brand: text('brand'),
		model: text('model'),
		budget: text('budget'),
		handoverModes: formData.getAll('handoverModes').map(String),
		plz: text('plz'),
		city: text('city'),
		timeframe: text('timeframe'),
		photos: formData.getAll('photos').map(String)
	};
}

/** Once a request has quotes, the customer can only add to it (Technical.md 3.3). */
export const requestAdditionSchema = z
	.object({
		addendum: z.string().trim().max(1000, 'Höchstens 1000 Zeichen'),
		photos: photoPaths
	})
	.refine((v) => v.addendum.length > 0 || v.photos.length > 0, {
		message: 'Bitte einen Nachtrag schreiben oder Fotos hinzufügen',
		path: ['addendum']
	});

export type RequestAdditionInput = z.output<typeof requestAdditionSchema>;

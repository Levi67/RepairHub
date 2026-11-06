import { z } from 'zod';

export const profileSchema = z
	.object({
		name: z.string().trim().min(2, 'Bitte einen Namen angeben').max(50, 'Höchstens 50 Zeichen'),
		plz: z
			.string()
			.trim()
			.regex(/^(\d{5})?$/, 'Bitte eine gültige PLZ angeben'),
		city: z.string().trim().max(80, 'Höchstens 80 Zeichen'),
		bio: z.string().trim().max(1000, 'Höchstens 1000 Zeichen')
	})
	.refine((p) => Boolean(p.plz) === Boolean(p.city), {
		message: 'Bitte PLZ und Ort zusammen angeben',
		path: ['city']
	});

export type ProfileInput = z.output<typeof profileSchema>;

export const changeEmailSchema = z.object({
	email: z.email('Bitte eine gültige E-Mail angeben'),
	currentPassword: z.string().min(1, 'Bitte dein aktuelles Passwort eingeben')
});

export const changePasswordSchema = z
	.object({
		currentPassword: z.string().min(1, 'Bitte dein aktuelles Passwort eingeben'),
		newPassword: z.string().min(8, 'Das Passwort muss mindestens 8 Zeichen haben').max(128),
		confirmPassword: z.string()
	})
	.refine((p) => p.newPassword === p.confirmPassword, {
		message: 'Die Passwörter stimmen nicht überein',
		path: ['confirmPassword']
	});

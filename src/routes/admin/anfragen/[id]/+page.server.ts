import { error, redirect } from '@sveltejs/kit';
import { z } from 'zod';
import type { Actions, PageServerLoad } from './$types';
import { DomainError } from '#lib/server/errors.ts';
import { listCategoryTree } from '#lib/server/requests.ts';
import {
	deleteRequestAsAdmin,
	field,
	getRequestForAdmin,
	requireSuperAdmin,
	superAction,
	updateQuoteAsAdmin,
	updateRequestAsAdmin
} from '#lib/server/superadmin.ts';
import { quoteStatusLabels, requestStatusLabels } from '#lib/status.ts';

export const load: PageServerLoad = async (event) => {
	requireSuperAdmin(event);
	if (!z.uuid().safeParse(event.params.id).success) error(404, 'Anfrage nicht gefunden');
	const [found, categories] = await Promise.all([
		getRequestForAdmin(event.params.id),
		listCategoryTree()
	]);
	if (!found) error(404, 'Anfrage nicht gefunden');
	return { ...found, categories };
};

const requestStatuses = Object.keys(requestStatusLabels) as [keyof typeof requestStatusLabels];
const quoteStatuses = Object.keys(quoteStatusLabels) as [keyof typeof quoteStatusLabels];
/** End of the given day (date input → Date). */
const dateField = z.iso
	.date('Bitte ein Datum angeben.')
	.transform((d) => new Date(`${d}T23:59:59`));
const euros = (max: number) =>
	z.coerce
		.number('Bitte einen Betrag angeben.')
		.min(1, 'Mindestens 1 €.')
		.max(max, `Höchstens ${max} €.`)
		.transform((v) => Math.round(v * 100));

const requestSchema = z.object({
	title: z.string().min(3, 'Der Titel braucht mindestens 3 Zeichen.').max(120),
	description: z.string().min(1, 'Bitte eine Beschreibung angeben.').max(5000),
	categoryId: z.uuid('Bitte eine Kategorie wählen.'),
	status: z.enum(requestStatuses),
	plz: z.string().regex(/^\d{5}$/, 'Die PLZ hat 5 Ziffern.'),
	budget: z.union([z.literal('').transform(() => null), euros(100_000)]),
	expiresAt: dateField
});

const quoteSchema = z.object({
	price: euros(100_000),
	estimatedDays: z.coerce.number().int().min(1).max(365),
	message: z.string().min(1, 'Bitte eine Nachricht angeben.').max(5000),
	status: z.enum(quoteStatuses),
	validUntil: dateField
});

const parse = <T>(schema: z.ZodType<T>, data: unknown) => {
	const parsed = schema.safeParse(data);
	if (!parsed.success) throw new DomainError(parsed.error.issues[0].message);
	return parsed.data;
};

export const actions: Actions = {
	save: (event) =>
		superAction(event, async (_, form) => {
			const data = parse(requestSchema, {
				title: field(form, 'title'),
				description: field(form, 'description'),
				categoryId: field(form, 'categoryId'),
				status: field(form, 'status'),
				plz: field(form, 'plz'),
				budget: field(form, 'budget'),
				expiresAt: field(form, 'expiresAt')
			});
			const { budget, ...rest } = data;
			await updateRequestAsAdmin(event.params.id, { ...rest, budgetCents: budget });
			return 'Anfrage gespeichert.';
		}),
	quote: (event) =>
		superAction(event, async (_, form) => {
			const quoteId = field(form, 'quoteId');
			if (!z.uuid().safeParse(quoteId).success) throw new DomainError('Angebot fehlt.');
			const { price, ...rest } = parse(quoteSchema, {
				price: field(form, 'price'),
				estimatedDays: field(form, 'estimatedDays'),
				message: field(form, 'message'),
				status: field(form, 'status'),
				validUntil: field(form, 'validUntil')
			});
			await updateQuoteAsAdmin(quoteId, { ...rest, priceCents: price });
			return 'Angebot gespeichert.';
		}),
	delete: async (event) => {
		const result = await superAction(event, async (actor) => {
			await deleteRequestAsAdmin(actor.id, event.params.id);
		});
		if ('done' in result) redirect(303, '/admin/anfragen');
		return result;
	}
};

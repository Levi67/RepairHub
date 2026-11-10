import { error, fail, redirect, type RequestEvent } from '@sveltejs/kit';
import { z } from 'zod';
import type { Actions, PageServerLoad } from './$types';
import {
	cancelOrder,
	confirmCompleted,
	getOrderForUser,
	markInProgress,
	markRepaired,
	setOutboundTracking
} from '#lib/server/orders.ts';
import { failOnDomainError } from '#lib/server/errors.ts';
import { createReview, getOrderReviews } from '#lib/server/reviews.ts';
import { fieldErrors } from '#lib/schemas/form.ts';
import { reviewSchema } from '#lib/schemas/review.ts';
import { loginUrl } from '#lib/server/redirect.ts';

export const load: PageServerLoad = async (event) => {
	const user = event.locals.user;
	if (!user) return redirect(302, loginUrl(event.url));
	if (!z.uuid().safeParse(event.params.id).success) error(404, 'Auftrag nicht gefunden');

	const order = await getOrderForUser(event.params.id, user.id);
	if (!order) error(404, 'Auftrag nicht gefunden');

	const reviews = await getOrderReviews(order.order.id, user.id, order.order.completedAt);
	return {
		...order,
		reviews,
		role: order.order.customerId === user.id ? 'customer' : 'repairer'
	} as const;
};

const textField = (formData: FormData, name: string, max: number) =>
	formData.get(name)?.toString().trim().slice(0, max) ?? '';

/** Runs one order action for the logged-in user and turns rule violations into form errors. */
async function run(
	event: RequestEvent<{ id: string }>,
	action: (orderId: string, userId: string, formData: FormData) => Promise<unknown>
) {
	const user = event.locals.user;
	if (!user) return redirect(302, loginUrl(event.url));
	if (!z.uuid().safeParse(event.params.id).success)
		return fail(404, { message: 'Nicht gefunden.' });

	try {
		await action(event.params.id, user.id, await event.request.formData());
	} catch (e) {
		return failOnDomainError(e);
	}
}

export const actions: Actions = {
	start: (event) => run(event, (id, userId) => markInProgress(id, userId)),
	repaired: (event) =>
		run(event, (id, userId, f) => markRepaired(id, userId, textField(f, 'returnTracking', 100))),
	confirm: (event) => run(event, (id, userId) => confirmCompleted(id, userId)),
	cancel: (event) =>
		run(event, (id, userId, f) => cancelOrder(id, userId, textField(f, 'reason', 500))),
	review: async (event) => {
		const user = event.locals.user;
		if (!user) return redirect(302, loginUrl(event.url));
		const formData = await event.request.formData();
		const raw = {
			rating: formData.get('rating')?.toString() ?? '',
			text: formData.get('text')?.toString() ?? ''
		};
		const parsed = reviewSchema.safeParse(raw);
		if (!parsed.success) {
			return fail(400, { reviewValues: raw, reviewErrors: fieldErrors(parsed.error) });
		}
		try {
			await createReview(event.params.id, user.id, parsed.data);
		} catch (e) {
			return failOnDomainError(e);
		}
		return { reviewed: true };
	},
	tracking: (event) =>
		run(event, async (id, userId, f) => {
			const tracking = textField(f, 'outboundTracking', 100);
			if (tracking) await setOutboundTracking(id, userId, tracking);
		})
};

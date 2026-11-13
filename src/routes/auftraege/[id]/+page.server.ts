import { error, fail, redirect, type RequestEvent } from '@sveltejs/kit';
import { z } from 'zod';
import type { Actions, PageServerLoad } from './$types';
import {
	cancelOrder,
	confirmCompleted,
	getOrderForUser,
	markInProgress,
	markRepaired,
	releasePayout,
	setOutboundTracking,
	startPayment,
	syncPayment
} from '#lib/server/orders.ts';
import { DomainError, failOnDomainError } from '#lib/server/errors.ts';
import { STRIPE_CHECKOUT } from '#lib/server/payments.ts';
import { createReview, getOrderReviews } from '#lib/server/reviews.ts';
import { fieldErrors } from '#lib/schemas/form.ts';
import { reviewSchema } from '#lib/schemas/review.ts';
import { loginUrl } from '#lib/server/redirect.ts';

export const load: PageServerLoad = async (event) => {
	const user = event.locals.user;
	if (!user) return redirect(302, loginUrl(event.url));
	if (!z.uuid().safeParse(event.params.id).success) error(404, 'Auftrag nicht gefunden');

	let order = await getOrderForUser(event.params.id, user.id);
	if (!order) error(404, 'Auftrag nicht gefunden');

	// Ask Stripe directly instead of waiting for the webhook: the customer may just be back from
	// Checkout, and locally no webhook arrives at all. Same for a payout that was held.
	const { status, stripeCheckoutSessionId, stripePaymentIntentId, stripeTransferId } = order.order;
	const needsPaymentSync = status === 'awaiting_payment' && stripeCheckoutSessionId;
	const heldPayout = status === 'completed' && stripePaymentIntentId && !stripeTransferId;
	if (needsPaymentSync || heldPayout) {
		try {
			if (needsPaymentSync) await syncPayment(order.order.id);
			else await releasePayout(order.order.id);
			order = (await getOrderForUser(event.params.id, user.id)) ?? order;
		} catch (e) {
			if (!(e instanceof DomainError)) throw e;
		}
	}

	const reviews = await getOrderReviews(order.order.id, user.id, order.order.completedAt);
	const o = order.order;
	return {
		...order,
		// Payment state for the price box, without handing Stripe IDs to the browser.
		order: {
			...o,
			stripeCheckoutSessionId: null,
			stripePaymentIntentId: null,
			stripeTransferId: null,
			stripeRefundId: null
		},
		payment: {
			viaStripe: Boolean(o.stripePaymentIntentId),
			refunded: Boolean(o.stripeRefundId),
			paidOut: Boolean(o.stripeTransferId),
			payoutHeld:
				o.status === 'completed' && Boolean(o.stripePaymentIntentId) && !o.stripeTransferId
		},
		paymentNotice: event.url.searchParams.get('zahlung'),
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
	pay: async (event) => {
		const user = event.locals.user;
		if (!user) return redirect(302, loginUrl(event.url));
		if (!z.uuid().safeParse(event.params.id).success)
			return fail(404, { message: 'Nicht gefunden.' });

		let url: string | null;
		try {
			url = await startPayment(event.params.id, user, event.url.origin);
		} catch (e) {
			return failOnDomainError(e);
		}
		return url ? redirect(303, url, STRIPE_CHECKOUT) : redirect(303, event.url.pathname);
	},
	tracking: (event) =>
		run(event, async (id, userId, f) => {
			const tracking = textField(f, 'outboundTracking', 100);
			if (tracking) await setOutboundTracking(id, userId, tracking);
		})
};

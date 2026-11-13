import { error } from '@sveltejs/kit';
import { z } from 'zod';
import type { Actions, PageServerLoad } from './$types';
import { DomainError } from '#lib/server/errors.ts';
import {
	confirmOwnPassword,
	field,
	forceOrderStatus,
	getOrderForAdmin,
	requireSuperAdmin,
	superAction
} from '#lib/server/superadmin.ts';
import { orderStatusLabels, type OrderStatus } from '#lib/status.ts';

export const load: PageServerLoad = async (event) => {
	requireSuperAdmin(event);
	if (!z.uuid().safeParse(event.params.id).success) error(404, 'Auftrag nicht gefunden');
	const found = await getOrderForAdmin(event.params.id);
	if (!found) error(404, 'Auftrag nicht gefunden');
	const o = found.order;
	return {
		...found,
		stripe: {
			paid: Boolean(o.stripePaymentIntentId),
			refunded: Boolean(o.stripeRefundId),
			paidOut: Boolean(o.stripeTransferId)
		}
	};
};

export const actions: Actions = {
	force: (event) =>
		superAction(event, async (actor, form) => {
			await confirmOwnPassword(event, field(form, 'ownPassword'));
			const to = field(form, 'status');
			if (!(to in orderStatusLabels)) throw new DomainError('Bitte einen Status wählen.');
			const note = await forceOrderStatus(
				actor.id,
				event.params.id,
				to as OrderStatus,
				form.get('withStripe') === 'on'
			);
			return `Status auf „${orderStatusLabels[to as OrderStatus]}“ gesetzt.${note ? ` ${note}.` : ''}`;
		})
};

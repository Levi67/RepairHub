import type { Actions, PageServerLoad } from './$types';
import { DomainError } from '#lib/server/errors.ts';
import {
	confirmOwnPassword,
	deleteTestAccounts,
	field,
	generateTestRequests,
	listUserOptions,
	requireSuperAdmin,
	superAction,
	wipeRequests
} from '#lib/server/superadmin.ts';

export const load: PageServerLoad = async (event) => {
	const me = requireSuperAdmin(event);
	return { users: await listUserOptions(), myId: me.id };
};

export const actions: Actions = {
	generate: (event) =>
		superAction(event, async (actor, form) => {
			const count = Number(field(form, 'count'));
			if (!Number.isInteger(count)) throw new DomainError('Bitte eine Anzahl angeben.');
			const ownerField = field(form, 'owner');
			const result = await generateTestRequests(
				actor.id,
				count,
				ownerField === 'pool' || !ownerField
					? { kind: 'pool' }
					: { kind: 'user', userId: ownerField }
			);
			return `${result.requests} Testanfragen mit ${result.quotes} Angeboten erzeugt.`;
		}),
	wipe: (event) =>
		superAction(event, async (actor, form) => {
			await confirmOwnPassword(event, field(form, 'ownPassword'));
			const scope = form.get('scope') === 'all' ? 'all' : 'test';
			const result = await wipeRequests(actor.id, scope, form.get('refund') === 'on');
			const refunds =
				result.refunds || result.refundErrors
					? ` ${result.refunds} Zahlungen erstattet${result.refundErrors ? `, ${result.refundErrors} fehlgeschlagen` : ''}.`
					: '';
			return `${result.requests} Anfragen gelöscht.${refunds}`;
		}),
	deleteAccounts: (event) =>
		superAction(event, async (actor) => {
			const n = await deleteTestAccounts(actor.id);
			return n ? `${n} Testkonten gelöscht.` : 'Es gab keine Testkonten.';
		})
};

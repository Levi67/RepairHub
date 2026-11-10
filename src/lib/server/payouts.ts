import { eq } from 'drizzle-orm';
import { db } from '#lib/server/db/index.ts';
import { repairerProfile } from '#lib/server/db/schema.ts';
import { DomainError } from '#lib/server/errors.ts';
import {
	callStripe,
	payoutAccountRequired,
	stripeEnabled,
	type Stripe
} from '#lib/server/stripe.ts';

// "Auszahlungen einrichten": each repairer gets a Stripe Connect account and goes through Stripe's
// hosted onboarding (Technical.md 3.8, 4.3). The spec makes it required for quoting; here that's
// only switched on with REQUIRE_PAYOUT_ACCOUNT=true, so the app can be tested without it.
//
// Accounts v2, as Stripe's integration plan recommends for a marketplace with separate charges and
// transfers: only the `recipient` configuration (receives transfers, no own payments), the Express
// Dashboard, and the platform pays Stripe's fees and carries losses.

export type PayoutStatus = (typeof repairerProfile.stripeStatus.enumValues)[number];

type StripeAccount = Stripe.V2.Core.Account;
type Db = Pick<typeof db, 'update'>;

/** Without `include`, Accounts v2 returns these parts as null. */
const ACCOUNT_INCLUDE: Stripe.V2.Core.AccountRetrieveParams.Include[] = [
	'configuration.recipient',
	'requirements'
];

/** Our status from the account's ability to receive transfers (`stripe_balance.stripe_transfers`). */
export function statusFromAccount(account: StripeAccount): PayoutStatus {
	const status =
		account.configuration?.recipient?.capabilities?.stripe_balance?.stripe_transfers?.status;
	if (status === 'active') return 'active';
	// Stripe turned the account down. (`restricted` only means information is still missing, which
	// is also the state of every new account before onboarding, so it counts as pending.)
	if (status === 'rejected' || status === 'unsupported') return 'restricted';
	return 'pending';
}

export async function getPayoutStatus(userId: string): Promise<PayoutStatus> {
	const row = await db.query.repairerProfile.findFirst({
		where: eq(repairerProfile.userId, userId)
	});
	return row?.stripeStatus ?? 'none';
}

/** Quotes need an active payout account only when that's switched on (see `payoutAccountRequired`). */
export async function canSendQuotes(userId: string): Promise<boolean> {
	if (!payoutAccountRequired) return true;
	return (await getPayoutStatus(userId)) === 'active';
}

async function retrieveAccount(accountId: string) {
	return callStripe((s) => s.v2.core.accounts.retrieve(accountId, { include: ACCOUNT_INCLUDE }));
}

/** Fetches a connected account from Stripe and stores its current status (webhook + page loads). */
export async function syncAccount(accountId: string, tx: Db = db) {
	const account = await retrieveAccount(accountId);
	const status = statusFromAccount(account);
	await tx
		.update(repairerProfile)
		.set({ stripeStatus: status })
		.where(eq(repairerProfile.stripeAccountId, accountId));
	return status;
}

/**
 * The repairer's payout state for the settings page. While onboarding isn't done, it asks Stripe
 * for the current state, so it's right even without the webhook (e.g. in local development).
 */
export async function getPayoutAccount(userId: string) {
	const row = await db.query.repairerProfile.findFirst({
		where: eq(repairerProfile.userId, userId)
	});
	if (!row?.stripeAccountId) return { status: 'none' as PayoutStatus, hasAccount: false };
	if (stripeEnabled && row.stripeStatus !== 'active') {
		try {
			return { status: await syncAccount(row.stripeAccountId), hasAccount: true };
		} catch (e) {
			// Stripe not reachable: show what we know instead of failing the page.
			if (!(e instanceof DomainError)) throw e;
		}
	}
	return { status: row.stripeStatus, hasAccount: true };
}

/**
 * Creates the connected account on first use and returns a link to Stripe's onboarding form.
 * `origin` is where Stripe sends the user back to.
 */
export async function startOnboarding(
	user: { id: string; email: string; name: string },
	origin: string
) {
	const accountId = await db.transaction(async (tx) => {
		await tx.insert(repairerProfile).values({ userId: user.id }).onConflictDoNothing();
		// Locked, so a double click can't create two Stripe accounts.
		const [row] = await tx
			.select()
			.from(repairerProfile)
			.where(eq(repairerProfile.userId, user.id))
			.for('update');
		if (row.stripeAccountId) return row.stripeAccountId;

		const account = await callStripe((s) =>
			s.v2.core.accounts.create(
				{
					contact_email: user.email,
					display_name: user.name,
					identity: { country: 'DE' },
					dashboard: 'express',
					// Separate charges and transfers: the platform is the merchant of record, pays Stripe's
					// fees and carries losses. Needs "loss liability" accepted in the Connect settings.
					defaults: {
						responsibilities: { fees_collector: 'application', losses_collector: 'application' },
						locales: ['de-DE']
					},
					// Only receives transfers (the payout minus commission), never takes payments itself.
					configuration: {
						recipient: {
							capabilities: { stripe_balance: { stripe_transfers: { requested: true } } }
						}
					},
					include: ACCOUNT_INCLUDE,
					metadata: { userId: user.id }
				},
				{ idempotencyKey: `connect-account-v2-${user.id}` }
			)
		);
		await tx
			.update(repairerProfile)
			.set({ stripeAccountId: account.id, stripeStatus: statusFromAccount(account) })
			.where(eq(repairerProfile.userId, user.id));
		return account.id;
	});

	const link = await callStripe((s) =>
		s.v2.core.accountLinks.create({
			account: accountId,
			use_case: {
				type: 'account_onboarding',
				account_onboarding: {
					// Links expire after a few minutes; Stripe sends people here to get a new one.
					refresh_url: `${origin}/profil/auszahlungen?neu=1`,
					return_url: `${origin}/profil/auszahlungen?zurueck=1`
				}
			}
		})
	);
	return link.url;
}

/** One-time login link to the Stripe Express dashboard (payouts, bank account). */
export async function dashboardLink(userId: string) {
	const row = await db.query.repairerProfile.findFirst({
		where: eq(repairerProfile.userId, userId)
	});
	if (!row?.stripeAccountId) return null;
	const accountId = row.stripeAccountId;
	const link = await callStripe((s) => s.accounts.createLoginLink(accountId));
	return link.url;
}

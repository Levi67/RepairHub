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

// "Auszahlungen einrichten": each repairer gets a Stripe Connect Express account and goes through
// Stripe's hosted onboarding (Technical.md 3.8, 4.3). The spec makes it required for quoting;
// here that's only switched on with REQUIRE_PAYOUT_ACCOUNT=true, so the app can be tested without it.

export type PayoutStatus = (typeof repairerProfile.stripeStatus.enumValues)[number];

type Db = Pick<typeof db, 'update'>;

/** Our status from Stripe's account: active once Stripe allows transfers and payouts to it. */
export function statusFromAccount(account: Stripe.Account): PayoutStatus {
	if (account.payouts_enabled && account.capabilities?.transfers === 'active') return 'active';
	// Onboarding was finished, but Stripe needs more or has blocked the account.
	if (account.details_submitted && account.requirements?.disabled_reason) return 'restricted';
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

/** Stores the latest status of a connected account (from the webhook or after returning). */
export async function syncAccount(account: Stripe.Account, tx: Db = db) {
	await tx
		.update(repairerProfile)
		.set({ stripeStatus: statusFromAccount(account) })
		.where(eq(repairerProfile.stripeAccountId, account.id));
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
			const account = await callStripe((s) => s.accounts.retrieve(row.stripeAccountId!));
			await syncAccount(account);
			return { status: statusFromAccount(account), hasAccount: true };
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
export async function startOnboarding(userId: string, email: string, origin: string) {
	const accountId = await db.transaction(async (tx) => {
		await tx.insert(repairerProfile).values({ userId }).onConflictDoNothing();
		// Locked, so a double click can't create two Stripe accounts.
		const [row] = await tx
			.select()
			.from(repairerProfile)
			.where(eq(repairerProfile.userId, userId))
			.for('update');
		if (row.stripeAccountId) return row.stripeAccountId;

		const account = await callStripe((s) =>
			s.accounts.create(
				{
					type: 'express',
					country: 'DE',
					email,
					// Separate charges and transfers: the platform takes the payment and later transfers
					// the payout, so the account only needs to receive transfers.
					capabilities: { transfers: { requested: true } },
					metadata: { userId }
				},
				{ idempotencyKey: `connect-account-${userId}` }
			)
		);
		await tx
			.update(repairerProfile)
			.set({ stripeAccountId: account.id, stripeStatus: statusFromAccount(account) })
			.where(eq(repairerProfile.userId, userId));
		return account.id;
	});

	const link = await callStripe((s) =>
		s.accountLinks.create({
			account: accountId,
			type: 'account_onboarding',
			// Links expire after a few minutes; `refresh_url` is where Stripe sends people to get a new one.
			refresh_url: `${origin}/profil/auszahlungen?neu=1`,
			return_url: `${origin}/profil/auszahlungen?zurueck=1`
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

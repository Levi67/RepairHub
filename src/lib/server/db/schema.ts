import { relations, sql } from 'drizzle-orm';
import {
	pgTable,
	pgEnum,
	uuid,
	text,
	integer,
	boolean,
	timestamp,
	index,
	uniqueIndex,
	check,
	customType,
	type AnyPgColumn
} from 'drizzle-orm/pg-core';
import { user } from './auth.schema';

export * from './auth.schema';

export const handoverMode = pgEnum('handover_mode', ['shipping', 'dropoff', 'onsite']);

export const requestStatus = pgEnum('request_status', ['open', 'assigned', 'closed', 'expired']);

export const requestTimeframe = pgEnum('request_timeframe', ['flexible', 'within_week', 'urgent']);

export const quoteStatus = pgEnum('quote_status', [
	'pending',
	'accepted',
	'rejected',
	'withdrawn',
	'expired'
]);

// Full lifecycle from Technical.md 3.6. `disputed` and `refunded` are unused until disputes (#53) exist.
export const orderStatus = pgEnum('order_status', [
	'awaiting_payment',
	'paid',
	'in_progress',
	'repaired',
	'completed',
	'cancelled',
	'disputed',
	'refunded'
]);

// Stripe Connect account state of a repairer (Technical.md 3.1, 4.3).
export const stripeAccountStatus = pgEnum('stripe_account_status', [
	'none',
	'pending',
	'active',
	'restricted'
]);

export const reviewDirection = pgEnum('review_direction', [
	'customer_to_repairer',
	'repairer_to_customer'
]);

export const category = pgTable('category', {
	id: uuid('id').primaryKey().defaultRandom(),
	parentId: uuid('parent_id').references((): AnyPgColumn => category.id),
	slug: text('slug').notNull().unique(),
	name: text('name').notNull(),
	sortOrder: integer('sort_order').notNull().default(0)
});

const bytea = customType<{ data: Uint8Array; driverData: Uint8Array }>({
	dataType: () => 'bytea'
});

// Profile pictures are small (256 px WebP, max 200 KB), so they live in Postgres until file
// storage exists. `user.image` points to /api/avatar/<userId>.
// PostGIS point in WGS 84. Only written and read through SQL (see geo.ts), never as a JS value.
const geography = customType<{ data: string; driverData: string }>({
	dataType: () => 'geography(Point, 4326)'
});

// German postcodes with the centre of their area (GeoNames, CC BY 4.0), filled by migration 0007.
// Every location in the app is a PLZ centre, never an exact address (Technical.md 3.11).
export const plz = pgTable(
	'plz',
	{
		plz: text('plz').primaryKey(),
		// The most common place name, used to fill in "Ort". `places` lists all places in the area.
		city: text('city').notNull(),
		places: text('places').array().notNull(),
		location: geography('location').notNull()
	},
	(table) => [index('plz_location_idx').using('gist', table.location)]
);

export const userAvatar = pgTable('user_avatar', {
	userId: text('user_id')
		.primaryKey()
		.references(() => user.id, { onDelete: 'cascade' }),
	contentType: text('content_type').notNull(),
	data: bytea('data').notNull(),
	updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull()
});

export const repairRequest = pgTable(
	'repair_request',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		customerId: text('customer_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		categoryId: uuid('category_id')
			.notNull()
			.references(() => category.id),
		title: text('title').notNull(),
		description: text('description').notNull(),
		brand: text('brand'),
		model: text('model'),
		budgetCents: integer('budget_cents'),
		timeframe: requestTimeframe('timeframe'),
		handoverModes: handoverMode('handover_modes').array().notNull(),
		plz: text('plz').notNull(),
		city: text('city').notNull(),
		// Centre of the PLZ, copied from the `plz` table on save. Null only for old unknown PLZs.
		location: geography('location'),
		status: requestStatus('status').notNull().default('open'),
		expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
		createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
		updatedAt: timestamp('updated_at', { withTimezone: true })
			.defaultNow()
			.$onUpdate(() => new Date())
			.notNull()
	},
	(table) => [
		index('repair_request_status_created_idx').on(table.status, table.createdAt),
		index('repair_request_customer_idx').on(table.customerId),
		index('repair_request_location_idx').using('gist', table.location)
	]
);

// Photos live in Supabase Storage; this table only keeps their paths (Technical.md 6.1).
export const requestImage = pgTable(
	'request_image',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		requestId: uuid('request_id')
			.notNull()
			.references(() => repairRequest.id, { onDelete: 'cascade' }),
		storagePath: text('storage_path').notNull().unique(),
		sortOrder: integer('sort_order').notNull().default(0),
		createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
	},
	(table) => [index('request_image_request_idx').on(table.requestId, table.sortOrder)]
);

const timestamps = {
	createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
	updatedAt: timestamp('updated_at', { withTimezone: true })
		.defaultNow()
		.$onUpdate(() => new Date())
		.notNull()
};

export const quote = pgTable(
	'quote',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		requestId: uuid('request_id')
			.notNull()
			.references(() => repairRequest.id, { onDelete: 'cascade' }),
		repairerId: text('repairer_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		priceCents: integer('price_cents').notNull(),
		estimatedDays: integer('estimated_days').notNull(),
		handoverMode: handoverMode('handover_mode').notNull(),
		includesReturnShipping: boolean('includes_return_shipping').notNull().default(false),
		message: text('message').notNull(),
		partsNote: text('parts_note'),
		status: quoteStatus('status').notNull().default('pending'),
		validUntil: timestamp('valid_until', { withTimezone: true }).notNull(),
		...timestamps
	},
	(table) => [
		// One active quote per repairer and request; withdrawn/rejected ones don't count.
		uniqueIndex('quote_one_pending_idx')
			.on(table.requestId, table.repairerId)
			.where(sql`${table.status} = 'pending'`),
		index('quote_repairer_idx').on(table.repairerId),
		check('quote_price_positive', sql`${table.priceCents} > 0`)
	]
);

export const order = pgTable(
	'order',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		requestId: uuid('request_id')
			.notNull()
			.references(() => repairRequest.id),
		quoteId: uuid('quote_id')
			.notNull()
			.unique()
			.references(() => quote.id),
		customerId: text('customer_id')
			.notNull()
			.references(() => user.id),
		repairerId: text('repairer_id')
			.notNull()
			.references(() => user.id),
		// Copied from the quote and config, so later changes don't affect the order.
		priceCents: integer('price_cents').notNull(),
		commissionRateBp: integer('commission_rate_bp').notNull(),
		commissionCents: integer('commission_cents').notNull(),
		payoutCents: integer('payout_cents').notNull(),
		handoverMode: handoverMode('handover_mode').notNull(),
		status: orderStatus('status').notNull(),
		outboundTracking: text('outbound_tracking'),
		returnTracking: text('return_tracking'),
		// Stripe (Technical.md 3.8). Orders from before payments existed have none of these.
		stripeCheckoutSessionId: text('stripe_checkout_session_id').unique(),
		stripePaymentIntentId: text('stripe_payment_intent_id'),
		// Set once the payout reached the repairer; a completed, Stripe-paid order without it is
		// held until the repairer's payout account is active.
		stripeTransferId: text('stripe_transfer_id'),
		stripeRefundId: text('stripe_refund_id'),
		paidAt: timestamp('paid_at', { withTimezone: true }),
		repairedAt: timestamp('repaired_at', { withTimezone: true }),
		completedAt: timestamp('completed_at', { withTimezone: true }),
		autoConfirmAt: timestamp('auto_confirm_at', { withTimezone: true }),
		...timestamps
	},
	(table) => [
		index('order_customer_idx').on(table.customerId),
		index('order_repairer_idx').on(table.repairerId),
		check('order_price_positive', sql`${table.priceCents} > 0`),
		check(
			'order_money_adds_up',
			sql`${table.commissionCents} + ${table.payoutCents} = ${table.priceCents}`
		)
	]
);

export const orderEvent = pgTable(
	'order_event',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		orderId: uuid('order_id')
			.notNull()
			.references(() => order.id, { onDelete: 'cascade' }),
		// null = system (e.g. auto-confirm)
		actorId: text('actor_id').references(() => user.id, { onDelete: 'set null' }),
		fromStatus: orderStatus('from_status'),
		toStatus: orderStatus('to_status').notNull(),
		note: text('note'),
		createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
	},
	(table) => [index('order_event_order_idx').on(table.orderId, table.createdAt)]
);

// One conversation per (request, repairer) pair (Technical.md 3.9).
export const conversation = pgTable(
	'conversation',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		requestId: uuid('request_id')
			.notNull()
			.references(() => repairRequest.id, { onDelete: 'cascade' }),
		customerId: text('customer_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		repairerId: text('repairer_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		customerLastReadAt: timestamp('customer_last_read_at', { withTimezone: true }),
		repairerLastReadAt: timestamp('repairer_last_read_at', { withTimezone: true }),
		lastMessageAt: timestamp('last_message_at', { withTimezone: true }),
		createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
	},
	(table) => [
		uniqueIndex('conversation_request_repairer_idx').on(table.requestId, table.repairerId),
		index('conversation_customer_idx').on(table.customerId),
		index('conversation_repairer_idx').on(table.repairerId)
	]
);

export const message = pgTable(
	'message',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		conversationId: uuid('conversation_id')
			.notNull()
			.references(() => conversation.id, { onDelete: 'cascade' }),
		senderId: text('sender_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		body: text('body').notNull(),
		// Looked like contact details before booking; kept for moderation.
		flaggedContactInfo: boolean('flagged_contact_info').notNull().default(false),
		createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
	},
	(table) => [index('message_conversation_idx').on(table.conversationId, table.createdAt)]
);

// Repairer side of an account. For now only the Stripe Connect part (#32); the profile fields
// from Technical.md 6.1 (kind, description, categories, radius, …) come with #30.
export const repairerProfile = pgTable('repairer_profile', {
	userId: text('user_id')
		.primaryKey()
		.references(() => user.id, { onDelete: 'cascade' }),
	stripeAccountId: text('stripe_account_id').unique(),
	stripeStatus: stripeAccountStatus('stripe_status').notNull().default('none'),
	...timestamps
});

// Every Stripe webhook event we handled, so a repeated delivery is skipped (Technical.md 8.2).
export const stripeEvent = pgTable('stripe_event', {
	id: text('id').primaryKey(),
	type: text('type').notNull(),
	processedAt: timestamp('processed_at', { withTimezone: true }).defaultNow().notNull()
});

// Reviews in both directions after a completed order (Technical.md 3.10). Hidden until both sides
// reviewed (`published_at` set on both) or the 14-day window after completion is over.
export const review = pgTable(
	'review',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		orderId: uuid('order_id')
			.notNull()
			.references(() => order.id, { onDelete: 'cascade' }),
		authorId: text('author_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		subjectId: text('subject_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		direction: reviewDirection('direction').notNull(),
		rating: integer('rating').notNull(),
		text: text('text'),
		publishedAt: timestamp('published_at', { withTimezone: true }),
		// Removed by an admin; stays in the table for the record.
		removedAt: timestamp('removed_at', { withTimezone: true }),
		createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
	},
	(table) => [
		uniqueIndex('review_order_direction_idx').on(table.orderId, table.direction),
		index('review_subject_idx').on(table.subjectId, table.direction),
		check('review_rating_range', sql`${table.rating} between 1 and 5`)
	]
);

export const categoryRelations = relations(category, ({ one, many }) => ({
	parent: one(category, {
		fields: [category.parentId],
		references: [category.id],
		relationName: 'parent'
	}),
	children: many(category, { relationName: 'parent' }),
	requests: many(repairRequest)
}));

export const repairRequestRelations = relations(repairRequest, ({ one, many }) => ({
	customer: one(user, { fields: [repairRequest.customerId], references: [user.id] }),
	category: one(category, { fields: [repairRequest.categoryId], references: [category.id] }),
	images: many(requestImage)
}));

export const requestImageRelations = relations(requestImage, ({ one }) => ({
	request: one(repairRequest, { fields: [requestImage.requestId], references: [repairRequest.id] })
}));

export const quoteRelations = relations(quote, ({ one }) => ({
	request: one(repairRequest, { fields: [quote.requestId], references: [repairRequest.id] }),
	repairer: one(user, { fields: [quote.repairerId], references: [user.id] })
}));

export const orderRelations = relations(order, ({ one, many }) => ({
	request: one(repairRequest, { fields: [order.requestId], references: [repairRequest.id] }),
	quote: one(quote, { fields: [order.quoteId], references: [quote.id] }),
	events: many(orderEvent)
}));

export const orderEventRelations = relations(orderEvent, ({ one }) => ({
	order: one(order, { fields: [orderEvent.orderId], references: [order.id] })
}));

export const conversationRelations = relations(conversation, ({ one, many }) => ({
	request: one(repairRequest, {
		fields: [conversation.requestId],
		references: [repairRequest.id]
	}),
	messages: many(message)
}));

export const messageRelations = relations(message, ({ one }) => ({
	conversation: one(conversation, {
		fields: [message.conversationId],
		references: [conversation.id]
	})
}));

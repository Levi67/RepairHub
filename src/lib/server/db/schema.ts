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
	type AnyPgColumn
} from 'drizzle-orm/pg-core';
import { user } from './auth.schema';

export * from './auth.schema';

export const handoverMode = pgEnum('handover_mode', ['shipping', 'dropoff', 'onsite']);

export const requestStatus = pgEnum('request_status', ['open', 'assigned', 'closed', 'expired']);

export const quoteStatus = pgEnum('quote_status', [
	'pending',
	'accepted',
	'rejected',
	'withdrawn',
	'expired'
]);

// Full lifecycle from Technical.md 3.6. `awaiting_payment`, `disputed` and `refunded` are unused until Stripe and the admin panel exist.
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

export const category = pgTable('category', {
	id: uuid('id').primaryKey().defaultRandom(),
	parentId: uuid('parent_id').references((): AnyPgColumn => category.id),
	slug: text('slug').notNull().unique(),
	name: text('name').notNull(),
	sortOrder: integer('sort_order').notNull().default(0)
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
		handoverModes: handoverMode('handover_modes').array().notNull(),
		plz: text('plz').notNull(),
		city: text('city').notNull(),
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
		index('repair_request_customer_idx').on(table.customerId)
	]
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

export const categoryRelations = relations(category, ({ one, many }) => ({
	parent: one(category, {
		fields: [category.parentId],
		references: [category.id],
		relationName: 'parent'
	}),
	children: many(category, { relationName: 'parent' }),
	requests: many(repairRequest)
}));

export const repairRequestRelations = relations(repairRequest, ({ one }) => ({
	customer: one(user, { fields: [repairRequest.customerId], references: [user.id] }),
	category: one(category, { fields: [repairRequest.categoryId], references: [category.id] })
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

import { relations } from 'drizzle-orm';
import {
	pgTable,
	pgEnum,
	uuid,
	text,
	integer,
	timestamp,
	index,
	type AnyPgColumn
} from 'drizzle-orm/pg-core';
import { user } from './auth.schema';

export * from './auth.schema';

export const handoverMode = pgEnum('handover_mode', ['shipping', 'dropoff', 'onsite']);

export const requestStatus = pgEnum('request_status', ['open', 'assigned', 'closed', 'expired']);

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

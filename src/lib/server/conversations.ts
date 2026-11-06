import { and, desc, eq, gte, inArray, or, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { db } from '#lib/server/db/index.ts';
import { conversation, message, order, repairRequest, user } from '#lib/server/db/schema.ts';
import { DomainError } from '#lib/server/errors.ts';
import { looksLikeContactInfo } from '#lib/contact.ts';

const MESSAGE_PAGE_SIZE = 200;

type Db = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

/** Returns the conversation for (request, repairer), creating it if needed. */
export async function ensureConversation(
	tx: Db,
	request: { id: string; customerId: string },
	repairerId: string
): Promise<string> {
	await tx
		.insert(conversation)
		.values({ requestId: request.id, customerId: request.customerId, repairerId })
		.onConflictDoNothing({ target: [conversation.requestId, conversation.repairerId] });
	const [row] = await tx
		.select({ id: conversation.id })
		.from(conversation)
		.where(and(eq(conversation.requestId, request.id), eq(conversation.repairerId, repairerId)));
	return row.id;
}

/** A repairer opens a chat on a request, e.g. to ask a question before quoting. */
export async function startConversation(repairerId: string, requestId: string) {
	const request = await db.query.repairRequest.findFirst({
		where: eq(repairRequest.id, requestId)
	});
	if (!request) throw new DomainError('Anfrage nicht gefunden.');
	if (request.customerId === repairerId) {
		throw new DomainError('Das ist deine eigene Anfrage.');
	}

	const existing = await getConversationIdFor(requestId, repairerId);
	if (existing) return existing;

	if (request.status !== 'open' || request.expiresAt <= new Date()) {
		throw new DomainError('Diese Anfrage ist nicht mehr offen.');
	}
	return ensureConversation(db, request, repairerId);
}

export async function getConversationIdFor(requestId: string, repairerId: string) {
	const [row] = await db
		.select({ id: conversation.id })
		.from(conversation)
		.where(and(eq(conversation.requestId, requestId), eq(conversation.repairerId, repairerId)));
	return row?.id ?? null;
}

const isParticipant = (userId: string) =>
	or(eq(conversation.customerId, userId), eq(conversation.repairerId, userId));

/** Booked = an order between the two exists that got past payment. Then contact details are fine. */
const bookedStatuses = [
	'paid',
	'in_progress',
	'repaired',
	'completed',
	'disputed',
	'refunded'
] as const;

async function findBookedOrderId(requestId: string, repairerId: string) {
	const [row] = await db
		.select({ id: order.id })
		.from(order)
		.where(
			and(
				eq(order.requestId, requestId),
				eq(order.repairerId, repairerId),
				inArray(order.status, [...bookedStatuses])
			)
		)
		.orderBy(desc(order.createdAt))
		.limit(1);
	return row?.id ?? null;
}

const customer = alias(user, 'customer');
const repairer = alias(user, 'repairer');

/** Conversation header data, or null if it doesn't exist or the user isn't part of it. */
export async function getConversationForUser(conversationId: string, userId: string) {
	const [row] = await db
		.select({
			id: conversation.id,
			requestId: conversation.requestId,
			repairerId: conversation.repairerId,
			customerId: conversation.customerId,
			requestTitle: repairRequest.title,
			customerName: customer.name,
			repairerName: repairer.name,
			customerImage: customer.image,
			repairerImage: repairer.image
		})
		.from(conversation)
		.innerJoin(repairRequest, eq(conversation.requestId, repairRequest.id))
		.innerJoin(customer, eq(conversation.customerId, customer.id))
		.innerJoin(repairer, eq(conversation.repairerId, repairer.id))
		.where(and(eq(conversation.id, conversationId), isParticipant(userId)));
	if (!row) return null;

	const role = row.customerId === userId ? ('customer' as const) : ('repairer' as const);
	return {
		id: row.id,
		requestId: row.requestId,
		requestTitle: row.requestTitle,
		role,
		otherPartyId: role === 'customer' ? row.repairerId : row.customerId,
		otherPartyName: role === 'customer' ? row.repairerName : row.customerName,
		otherPartyImage: role === 'customer' ? row.repairerImage : row.customerImage,
		bookedOrderId: await findBookedOrderId(row.requestId, row.repairerId)
	};
}

/**
 * Messages of a conversation, oldest first. With `after`, only those at or after that time
 * (for polling; inclusive so same-millisecond messages aren't lost, the client skips known IDs).
 */
export async function listMessages(conversationId: string, after?: Date) {
	const rows = await db
		.select({
			id: message.id,
			senderId: message.senderId,
			body: message.body,
			createdAt: message.createdAt
		})
		.from(message)
		.where(
			and(
				eq(message.conversationId, conversationId),
				after ? gte(message.createdAt, after) : undefined
			)
		)
		.orderBy(desc(message.createdAt))
		.limit(MESSAGE_PAGE_SIZE);
	return rows.reverse();
}

export async function sendMessage(conversationId: string, senderId: string, body: string) {
	const convo = await getConversationForUser(conversationId, senderId);
	if (!convo) throw new DomainError('Unterhaltung nicht gefunden.');

	const now = new Date();
	await db.transaction(async (tx) => {
		await tx.insert(message).values({
			conversationId,
			senderId,
			body,
			flaggedContactInfo: !convo.bookedOrderId && looksLikeContactInfo(body),
			createdAt: now
		});
		await tx
			.update(conversation)
			.set({
				lastMessageAt: now,
				// Your own message counts as read.
				...(convo.role === 'customer' ? { customerLastReadAt: now } : { repairerLastReadAt: now })
			})
			.where(eq(conversation.id, conversationId));
	});
}

export async function markRead(conversationId: string, userId: string) {
	const now = new Date();
	await db
		.update(conversation)
		.set({ customerLastReadAt: now })
		.where(and(eq(conversation.id, conversationId), eq(conversation.customerId, userId)));
	await db
		.update(conversation)
		.set({ repairerLastReadAt: now })
		.where(and(eq(conversation.id, conversationId), eq(conversation.repairerId, userId)));
}

/** Messages from the other side that arrived after the user's last visit. */
const unreadCount = (userId: string) => sql<number>`(
	select count(*)::int from ${message}
	where ${message.conversationId} = ${conversation.id}
		and ${message.senderId} <> ${userId}
		and ${message.createdAt} > coalesce(
			case when ${conversation.customerId} = ${userId}
				then ${conversation.customerLastReadAt}
				else ${conversation.repairerLastReadAt} end,
			'epoch')
)`;

export async function listConversationsForUser(userId: string) {
	const rows = await db
		.select({
			id: conversation.id,
			customerId: conversation.customerId,
			requestTitle: repairRequest.title,
			customerName: customer.name,
			repairerName: repairer.name,
			lastMessageAt: conversation.lastMessageAt,
			createdAt: conversation.createdAt,
			lastBody: sql<string | null>`(
				select ${message.body} from ${message}
				where ${message.conversationId} = ${conversation.id}
				order by ${message.createdAt} desc limit 1
			)`,
			unread: unreadCount(userId)
		})
		.from(conversation)
		.innerJoin(repairRequest, eq(conversation.requestId, repairRequest.id))
		.innerJoin(customer, eq(conversation.customerId, customer.id))
		.innerJoin(repairer, eq(conversation.repairerId, repairer.id))
		.where(isParticipant(userId))
		.orderBy(sql`coalesce(${conversation.lastMessageAt}, ${conversation.createdAt}) desc`);

	return rows.map(({ customerId, customerName, repairerName, ...row }) => ({
		...row,
		otherPartyName: customerId === userId ? repairerName : customerName
	}));
}

export async function countUnreadMessages(userId: string): Promise<number> {
	const [row] = await db
		.select({ total: sql<number>`coalesce(sum(${unreadCount(userId)}), 0)::int` })
		.from(conversation)
		.where(isParticipant(userId));
	return row?.total ?? 0;
}

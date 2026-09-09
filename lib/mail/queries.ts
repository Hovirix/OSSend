import { and, desc, eq, inArray } from "drizzle-orm";

import { db } from "@/db";
import { mailboxes, messageRecipients, messages, threads } from "@/db/schema";

import type { MailSummary, MailThreadData } from "./types";

function formatTimestamp(date: Date) {
	return new Intl.DateTimeFormat("en", {
		month: "short",
		day: "numeric",
		hour: "numeric",
		minute: "2-digit",
	}).format(date);
}

async function recipientsForMessages(messageIds: string[]) {
	if (!messageIds.length) {
		return new Map<string, string>();
	}

	const rows = await db
		.select()
		.from(messageRecipients)
		.where(inArray(messageRecipients.messageId, messageIds));
	const recipients = new Map<string, string[]>();
	for (const row of rows) {
		const addresses = recipients.get(row.messageId) ?? [];
		addresses.push(row.address);
		recipients.set(row.messageId, addresses);
	}

	return new Map(
		[...recipients].map(([messageId, addresses]) => [
			messageId,
			addresses.join(", "),
		]),
	);
}

export async function getSentMessages(userId: string): Promise<MailSummary[]> {
	const rows = await db
		.select({ message: messages, thread: threads, mailbox: mailboxes })
		.from(messages)
		.innerJoin(threads, eq(messages.threadId, threads.id))
		.innerJoin(mailboxes, eq(messages.mailboxId, mailboxes.id))
		.where(
			and(eq(mailboxes.userId, userId), eq(messages.direction, "outbound")),
		)
		.orderBy(desc(messages.sentAt));

	return rows.map(({ message, thread, mailbox }) => ({
		id: thread.id,
		senderName: "You",
		senderEmail: mailbox.address,
		subject: thread.subject,
		preview: message.bodyText ?? "",
		timestamp: formatTimestamp(message.sentAt),
		unread: false,
		messageCount: 1,
		hasAttachment: false,
	}));
}

export async function getThreadForUser(
	userId: string,
	threadId: string,
): Promise<MailThreadData | null> {
	const [threadRow] = await db
		.select({ thread: threads, mailbox: mailboxes })
		.from(threads)
		.innerJoin(mailboxes, eq(threads.mailboxId, mailboxes.id))
		.where(and(eq(threads.id, threadId), eq(mailboxes.userId, userId)))
		.limit(1);
	if (!threadRow) {
		return null;
	}

	const messageRows = await db
		.select()
		.from(messages)
		.where(eq(messages.threadId, threadId))
		.orderBy(messages.sentAt);
	const recipients = await recipientsForMessages(
		messageRows.map((message) => message.id),
	);

	return {
		id: threadRow.thread.id,
		senderName: "You",
		senderEmail: threadRow.mailbox.address,
		subject: threadRow.thread.subject,
		preview: threadRow.thread.preview ?? "",
		timestamp: formatTimestamp(threadRow.thread.lastMessageAt),
		unread: false,
		messageCount: messageRows.length,
		messages: messageRows.map((message) => ({
			id: message.id,
			senderName:
				message.direction === "outbound"
					? "You"
					: (message.fromName ?? message.fromAddress),
			senderEmail: message.fromAddress,
			recipients: recipients.get(message.id) ?? "",
			timestamp: formatTimestamp(message.sentAt),
			body: message.bodyText ?? "",
			isCurrentUser: message.direction === "outbound",
			deliveryStatus:
				message.direction === "outbound"
					? message.status === "failed"
						? `Failed: ${message.failureReason ?? "Delivery failed"}`
						: message.status === "pending"
							? "Sending"
							: "Sent"
					: undefined,
		})),
	};
}

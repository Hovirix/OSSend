import { and, desc, eq, inArray, isNull } from "drizzle-orm";

import { db } from "@/db";
import {
	attachments,
	mailboxes,
	messageRecipients,
	messages,
	threads,
} from "@/db/schema";

import type {
	IncomingMessage,
	MailSummary,
	MailThreadData,
} from "@/lib/mail/types";

function formatTimestamp(date: Date) {
	return new Intl.DateTimeFormat("en", {
		month: "short",
		day: "numeric",
		hour: "numeric",
		minute: "2-digit",
	}).format(date);
}

function formatFileSize(size: number) {
	if (size < 1024) {
		return `${size} B`;
	}
	if (size < 1024 * 1024) {
		return `${Math.round(size / 1024)} KB`;
	}
	return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function messageBody(message: typeof messages.$inferSelect) {
	return (message.bodyText ?? message.bodyHtml?.replace(/<[^>]*>/g, " ") ?? "")
		.replace(/\s+/g, " ")
		.trim();
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

async function attachmentsForMessages(messageIds: string[]) {
	if (!messageIds.length) {
		return new Map<string, { name: string; size: string }[]>();
	}

	const rows = await db
		.select()
		.from(attachments)
		.where(inArray(attachments.messageId, messageIds));
	const attachmentMap = new Map<string, { name: string; size: string }[]>();
	for (const attachment of rows) {
		const values = attachmentMap.get(attachment.messageId) ?? [];
		values.push({
			name: attachment.filename,
			size: formatFileSize(attachment.size),
		});
		attachmentMap.set(attachment.messageId, values);
	}

	return attachmentMap;
}

function emailAddress(value: string) {
	const match = value.match(/<([^<>]+)>/);
	return (match?.[1] ?? value).trim().toLowerCase();
}

function sender(value: string, fallbackAddress: string) {
	const match = value.match(/^\s*(.*?)\s*<([^<>]+)>\s*$/);
	if (!match) {
		return { name: fallbackAddress, address: fallbackAddress };
	}

	return {
		name: match[1].trim().replace(/^"|"$/g, "") || fallbackAddress,
		address: emailAddress(match[2]),
	};
}

function header(headers: Record<string, string>, name: string) {
	const normalizedName = name.toLowerCase();
	return Object.entries(headers).find(
		([key]) => key.toLowerCase() === normalizedName,
	)?.[1];
}

function messageIds(...values: Array<string | undefined>) {
	return [
		...new Set(values.flatMap((value) => value?.match(/<[^<>]+>/g) ?? [])),
	];
}

function incomingPreview(email: IncomingMessage) {
	return (email.text ?? email.html?.replace(/<[^>]*>/g, " ") ?? "")
		.replace(/\s+/g, " ")
		.trim()
		.slice(0, 160);
}

export type ReceiveInboundEmailResult =
	| { status: "duplicate" | "unknown-mailbox" | "received" }
	| { status: "invalid-email" };

export async function persistIncomingMessage(
	email: IncomingMessage,
): Promise<ReceiveInboundEmailResult> {
	const [existingMessage] = await db
		.select({ id: messages.id })
		.from(messages)
		.where(eq(messages.providerMessageId, email.externalId))
		.limit(1);
	if (existingMessage) {
		return { status: "duplicate" };
	}

	if (!email.externalId || Number.isNaN(email.receivedAt.valueOf())) {
		return { status: "invalid-email" };
	}

	const recipients = [
		...new Set([...email.to, ...email.cc, ...email.bcc].map(emailAddress)),
	];
	const [mailbox] = await db
		.select()
		.from(mailboxes)
		.where(inArray(mailboxes.address, recipients))
		.limit(1);
	if (!mailbox) {
		console.warn("Received email for an unknown mailbox", {
			externalId: email.externalId,
		});
		return { status: "unknown-mailbox" };
	}

	const inReplyTo = header(email.headers, "in-reply-to");
	const referencesHeader = header(email.headers, "references");
	const references = messageIds(inReplyTo, referencesHeader);
	const [existingThread] = references.length
		? await db
				.select({ id: threads.id })
				.from(messages)
				.innerJoin(threads, eq(messages.threadId, threads.id))
				.where(
					and(
						eq(messages.mailboxId, mailbox.id),
						inArray(messages.messageId, references),
					),
				)
				.orderBy(desc(messages.sentAt))
				.limit(1)
		: [];

	const messageId = crypto.randomUUID();
	const createdThreadId = existingThread ? null : crypto.randomUUID();
	const threadId = existingThread?.id ?? createdThreadId;
	if (!threadId) {
		return { status: "invalid-email" };
	}

	const fromAddress = emailAddress(email.from);
	if (!fromAddress) {
		return { status: "invalid-email" };
	}
	const from = sender(header(email.headers, "from") ?? email.from, fromAddress);
	const recipientValues = [
		...email.to.map((address) => ({
			messageId,
			type: "to",
			address: emailAddress(address),
		})),
		...email.cc.map((address) => ({
			messageId,
			type: "cc",
			address: emailAddress(address),
		})),
		...email.bcc.map((address) => ({
			messageId,
			type: "bcc",
			address: emailAddress(address),
		})),
	].filter(
		(recipient, index, all) =>
			Boolean(recipient.address) &&
			all.findIndex(
				(value) =>
					value.type === recipient.type && value.address === recipient.address,
			) === index,
	);
	const emailPreview = incomingPreview(email);
	let inserted = false;

	await db.transaction(async (tx) => {
		if (createdThreadId) {
			await tx.insert(threads).values({
				id: createdThreadId,
				mailboxId: mailbox.id,
				subject: email.subject,
				preview: emailPreview,
				lastMessageAt: email.receivedAt,
			});
		}

		const [message] = await tx
			.insert(messages)
			.values({
				id: messageId,
				threadId,
				mailboxId: mailbox.id,
				direction: "inbound",
				status: "received",
				fromName: from.name,
				fromAddress: from.address,
				toAddress: recipientValues.find((recipient) => recipient.type === "to")
					?.address,
				bodyText: email.text,
				bodyHtml: email.html,
				messageId: email.messageId,
				inReplyTo,
				referencesHeader,
				providerMessageId: email.externalId,
				sentAt: email.receivedAt,
				receivedAt: email.receivedAt,
			})
			.onConflictDoNothing()
			.returning({ id: messages.id });
		if (!message) {
			if (createdThreadId) {
				await tx.delete(threads).where(eq(threads.id, createdThreadId));
			}
			return;
		}

		inserted = true;
		if (recipientValues.length) {
			await tx.insert(messageRecipients).values(recipientValues);
		}
		if (email.attachments.length) {
			await tx.insert(attachments).values(
				email.attachments.map((attachment) => ({
					id: `${email.externalId}:${attachment.id}`,
					messageId,
					filename: attachment.filename ?? "attachment",
					contentType: attachment.contentType,
					size: attachment.size,
					storageKey: `provider/${email.externalId}/${attachment.id}`,
				})),
			);
		}
		await tx
			.update(threads)
			.set({ preview: emailPreview, lastMessageAt: email.receivedAt })
			.where(eq(threads.id, threadId));
	});

	return { status: inserted ? "received" : "duplicate" };
}

export async function getInboxThreads(userId: string): Promise<MailSummary[]> {
	const rows = await db
		.select({ message: messages, thread: threads, mailbox: mailboxes })
		.from(messages)
		.innerJoin(threads, eq(messages.threadId, threads.id))
		.innerJoin(mailboxes, eq(messages.mailboxId, mailboxes.id))
		.where(and(eq(mailboxes.userId, userId), isNull(threads.archivedAt)))
		.orderBy(desc(messages.sentAt));
	const attachmentMap = await attachmentsForMessages(
		rows.map(({ message }) => message.id),
	);
	const byThread = new Map<string, typeof rows>();
	for (const row of rows) {
		const threadRows = byThread.get(row.thread.id) ?? [];
		threadRows.push(row);
		byThread.set(row.thread.id, threadRows);
	}

	return [...byThread.values()]
		.filter((threadRows) =>
			threadRows.some(({ message }) => message.direction === "inbound"),
		)
		.map((threadRows) => {
			const [{ thread }] = threadRows;
			const latestMessage = threadRows[0].message;
			const latestInbound = threadRows.find(
				({ message }) => message.direction === "inbound",
			)?.message;
			const sender = latestInbound ?? latestMessage;

			return {
				id: thread.id,
				senderName: sender.fromName ?? sender.fromAddress,
				senderEmail: sender.fromAddress,
				subject: thread.subject,
				preview: messageBody(latestMessage),
				timestamp: formatTimestamp(latestMessage.sentAt),
				unread: threadRows.some(
					({ message }) =>
						message.direction === "inbound" && message.readAt === null,
				),
				messageCount: threadRows.length,
				hasAttachment: threadRows.some(({ message }) =>
					attachmentMap.has(message.id),
				),
			};
		});
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
		preview: messageBody(message),
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
	const attachmentMap = await attachmentsForMessages(
		messageRows.map((message) => message.id),
	);
	const latestMessage = messageRows.at(-1);
	const latestInbound = [...messageRows]
		.reverse()
		.find((message) => message.direction === "inbound");
	const sender = latestInbound ?? latestMessage;

	return {
		id: threadRow.thread.id,
		senderName: sender?.fromName ?? sender?.fromAddress ?? "You",
		senderEmail: sender?.fromAddress ?? threadRow.mailbox.address,
		subject: threadRow.thread.subject,
		preview: threadRow.thread.preview ?? "",
		timestamp: formatTimestamp(threadRow.thread.lastMessageAt),
		unread: messageRows.some(
			(message) => message.direction === "inbound" && message.readAt === null,
		),
		messageCount: messageRows.length,
		hasAttachment: messageRows.some((message) => attachmentMap.has(message.id)),
		messages: messageRows.map((message) => ({
			id: message.id,
			senderName:
				message.direction === "outbound"
					? "You"
					: (message.fromName ?? message.fromAddress),
			senderEmail: message.fromAddress,
			recipients: recipients.get(message.id) ?? "",
			timestamp: formatTimestamp(message.sentAt),
			body: messageBody(message),
			isCurrentUser: message.direction === "outbound",
			attachments: attachmentMap.get(message.id),
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

import { and, desc, eq, inArray, isNull } from "drizzle-orm";

import { db } from "@/db";
import { addresses, attachments, domains, messageAddresses, messageProviderRefs, messages, threads } from "@/db/schema";
import type { IncomingMessage, MailSummary, MailThreadData } from "@/lib/mail/types";

function formatTimestamp(date: Date) { return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(date); }
function formatFileSize(size: number) { return size < 1024 ? `${size} B` : size < 1024 * 1024 ? `${Math.round(size / 1024)} KB` : `${(size / (1024 * 1024)).toFixed(1)} MB`; }
function emailAddress(value: string) { return (value.match(/<([^<>]+)>/)?.[1] ?? value).trim().toLowerCase(); }
function header(headers: Record<string, string>, name: string) { return Object.entries(headers).find(([key]) => key.toLowerCase() === name)?.[1]; }
function headerIds(value?: string) { return value?.match(/<[^<>]+>/g) ?? []; }

export type ReceiveInboundEmailResult = { status: "duplicate" | "unknown-mailbox" | "received" } | { status: "invalid-email" };

export async function persistIncomingMessage(email: IncomingMessage): Promise<ReceiveInboundEmailResult> {
	if (!email.externalId || Number.isNaN(email.receivedAt.valueOf())) return { status: "invalid-email" };
	const [existing] = await db.select({ id: messageProviderRefs.id }).from(messageProviderRefs).where(and(eq(messageProviderRefs.provider, "resend"), eq(messageProviderRefs.direction, "inbound"), eq(messageProviderRefs.externalId, email.externalId))).limit(1);
	if (existing) return { status: "duplicate" };
	const hostedAddresses = await db.select({ id: addresses.id, userId: addresses.userId, localPart: addresses.localPart, domainName: domains.name }).from(addresses).innerJoin(domains, eq(addresses.domainId, domains.id)).where(eq(addresses.isEnabled, true));
	const recipientEmails = new Set([...email.to, ...email.cc, ...email.bcc].map(emailAddress));
	const localAddress = hostedAddresses.find((address) => recipientEmails.has(`${address.localPart}@${address.domainName}`));
	if (!localAddress) return { status: "unknown-mailbox" };

	const inReplyTo = header(email.headers, "in-reply-to");
	const references = headerIds(header(email.headers, "references"));
	const candidates = [inReplyTo, ...[...references].reverse()].filter((id): id is string => Boolean(id));
	const known = candidates.length ? await db.select({ id: messages.id, threadId: messages.threadId, internetMessageId: messages.internetMessageId }).from(messages).where(and(eq(messages.userId, localAddress.userId), inArray(messages.internetMessageId, candidates))) : [];
	const parent = candidates.map((candidate) => known.find((message) => message.internetMessageId === candidate)).find(Boolean);
	const threadId = parent?.threadId ?? crypto.randomUUID();
	const messageId = crypto.randomUUID();
	const fromEmail = emailAddress(email.from);
	if (!fromEmail) return { status: "invalid-email" };
	const fromHeader = header(email.headers, "from") ?? email.from;
	const fromName = fromHeader.match(/^\s*(.*?)\s*<[^<>]+>\s*$/)?.[1]?.trim().replace(/^"|"$/g, "") || null;
	const recipientRows = [["to", email.to], ["cc", email.cc], ["bcc", email.bcc]] as const;

	try {
		await db.transaction(async (tx) => {
			if (!parent?.threadId) await tx.insert(threads).values({ id: threadId, userId: localAddress.userId, lastMessageAt: email.receivedAt });
			await tx.insert(messages).values({ id: messageId, userId: localAddress.userId, threadId, parentMessageId: parent?.id, isInbound: true, fromName, fromEmail, subject: email.subject, textBody: email.text, htmlRaw: email.html, snippet: (email.text ?? "").replace(/\s+/g, " ").slice(0, 160), internetMessageId: email.messageId, inReplyTo, references, searchText: `${email.subject} ${fromName ?? ""} ${fromEmail} ${[...email.to, ...email.cc, ...email.bcc].join(" ")} ${email.text ?? ""}`, receivedAt: email.receivedAt });
			await tx.insert(messageProviderRefs).values({ id: crypto.randomUUID(), messageId, provider: "resend", direction: "inbound", externalId: email.externalId });
			const recipients = recipientRows.flatMap(([role, values]) => values.map((value, position) => ({ id: crypto.randomUUID(), messageId, role, email: emailAddress(value), position }))).filter((recipient) => Boolean(recipient.email));
			if (recipients.length) await tx.insert(messageAddresses).values(recipients);
			await tx.update(threads).set({ lastMessageAt: email.receivedAt, updatedAt: new Date() }).where(eq(threads.id, threadId));
		});
	} catch { return { status: "duplicate" }; }
	return { status: "received" };
}

async function attachmentsForMessages(messageIds: string[]) {
	if (!messageIds.length) return new Map<string, { name: string; size: string }[]>();
	const rows = await db.select().from(attachments).where(inArray(attachments.messageId, messageIds));
	return Map.groupBy(rows.map((row) => ({ messageId: row.messageId, name: row.filename, size: formatFileSize(row.sizeBytes) })), (row) => row.messageId) as Map<string, { name: string; size: string }[]>;
}

export async function getInboxThreads(userId: string): Promise<MailSummary[]> {
	const rows = await db.select({ message: messages, thread: threads }).from(messages).innerJoin(threads, eq(messages.threadId, threads.id)).where(and(eq(messages.userId, userId), eq(messages.isInbound, true), isNull(messages.archivedAt), isNull(messages.trashedAt))).orderBy(desc(messages.receivedAt));
	const grouped = Map.groupBy(rows, (row) => row.thread.id);
	const attachmentMap = await attachmentsForMessages(rows.map((row) => row.message.id));
	return [...grouped.values()].map((threadRows) => { const latest = threadRows[0].message; return { id: threadRows[0].thread.id, senderName: latest.fromName ?? latest.fromEmail, senderEmail: latest.fromEmail, subject: latest.subject, preview: latest.snippet, timestamp: formatTimestamp(latest.receivedAt ?? latest.createdAt), unread: threadRows.some((row) => row.message.readAt === null), messageCount: threadRows.length, hasAttachment: threadRows.some((row) => attachmentMap.has(row.message.id)) }; });
}

export async function getSentMessages(userId: string): Promise<MailSummary[]> {
	const rows = await db.select({ message: messages }).from(messages).where(and(eq(messages.userId, userId), eq(messages.outboundStatus, "sent"), isNull(messages.trashedAt))).orderBy(desc(messages.sentAt));
	return rows.map(({ message }) => ({ id: message.threadId ?? message.id, senderName: "You", senderEmail: message.fromEmail, subject: message.subject, preview: message.snippet, timestamp: formatTimestamp(message.sentAt ?? message.createdAt), unread: false, messageCount: 1, hasAttachment: false }));
}

export async function getThreadForUser(userId: string, threadId: string): Promise<MailThreadData | null> {
	const [thread] = await db.select().from(threads).where(and(eq(threads.id, threadId), eq(threads.userId, userId))).limit(1);
	if (!thread) return null;
	const rows = await db.select().from(messages).where(and(eq(messages.threadId, threadId), eq(messages.userId, userId))).orderBy(messages.createdAt);
	const recipients = await db.select().from(messageAddresses).where(inArray(messageAddresses.messageId, rows.map((row) => row.id)));
	const recipientsByMessage = Map.groupBy(recipients, (recipient) => recipient.messageId);
	const attachmentMap = await attachmentsForMessages(rows.map((row) => row.id));
	const latest = rows.at(-1);
	if (!latest) return null;
	return { id: thread.id, senderName: latest.fromName ?? latest.fromEmail, senderEmail: latest.fromEmail, subject: latest.subject, preview: latest.snippet, timestamp: formatTimestamp(thread.lastMessageAt), unread: rows.some((row) => row.isInbound && row.readAt === null), messageCount: rows.length, hasAttachment: rows.some((row) => attachmentMap.has(row.id)), messages: rows.map((message) => ({ id: message.id, senderName: message.isInbound ? (message.fromName ?? message.fromEmail) : "You", senderEmail: message.fromEmail, recipients: (recipientsByMessage.get(message.id) ?? []).map((recipient) => recipient.email).join(", "), timestamp: formatTimestamp(message.sentAt ?? message.receivedAt ?? message.createdAt), body: message.textBody ?? "", isCurrentUser: !message.isInbound, attachments: attachmentMap.get(message.id), deliveryStatus: message.outboundStatus === "failed" ? `Failed: ${message.lastSendError ?? "Delivery failed"}` : message.outboundStatus === "sending" ? "Sending" : message.outboundStatus === "sent" ? "Sent" : undefined })) };
}

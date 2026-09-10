import { and, eq, inArray } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import { createId } from "@/db/ids";
import { ownedMessage } from "@/db/ownership";
import { addresses, attachments, domains, messageAddresses, messageProviderRefs, messages, threads } from "@/db/schema";
import { attachmentBlobKey, type BlobStorage } from "@/lib/storage/types";

import { normalizedOutgoingMessageSchema, type MailAddress } from "./contracts";
import { getOutboundTransport } from "./outbound/provider";
import { replyAllRecipients, replyRecipients } from "./outbound/recipients";
import type { OutboundTransport } from "./transports";

const recipientInput = z.array(z.object({ email: z.string().trim().toLowerCase().pipe(z.email()), name: z.string().trim().min(1).max(320).optional() })).max(200).default([]);
const draftInputSchema = z.object({
	sendingAddressId: z.string().uuid(), to: recipientInput, cc: recipientInput, bcc: recipientInput,
	subject: z.string().max(998).default(""), textBody: z.string().max(1_000_000).default(""), htmlBody: z.string().max(1_000_000).optional(),
});

export class DraftError extends Error {
	constructor(message: string, readonly kind: "not-found" | "conflict" | "validation" | "provider" = "validation") { super(message); }
}

function parse(input: unknown) {
	const result = draftInputSchema.safeParse(input);
	if (!result.success) throw new DraftError(result.error.issues[0]?.message ?? "Invalid draft.");
	return result.data;
}
function textHtml(value: string) { return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll("\n", "<br />"); }
function recipientRows(messageId: string, input: ReturnType<typeof parse>) {
	return (["to", "cc", "bcc"] as const).flatMap((role) => input[role].map((recipient, position) => ({ id: createId(), messageId, role, email: recipient.email, name: recipient.name, position })));
}
async function sender(userId: string, addressId: string) {
	const [row] = await db.select({ id: addresses.id, displayName: addresses.displayName, localPart: addresses.localPart, domainName: domains.name })
		.from(addresses).innerJoin(domains, eq(addresses.domainId, domains.id))
		.where(and(eq(addresses.id, addressId), eq(addresses.userId, userId), eq(addresses.isEnabled, true), eq(domains.status, "verified"))).limit(1);
	if (!row) throw new DraftError("Choose an enabled address on a verified domain.", "conflict");
	return row;
}
export async function getDraft(userId: string, messageId: string) {
	const [message] = await db.select().from(messages).where(and(ownedMessage(userId, messageId), inArray(messages.outboundStatus, ["draft", "failed"]))).limit(1);
	return message ?? null;
}
export async function listDrafts(userId: string) { return db.select().from(messages).where(and(eq(messages.userId, userId), inArray(messages.outboundStatus, ["draft", "failed"]))).orderBy(messages.updatedAt); }
export async function createDraft(userId: string, input: unknown) {
	const value = parse(input); const sending = await sender(userId, value.sendingAddressId); const id = createId();
	await db.transaction(async (tx) => {
		await tx.insert(messages).values({ id, userId, sendingAddressId: sending.id, isInbound: false, outboundStatus: "draft", fromName: sending.displayName, fromEmail: `${sending.localPart}@${sending.domainName}`, subject: value.subject, textBody: value.textBody, htmlRaw: value.htmlBody ?? textHtml(value.textBody), snippet: value.textBody.replace(/\s+/g, " ").slice(0, 160), searchText: `${value.subject} ${value.textBody}` });
		const recipients = recipientRows(id, value); if (recipients.length) await tx.insert(messageAddresses).values(recipients);
	});
	return getDraft(userId, id);
}
export async function updateDraft(userId: string, messageId: string, input: unknown) {
	const value = parse(input); const draft = await getDraft(userId, messageId); if (!draft) throw new DraftError("Draft not found.", "not-found"); const sending = await sender(userId, value.sendingAddressId);
	await db.transaction(async (tx) => {
		await tx.update(messages).set({ sendingAddressId: sending.id, fromName: sending.displayName, fromEmail: `${sending.localPart}@${sending.domainName}`, subject: value.subject, textBody: value.textBody, htmlRaw: value.htmlBody ?? textHtml(value.textBody), snippet: value.textBody.replace(/\s+/g, " ").slice(0, 160), searchText: `${value.subject} ${value.textBody}`, outboundStatus: "draft", lastSendError: null, updatedAt: new Date() }).where(ownedMessage(userId, messageId));
		await tx.delete(messageAddresses).where(eq(messageAddresses.messageId, messageId)); const recipients = recipientRows(messageId, value); if (recipients.length) await tx.insert(messageAddresses).values(recipients);
	});
	return getDraft(userId, messageId);
}
export async function deleteDraft(userId: string, messageId: string, storage: BlobStorage) {
	const draft = await getDraft(userId, messageId); if (!draft) throw new DraftError("Draft not found.", "not-found");
	const rows = await db.select().from(attachments).where(eq(attachments.messageId, messageId));
	await db.delete(messages).where(ownedMessage(userId, messageId));
	await Promise.all(rows.map((attachment) => storage.delete(attachment.blobKey).catch(() => undefined)));
}
export async function addAttachment(userId: string, messageId: string, input: { filename: string; contentType: string; data: Uint8Array }, storage: BlobStorage) {
	const draft = await getDraft(userId, messageId); if (!draft) throw new DraftError("Draft not found.", "not-found");
	if (!input.filename || !input.contentType || !input.data.byteLength) throw new DraftError("Choose a valid attachment.");
	const id = createId(); const blobKey = attachmentBlobKey(userId, messageId, id);
	await storage.put(blobKey, input.data, { contentType: input.contentType });
	try { await db.insert(attachments).values({ id, messageId, blobKey, filename: input.filename, contentType: input.contentType, sizeBytes: input.data.byteLength, disposition: "attachment" }); } catch { await storage.delete(blobKey).catch(() => undefined); throw new DraftError("Unable to save this attachment.", "conflict"); }
	return id;
}
export async function removeAttachment(userId: string, messageId: string, attachmentId: string, storage: BlobStorage) {
	const draft = await getDraft(userId, messageId); if (!draft) throw new DraftError("Draft not found.", "not-found");
	const [attachment] = await db.select().from(attachments).where(and(eq(attachments.id, attachmentId), eq(attachments.messageId, messageId))).limit(1);
	if (!attachment) throw new DraftError("Attachment not found.", "not-found");
	await db.delete(attachments).where(eq(attachments.id, attachmentId)); await storage.delete(attachment.blobKey).catch(() => undefined);
}
export async function sendMessage(userId: string, messageId: string, storage: BlobStorage, transport: OutboundTransport = getOutboundTransport()) {
	const draft = await getDraft(userId, messageId); if (!draft) throw new DraftError("Draft not found.", "not-found");
	const sending = draft.sendingAddressId ? await sender(userId, draft.sendingAddressId) : null; if (!sending) throw new DraftError("Choose a valid sending address.", "conflict");
	const recipients = await db.select().from(messageAddresses).where(eq(messageAddresses.messageId, messageId));
	const attachmentsForMessage = await db.select().from(attachments).where(eq(attachments.messageId, messageId));
	const attachmentData = await Promise.all(attachmentsForMessage.map(async (attachment) => ({ filename: attachment.filename, contentType: attachment.contentType, sizeBytes: attachment.sizeBytes, disposition: attachment.disposition, data: await storage.get(attachment.blobKey) })));
	const threadId = draft.threadId ?? createId(); const internetMessageId = draft.internetMessageId ?? `<${messageId}@${sending.domainName}>`; const now = new Date();
	await db.transaction(async (tx) => { if (!draft.threadId) await tx.insert(threads).values({ id: threadId, userId, lastMessageAt: now }); await tx.update(messages).set({ threadId, internetMessageId, outboundStatus: "sending", lastSendError: null, updatedAt: now }).where(and(ownedMessage(userId, messageId), inArray(messages.outboundStatus, ["draft", "failed"]))); });
	const outgoing = normalizedOutgoingMessageSchema.parse({ from: { email: `${sending.localPart}@${sending.domainName}`, ...(sending.displayName ? { name: sending.displayName } : {}) }, replyTo: { email: `${sending.localPart}@${sending.domainName}` }, recipients: recipients.map((recipient) => ({ role: recipient.role, position: recipient.position, email: recipient.email, ...(recipient.name ? { name: recipient.name } : {}) })), subject: draft.subject, textBody: draft.textBody ?? "", htmlBody: draft.htmlRaw ?? undefined, inReplyTo: draft.inReplyTo ?? undefined, references: draft.references, attachments: attachmentData, idempotencyKey: `ossend-message/${messageId}` });
	let result; try { result = await transport.send(outgoing); } catch { result = { error: "The mail provider could not send this message." } as const; }
	if ("error" in result) { await db.update(messages).set({ outboundStatus: "failed", lastSendError: "Delivery failed. Please try again.", updatedAt: new Date() }).where(ownedMessage(userId, messageId)); throw new DraftError("Unable to send this message. Please try again.", "provider"); }
	await db.transaction(async (tx) => { await tx.update(messages).set({ outboundStatus: "sent", sentAt: new Date(), updatedAt: new Date() }).where(and(ownedMessage(userId, messageId), eq(messages.outboundStatus, "sending"))); await tx.update(threads).set({ lastMessageAt: new Date(), updatedAt: new Date() }).where(and(eq(threads.id, threadId), eq(threads.userId, userId))); await tx.insert(messageProviderRefs).values({ id: createId(), messageId, provider: "resend", direction: "outbound", externalId: result.externalId }); });
}
async function replyDraft(userId: string, parentId: string, all: boolean) {
	const [parent] = await db.select().from(messages).where(ownedMessage(userId, parentId)).limit(1); if (!parent) throw new DraftError("Message not found.", "not-found");
	const [sending] = await db.select({ id: addresses.id, localPart: addresses.localPart, domainName: domains.name }).from(addresses).innerJoin(domains, eq(addresses.domainId, domains.id)).where(and(eq(addresses.userId, userId), eq(addresses.isEnabled, true), eq(domains.status, "verified"))).limit(1); if (!sending) throw new DraftError("Choose a valid sending address.", "conflict");
	const parentRecipients = await db.select().from(messageAddresses).where(eq(messageAddresses.messageId, parentId)); const own = `${sending.localPart}@${sending.domainName}`;
	const to = all ? replyAllRecipients(parent.fromEmail, parent.fromName, parentRecipients, own) : replyRecipients(parent.fromEmail, parent.fromName);
	const draft = await createDraft(userId, { sendingAddressId: sending.id, to, cc: [], bcc: [], subject: parent.subject.toLowerCase().startsWith("re:") ? parent.subject : `Re: ${parent.subject}`, textBody: "", htmlBody: "" });
	if (!draft) throw new DraftError("Unable to create draft.", "conflict");
	const references = [...parent.references, ...(parent.internetMessageId ? [parent.internetMessageId] : [])];
	if (parent.threadId) await db.update(messages).set({ threadId: parent.threadId, parentMessageId: parent.id, inReplyTo: parent.internetMessageId, references, updatedAt: new Date() }).where(ownedMessage(userId, draft.id));
	return await getDraft(userId, draft.id);
}
export async function replyToMessage(userId: string, parentId: string) { return replyDraft(userId, parentId, false); }
export async function replyAllToMessage(userId: string, parentId: string) { return replyDraft(userId, parentId, true); }
export async function forwardMessage(userId: string, parentId: string) { const draft = await replyDraft(userId, parentId, false); if (!draft?.sendingAddressId) throw new DraftError("Unable to create draft.", "conflict"); return updateDraft(userId, draft.id, { sendingAddressId: draft.sendingAddressId, to: [], cc: [], bcc: [], subject: draft.subject.replace(/^Re:/i, "Fwd:"), textBody: `\n\n---------- Forwarded message ----------\nFrom: ${draft.fromEmail}\nSubject: ${draft.subject}\n\n${draft.textBody ?? ""}` }); }

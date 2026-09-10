import { createHash } from "node:crypto";

import { claimInboundWebhookEvent, completeInboundWebhookEvent, failInboundWebhookEvent, persistIncomingMessage, resolveHostedRecipient, type ReceiveInboundEmailResult } from "@/db/queries/mail";
import { attachmentBlobKey, rawEmailBlobKey, type BlobStorage } from "@/lib/storage/types";

import type { NormalizedInboundMessage } from "./contracts";
import type { InboundTransport, VerifiedInboundEvent } from "./transports";
import type { IncomingMessage } from "./types";

export type { ReceiveInboundEmailResult };

function messageId(event: VerifiedInboundEvent) { return `inbound-${createHash("sha256").update(`${event.provider}:${event.externalMessageId ?? event.eventId}`).digest("hex")}`; }

export async function receiveInboundEvent(event: VerifiedInboundEvent, transport: InboundTransport, storage: BlobStorage): Promise<ReceiveInboundEmailResult> {
	if (!(await claimInboundWebhookEvent(event))) return { status: "duplicate" };
	const id = messageId(event);
	try {
		const email = await transport.retrieveMessage(event);
		const recipient = await resolveHostedRecipient(email.recipients);
		if (!recipient) { await completeInboundWebhookEvent(event); return { status: "unknown-mailbox" }; }
		if (email.rawEmail) await storage.put(rawEmailBlobKey(recipient.userId, id), email.rawEmail, { contentType: "message/rfc822" });
		await Promise.all(email.attachments.map(async (attachment, index) => {
			if (attachment.data) await storage.put(attachmentBlobKey(recipient.userId, id, attachment.externalId ?? String(index)), attachment.data, { contentType: attachment.contentType });
		}));
		const result = await persistIncomingMessage(email, id, storage, recipient);
		await completeInboundWebhookEvent(event, result.status === "received" ? id : undefined);
		return result;
	} catch (error) {
		await failInboundWebhookEvent(event, error instanceof Error ? error.message : "Unable to process inbound message.");
		throw error;
	}
}

export async function handleIncomingMessage(email: IncomingMessage): Promise<ReceiveInboundEmailResult> {
	const normalized: NormalizedInboundMessage = { provider: "resend", externalId: email.externalId, internetMessageId: email.messageId, from: { email: email.from }, recipients: (["to", "cc", "bcc"] as const).flatMap((role) => email[role].map((value, position) => ({ role, position, email: value }))), subject: email.subject, textBody: email.text, htmlRaw: email.html, headers: email.headers, references: [], receivedAt: email.receivedAt, attachments: [] };
	return persistIncomingMessage(normalized, messageId({ provider: "resend", eventId: email.externalId, eventType: "email.received", externalMessageId: email.externalId }), (await import("@/lib/storage/filesystem")).getBlobStorage());
}

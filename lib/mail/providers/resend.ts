import { Resend } from "resend";

import { getEmailEnvironment, getResendEnvironment, getWebhookEnvironment } from "@/lib/env";

import { normalizedInboundMessageSchema, type MailAddress, type NormalizedInboundMessage } from "../contracts";
import type { InboundTransport, InboundWebhookRequest, VerifiedInboundEvent } from "../transports";
import type { MailProvider } from "../provider";
import type { OutboundMessage, SendResult } from "../types";

function client() { return new Resend(getResendEnvironment().RESEND_API_KEY); }
function address(value: string): MailAddress {
	const email = (value.match(/<([^<>]+)>/)?.[1] ?? value).trim().toLowerCase();
	const name = value.match(/^\s*(.*?)\s*<[^<>]+>\s*$/)?.[1]?.trim().replace(/^"|"$/g, "");
	return { email, ...(name ? { name } : {}) };
}
function header(headers: Record<string, string>, name: string) { return Object.entries(headers).find(([key]) => key.toLowerCase() === name.toLowerCase())?.[1]; }
function headerIds(value?: string) { return value?.match(/<[^<>]+>/g) ?? []; }

export class ResendInboundTransport implements InboundTransport {
	async verifyWebhook(request: InboundWebhookRequest): Promise<VerifiedInboundEvent | null> {
		const payload = new TextDecoder().decode(request.body);
		const id = request.headers.get("svix-id");
		const timestamp = request.headers.get("svix-timestamp");
		const signature = request.headers.get("svix-signature");
		if (!id || !timestamp || !signature) throw new Error("Missing webhook signature.");
		const event = client().webhooks.verify({ payload, headers: { id, timestamp, signature }, webhookSecret: getWebhookEnvironment().RESEND_WEBHOOK_SECRET });
		if (event.type !== "email.received") return null;
		return { provider: "resend", eventId: id, eventType: event.type, externalMessageId: event.data.email_id, eventCreatedAt: new Date(event.created_at) };
	}

	async retrieveMessage(event: VerifiedInboundEvent): Promise<NormalizedInboundMessage> {
		if (!event.externalMessageId) throw new Error("Inbound event has no email ID.");
		const resend = client();
		const { data: email, error } = await resend.emails.receiving.get(event.externalMessageId);
		if (error || !email) throw new Error(error?.message ?? "Unable to retrieve received email.");
		const { data: listed, error: attachmentError } = await resend.emails.receiving.attachments.list({ emailId: email.id });
		if (attachmentError) throw new Error(attachmentError.message);
		const headers = email.headers ?? {};
		const recipients = (["to", "cc", "bcc"] as const).flatMap((role) => (email[role] ?? []).map((value, position) => ({ ...address(value), role, position })));
		const attachmentData = await Promise.all((listed?.data ?? []).map(async (attachment) => {
			const response = await fetch(attachment.download_url);
			if (!response.ok) throw new Error("Unable to retrieve inbound attachment.");
			return { externalId: attachment.id, filename: attachment.filename ?? "attachment", contentType: attachment.content_type ?? "application/octet-stream", sizeBytes: attachment.size ?? 0, disposition: attachment.content_disposition ?? "attachment", contentId: attachment.content_id ?? undefined, data: new Uint8Array(await response.arrayBuffer()) };
		}));
		return normalizedInboundMessageSchema.parse({
			provider: "resend", externalId: email.id, from: address(email.from), recipients, subject: email.subject ?? "", textBody: email.text ?? undefined, htmlRaw: email.html ?? undefined,
			internetMessageId: email.message_id ?? header(headers, "message-id"), inReplyTo: header(headers, "in-reply-to"), references: headerIds(header(headers, "references")), headers,
			receivedAt: new Date(email.created_at),
			attachments: attachmentData,
		});
	}
}

export function getInboundTransport(): InboundTransport { return new ResendInboundTransport(); }

// Legacy development provider boundary retained for the existing local mail flow.
export class ResendMailProvider implements MailProvider {
	async send(message: OutboundMessage): Promise<SendResult> {
		const { data, error } = await client().emails.send({ from: getEmailEnvironment().EMAIL_FROM, to: message.to, cc: message.cc.length ? message.cc : undefined, bcc: message.bcc.length ? message.bcc : undefined, replyTo: message.replyTo, subject: message.subject, text: message.text, html: message.html }, { idempotencyKey: message.idempotencyKey });
		return data ? { externalId: data.id } : { error: error?.message ?? "Resend did not return a message ID." };
	}
}

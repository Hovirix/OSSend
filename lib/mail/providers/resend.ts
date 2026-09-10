import { Resend } from "resend";

import { getEmailEnvironment, getWebhookEnvironment } from "@/lib/env";

import type { MailProvider } from "../provider";
import type { IncomingMessage, OutboundMessage, SendResult } from "../types";

type ResendWebhookInput = {
	payload: string;
	headers: { id: string; timestamp: string; signature: string };
};

function createResendClient() {
	return new Resend(getEmailEnvironment().RESEND_API_KEY);
}

export class ResendMailProvider implements MailProvider {
	async send(message: OutboundMessage): Promise<SendResult> {
		const { data, error } = await createResendClient().emails.send(
			{
				from: getEmailEnvironment().EMAIL_FROM,
				to: message.to,
				cc: message.cc.length ? message.cc : undefined,
				bcc: message.bcc.length ? message.bcc : undefined,
				replyTo: message.replyTo,
				subject: message.subject,
				text: message.text,
				html: message.html,
			},
			{ idempotencyKey: message.idempotencyKey },
		);

		return data
			? { externalId: data.id }
			: { error: error?.message ?? "Resend did not return a message ID." };
	}
}

export async function parseResendIncomingMessage(
	input: ResendWebhookInput,
): Promise<IncomingMessage | null> {
	const event = createResendClient().webhooks.verify({
		payload: input.payload,
		headers: input.headers,
		webhookSecret: getWebhookEnvironment().RESEND_WEBHOOK_SECRET,
	});
	if (event.type !== "email.received") {
		return null;
	}

	const resend = createResendClient();
	const { data: email, error } = await resend.emails.receiving.get(
		event.data.email_id,
	);
	if (error || !email) {
		throw new Error(error?.message ?? "Unable to retrieve received email.");
	}
	const { data: attachmentList, error: attachmentError } =
		await resend.emails.receiving.attachments.list({ emailId: email.id });
	if (attachmentError) {
		throw new Error(attachmentError.message);
	}

	return {
		externalId: email.id,
		messageId: email.message_id,
		from: email.from,
		to: email.to,
		cc: email.cc ?? [],
		bcc: email.bcc ?? [],
		subject: email.subject,
		text: email.text ?? undefined,
		html: email.html ?? undefined,
		headers: email.headers ?? {},
		receivedAt: new Date(email.created_at),
		attachments: (attachmentList?.data ?? email.attachments ?? []).map(
			(attachment) => ({
				id: attachment.id,
				filename: attachment.filename ?? null,
				contentType: attachment.content_type,
				size: attachment.size ?? 0,
			}),
		),
	};
}

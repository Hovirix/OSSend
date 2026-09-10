import { Resend } from "resend";
import { Buffer } from "node:buffer";

import { getResendEnvironment } from "@/lib/env";

import type { NormalizedOutgoingMessage } from "../contracts";
import type { OutboundSendResult, OutboundTransport } from "../transports";

export class ResendOutboundTransport implements OutboundTransport {
	async send(message: NormalizedOutgoingMessage): Promise<OutboundSendResult> {
		const resend = new Resend(getResendEnvironment().RESEND_API_KEY);
		const { data, error } = await resend.emails.send({
			from: message.from.name ? `${message.from.name} <${message.from.email}>` : message.from.email,
			to: message.recipients.filter((recipient) => recipient.role === "to").map((recipient) => recipient.email),
			cc: message.recipients.filter((recipient) => recipient.role === "cc").map((recipient) => recipient.email),
			bcc: message.recipients.filter((recipient) => recipient.role === "bcc").map((recipient) => recipient.email),
			replyTo: message.replyTo?.email,
			subject: message.subject,
			text: message.textBody ?? "",
			html: message.htmlBody ?? undefined,
			headers: {
				...(message.inReplyTo ? { "In-Reply-To": message.inReplyTo } : {}),
				...(message.references.length ? { References: message.references.join(" ") } : {}),
			},
			attachments: message.attachments.map((attachment) => ({ filename: attachment.filename, content: Buffer.from(attachment.data), contentType: attachment.contentType })),
		}, { idempotencyKey: message.idempotencyKey });
		return data ? { externalId: data.id } : { error: "The mail provider could not send this message." };
	}
}

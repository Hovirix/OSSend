import { getEmailEnvironment } from "@/lib/env";

import type { EmailProvider, SendEmailInput, SendEmailResult } from "../types";
import { createResendClient } from "./client";

function createResendProvider(): EmailProvider {
	return {
		async send(message: SendEmailInput): Promise<SendEmailResult> {
			const { EMAIL_FROM } = getEmailEnvironment();
			const resend = createResendClient();
			const { data, error } = await resend.emails.send(
				{
					from: EMAIL_FROM,
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

			if (error || !data) {
				return {
					error: error?.message ?? "Resend did not return a message ID.",
				};
			}

			return { providerMessageId: data.id };
		},
	};
}

export const resendProvider = createResendProvider();

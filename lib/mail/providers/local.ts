import type { MailProvider } from "../provider";
import type { OutboundMessage, SendResult } from "../types";

export class LocalMailProvider implements MailProvider {
	async send(message: OutboundMessage): Promise<SendResult> {
		// Outbound mail is already persisted before this provider is called.
		return { externalId: `local/${message.idempotencyKey}` };
	}
}

import { LocalMailProvider } from "./providers/local";
import { ResendMailProvider } from "./providers/resend";
import type { OutboundMessage, SendResult } from "./types";

export interface MailProvider {
	send(message: OutboundMessage): Promise<SendResult>;
}

export function getMailProvider(): MailProvider {
	return process.env.NODE_ENV === "production"
		? new ResendMailProvider()
		: new LocalMailProvider();
}

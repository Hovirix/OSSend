export type SendEmailInput = {
	replyTo: string;
	to: string[];
	cc: string[];
	bcc: string[];
	subject: string;
	text: string;
	html: string;
	idempotencyKey: string;
};

export type SendEmailResult =
	| { providerMessageId: string; error?: never }
	| { error: string; providerMessageId?: never };

export interface EmailProvider {
	send(input: SendEmailInput): Promise<SendEmailResult>;
}

export type MailSummary = {
	id: string;
	senderName: string | null;
	senderEmail: string;
	subject: string;
	preview: string;
	timestamp: string;
	unread: boolean;
	messageCount: number;
	hasAttachment: boolean;
};

export type MailThreadData = MailSummary & {
	messages: Array<{
		id: string;
		senderName: string;
		senderEmail: string;
		recipients: string;
		timestamp: string;
		body: string;
		isCurrentUser: boolean;
		attachments?: Array<{ id: string; name: string; size: string }>;
		deliveryStatus?: string;
	}>;
};

export type MessageSummary = {
	id: string;
	senderName: string | null;
	senderEmail: string;
	sentAt: Date;
	isCurrentUser: boolean;
	content: string | null;
};

export type OutboundMessage = {
	from: string;
	replyTo: string;
	to: string[];
	cc: string[];
	bcc: string[];
	subject: string;
	text: string;
	html: string;
	idempotencyKey: string;
};

export type SendResult =
	| { externalId: string; error?: never }
	| { error: string; externalId?: never };

export type IncomingAttachment = {
	id: string;
	filename: string | null;
	contentType: string | null;
	size: number;
};

export type IncomingMessage = {
	externalId: string;
	messageId: string;
	from: string;
	to: string[];
	cc: string[];
	bcc: string[];
	subject: string;
	text?: string;
	html?: string;
	headers: Record<string, string>;
	receivedAt: Date;
	attachments: IncomingAttachment[];
};

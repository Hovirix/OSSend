export type MailSummary = {
	id: string;
	senderName: string;
	senderEmail: string;
	subject: string;
	preview: string;
	timestamp: string;
	unread: boolean;
	messageCount?: number;
	hasAttachment?: boolean;
};

export type MailThreadData = MailSummary & {
	messages: {
		id: string;
		senderName: string;
		senderEmail: string;
		recipients: string;
		timestamp: string;
		body: string;
		isCurrentUser?: boolean;
		deliveryStatus?: string;
		attachments?: { name: string; size: string }[];
	}[];
};

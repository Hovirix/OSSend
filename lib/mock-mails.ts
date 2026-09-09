export type MailThread = {
	id: string;
	senderName: string;
	senderEmail: string;
	subject: string;
	preview: string;
	timestamp: string;
	unread: boolean;
	messageCount?: number;
	hasAttachment?: boolean;
	messages: MailMessage[];
};

export type MailMessage = {
	id: string;
	senderName: string;
	senderEmail: string;
	recipients: string;
	timestamp: string;
	body: string;
	isCurrentUser?: boolean;
	deliveryStatus?: "Delivered" | "Opened" | "Clicked";
	attachments?: { name: string; size: string }[];
};

const mockMailSummaries: Omit<MailThread, "messages">[] = [
	{
		id: "linear-deployment",
		senderName: "Maya Chen",
		senderEmail: "maya@linear.app",
		subject: "Re: Deployment issue",
		preview: "I checked the logs and the rollback completed successfully.",
		timestamp: "10:42",
		unread: true,
		messageCount: 3,
	},
	{
		id: "github-security",
		senderName: "GitHub",
		senderEmail: "noreply@github.com",
		subject: "Security alert",
		preview: "A new personal access key was added to your account.",
		timestamp: "09:18",
		unread: true,
	},
	{
		id: "northstar-invoice",
		senderName: "Northstar Studio",
		senderEmail: "billing@northstar.studio",
		subject: "Invoice 1048 is ready",
		preview: "Your invoice for August is attached to this email.",
		timestamp: "Yesterday",
		unread: false,
		hasAttachment: true,
	},
	{
		id: "marco-design-review",
		senderName: "Marco Ruiz",
		senderEmail: "marco@ossend.dev",
		subject: "Design review notes",
		preview:
			"I added comments to the navigation and list density explorations.",
		timestamp: "Yesterday",
		unread: true,
		messageCount: 5,
	},
	{
		id: "vercel-deployment",
		senderName: "Vercel",
		senderEmail: "notifications@vercel.com",
		subject: "Deployment completed",
		preview: "Production deployment for ossend-web completed in 42 seconds.",
		timestamp: "Mon",
		unread: false,
	},
	{
		id: "sarah-product-sync",
		senderName: "Sarah Kim",
		senderEmail: "sarah@openfield.co",
		subject: "Product sync this week",
		preview:
			"Thursday afternoon works for me. I can send an agenda beforehand.",
		timestamp: "Mon",
		unread: false,
		messageCount: 2,
	},
	{
		id: "figma-invite",
		senderName: "Figma",
		senderEmail: "notifications@figma.com",
		subject: "You were invited to OSSend UI",
		preview: "Alex invited you to view the OSSend UI Foundations project.",
		timestamp: "Aug 29",
		unread: false,
	},
	{
		id: "priya-contract",
		senderName: "Priya Nair",
		senderEmail: "priya@atomics.io",
		subject: "Updated contractor agreement",
		preview: "Attached is the revised agreement with the start date corrected.",
		timestamp: "Aug 28",
		unread: true,
		hasAttachment: true,
	},
	{
		id: "cloudflare-weekly",
		senderName: "Cloudflare",
		senderEmail: "noreply@cloudflare.com",
		subject: "Weekly traffic summary",
		preview: "Your zones served 18,420 requests over the last seven days.",
		timestamp: "Aug 27",
		unread: false,
	},
	{
		id: "theo-domain",
		senderName: "Theo Martins",
		senderEmail: "theo@ossend.dev",
		subject: "Domain migration checklist",
		preview:
			"I have documented the DNS records that need to move before Friday.",
		timestamp: "Aug 26",
		unread: false,
		messageCount: 4,
	},
	{
		id: "resend-receipt",
		senderName: "Resend",
		senderEmail: "receipts@resend.com",
		subject: "Your receipt from Resend",
		preview:
			"Thank you for your payment. Your receipt is attached for your records.",
		timestamp: "Aug 25",
		unread: false,
		hasAttachment: true,
	},
	{
		id: "notion-handbook",
		senderName: "Notion",
		senderEmail: "team@makenotion.com",
		subject: "Engineering handbook shared with you",
		preview: "You now have access to the updated engineering handbook.",
		timestamp: "Aug 23",
		unread: false,
	},
];

function createMockMessages(mail: Omit<MailThread, "messages">): MailMessage[] {
	const messages: MailMessage[] = [
		{
			id: `${mail.id}-initial`,
			senderName: "You",
			senderEmail: "user@email.com",
			recipients: mail.senderEmail,
			timestamp: "Aug 30, 9:14 AM",
			body: `Hi ${mail.senderName.split(" ")[0]},\n\nThanks for the note. Could you send over any details when you have a moment?\n\nBest,\nOSSend`,
			isCurrentUser: true,
			deliveryStatus: "Delivered",
		},
	];

	if (mail.messageCount) {
		messages.push({
			id: `${mail.id}-follow-up`,
			senderName: "You",
			senderEmail: "user@email.com",
			recipients: mail.senderEmail,
			timestamp: "Aug 30, 11:02 AM",
			body: "Following up here in case it is helpful to have the latest context from our side.",
			isCurrentUser: true,
			deliveryStatus: "Opened",
		});
	}

	messages.push({
		id: `${mail.id}-latest`,
		senderName: mail.senderName,
		senderEmail: mail.senderEmail,
		recipients: "user@email.com",
		timestamp: "Today, 10:42 AM",
		body: `Hi there,\n\n${mail.preview}\n\nLet me know if you need anything else.\n\n${mail.senderName.split(" ")[0]}`,
		attachments: mail.hasAttachment
			? [{ name: "attachment.pdf", size: "248 KB" }]
			: undefined,
	});

	return messages;
}

export const mockMails: MailThread[] = mockMailSummaries.map((mail) => ({
	...mail,
	messages: createMockMessages(mail),
}));

export function getMockMail(threadId: string) {
	return mockMails.find((mail) => mail.id === threadId);
}

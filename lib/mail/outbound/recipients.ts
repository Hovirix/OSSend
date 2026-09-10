import type { MailAddress } from "../contracts";

type Recipient = { role: "to" | "cc" | "bcc" | "reply_to"; email: string; name: string | null };

function unique(addresses: MailAddress[]) {
	return addresses.filter((address, index) => addresses.findIndex((candidate) => candidate.email === address.email) === index);
}

export function replyRecipients(fromEmail: string, fromName: string | null): MailAddress[] {
	return [{ email: fromEmail.toLowerCase(), ...(fromName ? { name: fromName } : {}) }];
}

export function replyAllRecipients(fromEmail: string, fromName: string | null, recipients: Recipient[], ownEmail: string): MailAddress[] {
	return unique([
		...replyRecipients(fromEmail, fromName),
		...recipients.filter((recipient) => recipient.role === "to" || recipient.role === "cc").map((recipient) => ({ email: recipient.email.toLowerCase(), ...(recipient.name ? { name: recipient.name } : {}) })),
	].filter((recipient) => recipient.email !== ownEmail.toLowerCase()));
}

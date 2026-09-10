export type DomainStatus = "pending" | "verified" | "failed";
export type OutboundStatus = "draft" | "sending" | "sent" | "failed";
export type MessageAddressRole = "to" | "cc" | "bcc" | "reply_to";
export type AttachmentDisposition = "attachment" | "inline";
export type MailProvider = "resend";
export type ProviderMessageDirection = "inbound" | "outbound";
export type WebhookStatus = "processing" | "processed" | "failed";
export type AuditActor = "user" | "system";
export type AuditAction =
	| "auth.signed_in"
	| "auth.signed_out"
	| "domain.created"
	| "domain.verified"
	| "domain.deleted"
	| "address.created"
	| "address.disabled"
	| "address.deleted"
	| "message.sent"
	| "message.send_failed";

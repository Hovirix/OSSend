import { z } from "zod";

import { attachmentDispositionSchema, messageAddressRoleSchema } from "../../db/contracts";

export const mailAddressSchema = z.object({
	name: z.string().trim().min(1).max(320).optional(),
	email: z.string().trim().toLowerCase().pipe(z.email()),
});

export const normalizedAttachmentSchema = z.object({
	externalId: z.string().min(1).optional(),
	filename: z.string().min(1).max(1024),
	contentType: z.string().min(1).max(255),
	sizeBytes: z.int().nonnegative(),
	disposition: attachmentDispositionSchema,
	contentId: z.string().min(1).optional(),
	sha256: z.string().regex(/^[a-f0-9]{64}$/i).optional(),
	data: z.instanceof(Uint8Array).optional(),
});

export const normalizedRecipientSchema = mailAddressSchema.extend({
	role: messageAddressRoleSchema,
	position: z.int().nonnegative(),
});

const outboundRecipientSchema = mailAddressSchema.extend({
	role: z.enum(["to", "cc", "bcc"]),
	position: z.int().nonnegative(),
});

export const normalizedInboundMessageSchema = z.object({
	provider: z.string().trim().min(1),
	externalId: z.string().trim().min(1),
	from: mailAddressSchema,
	recipients: z.array(normalizedRecipientSchema).max(200),
	subject: z.string().max(998).default(""),
	textBody: z.string().max(1_000_000).optional(),
	htmlRaw: z.string().max(1_000_000).optional(),
	internetMessageId: z.string().max(998).optional(),
	inReplyTo: z.string().max(998).optional(),
	references: z.array(z.string().max(998)).max(100).default([]),
	headers: z.record(z.string(), z.string()).default({}),
	receivedAt: z.coerce.date(),
	rawEmail: z.instanceof(Uint8Array).optional(),
	attachments: z.array(normalizedAttachmentSchema).max(200).default([]),
});

export const normalizedOutgoingMessageSchema = z.object({
	from: mailAddressSchema,
	replyTo: mailAddressSchema.optional(),
	recipients: z.array(outboundRecipientSchema).min(1).max(200).refine(
		(recipients) => recipients.some((recipient) => recipient.role === "to"),
		"Add at least one To recipient.",
	),
	subject: z.string().max(998).default(""),
	textBody: z.string().max(1_000_000).optional(),
	htmlBody: z.string().max(1_000_000).optional(),
	inReplyTo: z.string().max(998).optional(),
	references: z.array(z.string().max(998)).max(100).default([]),
	attachments: z.array(normalizedAttachmentSchema.extend({ data: z.instanceof(Uint8Array) })).max(200).default([]),
	idempotencyKey: z.string().min(1).max(255),
});

export type MailAddress = z.infer<typeof mailAddressSchema>;
export type NormalizedAttachment = z.infer<typeof normalizedAttachmentSchema>;
export type NormalizedRecipient = z.infer<typeof normalizedRecipientSchema>;
export type NormalizedInboundMessage = z.infer<typeof normalizedInboundMessageSchema>;
export type NormalizedOutgoingMessage = z.infer<typeof normalizedOutgoingMessageSchema>;

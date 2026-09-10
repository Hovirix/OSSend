import { domainToASCII } from "node:url";

import { z } from "zod";

export function normalizeDomainName(value: string): string {
	const normalized = value.trim().toLowerCase().replace(/\.+$/, "");
	const ascii = domainToASCII(normalized);
	if (!ascii) throw new Error("Invalid domain name");
	return ascii;
}

export const domainNameSchema = z.string().trim().transform(normalizeDomainName).refine((value) => value.length > 0, "Enter a valid domain name.");
export const localPartSchema = z.string().trim().toLowerCase().min(1).max(64);
export const messageAddressRoleSchema = z.enum(["to", "cc", "bcc", "reply_to"]);
export const attachmentDispositionSchema = z.enum(["attachment", "inline"]);
export const webhookStatusSchema = z.enum(["processing", "processed", "failed"]);

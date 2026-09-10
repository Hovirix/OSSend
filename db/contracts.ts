import { z } from "zod";

export function normalizeDomainName(value: string): string {
	const normalized = value.trim().toLowerCase().replace(/\.+$/, "");
	if (!normalized || /[/:?#@]/.test(normalized)) {
		throw new Error("Invalid domain name");
	}

	try {
		const hostname = new URL(`https://${normalized}`).hostname;
		if (!hostname || hostname.includes(":")) {
			throw new Error("Invalid domain name");
		}
		return hostname;
	} catch {
		throw new Error("Invalid domain name");
	}
}

export const domainNameSchema = z.string().trim().transform(normalizeDomainName).refine((value) => value.length > 0, "Enter a valid domain name.");
export const localPartSchema = z
	.string()
	.trim()
	.toLowerCase()
	.min(1, "Enter an email address name.")
	.max(64, "Email address names must be 64 characters or fewer.")
	.regex(
		/^[a-z0-9_+-]+(?:\.[a-z0-9_+-]+)*$/,
		"Use letters, numbers, dots, underscores, plus signs, or hyphens. Dots cannot be first, last, or consecutive.",
	);
export const messageAddressRoleSchema = z.enum(["to", "cc", "bcc", "reply_to"]);
export const attachmentDispositionSchema = z.enum(["attachment", "inline"]);
export const webhookStatusSchema = z.enum(["processing", "processed", "failed"]);

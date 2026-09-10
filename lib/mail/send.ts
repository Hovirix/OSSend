import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import { addresses, domains, messageAddresses, messageProviderRefs, messages, threads } from "@/db/schema";
import { auth } from "@/lib/auth";
import { getMailProvider } from "./provider";
import { composeSchema } from "./schemas";

export type SendEmailResult = { success: true } | { success: false; error: string };

function textToHtml(text: string) {
	return text.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;").replaceAll("\n", "<br />");
}

export async function sendEmail(input: unknown, requestHeaders: Headers): Promise<SendEmailResult> {
	const parsed = composeSchema.safeParse(input);
	if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid email." };

	const session = await auth.api.getSession({ headers: requestHeaders });
	if (!session) return { success: false, error: "Your session has expired. Sign in again." };

	const [sendingAddress] = await db.select({ id: addresses.id, displayName: addresses.displayName, localPart: addresses.localPart, domainName: domains.name })
		.from(addresses).innerJoin(domains, eq(addresses.domainId, domains.id))
		.where(and(eq(addresses.userId, session.user.id), eq(addresses.isEnabled, true))).limit(1);
	if (!sendingAddress) return { success: false, error: "No email address is configured for this account." };

	const messageId = crypto.randomUUID();
	const threadId = crypto.randomUUID();
	const now = new Date();
	const fromEmail = `${sendingAddress.localPart}@${sendingAddress.domainName}`;
	const message = parsed.data;

	try {
		await db.transaction(async (tx) => {
			await tx.insert(threads).values({ id: threadId, userId: session.user.id, lastMessageAt: now });
			await tx.insert(messages).values({
				id: messageId, userId: session.user.id, threadId, sendingAddressId: sendingAddress.id,
				isInbound: false, outboundStatus: "sending", fromName: sendingAddress.displayName,
				fromEmail, subject: message.subject, textBody: message.body, htmlRaw: textToHtml(message.body),
				snippet: message.body.slice(0, 160), internetMessageId: `<${messageId}@${sendingAddress.domainName}>`,
				searchText: `${message.subject} ${fromEmail} ${[...message.to, ...message.cc, ...message.bcc].join(" ")} ${message.body}`,
			});
			await tx.insert(messageAddresses).values([
				...message.to.map((email, position) => ({ id: crypto.randomUUID(), messageId, role: "to" as const, email, position })),
				...message.cc.map((email, position) => ({ id: crypto.randomUUID(), messageId, role: "cc" as const, email, position })),
				...message.bcc.map((email, position) => ({ id: crypto.randomUUID(), messageId, role: "bcc" as const, email, position })),
			]);
		});
	} catch {
		return { success: false, error: "Unable to save this message." };
	}

	const result = await getMailProvider().send({ from: fromEmail, replyTo: fromEmail, to: message.to, cc: message.cc, bcc: message.bcc, subject: message.subject, text: message.body, html: textToHtml(message.body), idempotencyKey: `ossend-message/${messageId}` });
	if (result.error) {
		await db.update(messages).set({ outboundStatus: "failed", lastSendError: result.error, updatedAt: new Date() }).where(eq(messages.id, messageId));
		return { success: false, error: result.error };
	}

	if (!result.externalId) return { success: false, error: "Mail provider did not return an external ID." };
	await db.transaction(async (tx) => {
		await tx.update(messages).set({ outboundStatus: "sent", sentAt: new Date(), updatedAt: new Date() }).where(eq(messages.id, messageId));
		await tx.insert(messageProviderRefs).values({ id: crypto.randomUUID(), messageId, provider: "resend", direction: "outbound", externalId: result.externalId });
	});
	return { success: true };
}

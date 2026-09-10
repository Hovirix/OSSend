import { eq } from "drizzle-orm";

import { db } from "@/db";
import { mailboxes, messageRecipients, messages, threads } from "@/db/schema";
import { auth } from "@/lib/auth";
import { getMailProvider } from "./provider";
import { composeSchema } from "./schemas";

export type SendEmailResult =
	| { success: true }
	| { success: false; error: string };

function textToHtml(text: string) {
	return text
		.replaceAll("&", "&amp;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;")
		.replaceAll('"', "&quot;")
		.replaceAll("'", "&#039;")
		.replaceAll("\n", "<br />");
}

function createMessageId(address: string) {
	const domain = address.split("@")[1] ?? "localhost";
	return `<${crypto.randomUUID()}@${domain}>`;
}

export async function sendEmail(
	input: unknown,
	requestHeaders: Headers,
): Promise<SendEmailResult> {
	const parsed = composeSchema.safeParse(input);
	if (!parsed.success) {
		return {
			success: false,
			error: parsed.error.issues[0]?.message ?? "Invalid email.",
		};
	}

	const session = await auth.api.getSession({ headers: requestHeaders });
	if (!session) {
		return {
			success: false,
			error: "Your session has expired. Sign in again.",
		};
	}

	const [mailbox] = await db
		.select()
		.from(mailboxes)
		.where(eq(mailboxes.userId, session.user.id))
		.limit(1);
	if (!mailbox) {
		return {
			success: false,
			error: "No mailbox is configured for this account.",
		};
	}

	const messageId = crypto.randomUUID();
	const threadId = crypto.randomUUID();
	const rfcMessageId = createMessageId(mailbox.address);
	const now = new Date();
	const message = parsed.data;
	const recipientValues = [
		...message.to.map((address) => ({ messageId, type: "to", address })),
		...message.cc.map((address) => ({ messageId, type: "cc", address })),
		...message.bcc.map((address) => ({ messageId, type: "bcc", address })),
	];

	try {
		await db.transaction(async (tx) => {
			await tx.insert(threads).values({
				id: threadId,
				mailboxId: mailbox.id,
				subject: message.subject,
				preview: message.body.slice(0, 160),
				lastMessageAt: now,
			});
			await tx.insert(messages).values({
				id: messageId,
				threadId,
				mailboxId: mailbox.id,
				direction: "outbound",
				status: "pending",
				fromName: mailbox.name,
				fromAddress: mailbox.address,
				bodyText: message.body,
				bodyHtml: textToHtml(message.body),
				messageId: rfcMessageId,
				sentAt: now,
			});
			await tx.insert(messageRecipients).values(recipientValues);
		});
	} catch {
		return { success: false, error: "Unable to save this message." };
	}

	const result = await getMailProvider().send({
		from: mailbox.address,
		replyTo: mailbox.address,
		to: message.to,
		cc: message.cc,
		bcc: message.bcc,
		subject: message.subject,
		text: message.body,
		html: textToHtml(message.body),
		idempotencyKey: `outbound/${messageId}`,
	});

	if (result.error) {
		await db
			.update(messages)
			.set({ status: "failed", failureReason: result.error })
			.where(eq(messages.id, messageId));
		return { success: false, error: result.error };
	}

	await db
		.update(messages)
		.set({ status: "sent", providerMessageId: result.externalId })
		.where(eq(messages.id, messageId));
	return { success: true };
}

import { eq } from "drizzle-orm";

import { mailboxSchema } from "@/lib/mail/schemas";

export async function POST(request: Request) {
	const [{ auth }, { db }, { mailboxes, workspaceMembers }] = await Promise.all(
		[import("@/lib/auth"), import("@/db"), import("@/db/schema")],
	);
	const session = await auth.api.getSession({ headers: request.headers });
	if (!session) {
		return Response.json(
			{ success: false, error: "Your session has expired. Sign in again." },
			{ status: 401 },
		);
	}

	let input: unknown;
	try {
		input = await request.json();
	} catch {
		return Response.json(
			{ success: false, error: "Invalid request body." },
			{ status: 400 },
		);
	}

	const parsed = mailboxSchema.safeParse(input);
	if (!parsed.success) {
		return Response.json(
			{
				success: false,
				error: parsed.error.issues[0]?.message ?? "Invalid mailbox.",
			},
			{ status: 400 },
		);
	}

	const [membership] = await db
		.select({ workspaceId: workspaceMembers.workspaceId })
		.from(workspaceMembers)
		.where(eq(workspaceMembers.userId, session.user.id))
		.limit(1);
	if (!membership) {
		return Response.json(
			{ success: false, error: "No workspace is configured for this account." },
			{ status: 400 },
		);
	}

	const [mailbox] = await db
		.insert(mailboxes)
		.values({
			id: crypto.randomUUID(),
			workspaceId: membership.workspaceId,
			userId: session.user.id,
			address: parsed.data.email,
			name: parsed.data.displayName,
		})
		.onConflictDoNothing({ target: mailboxes.address })
		.returning({ id: mailboxes.id });
	if (!mailbox) {
		return Response.json(
			{ success: false, error: "That email address already has a mailbox." },
			{ status: 409 },
		);
	}

	return Response.json({ success: true });
}

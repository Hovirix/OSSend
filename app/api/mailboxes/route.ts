import { eq } from "drizzle-orm";

import { mailboxSchema } from "@/lib/mail/schemas";

export async function POST(request: Request) {
	const [{ auth }, { db }, { addresses, domains }] = await Promise.all(
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

	const [localPart, domainName] = parsed.data.email.split("@");
	if (!localPart || !domainName) {
		return Response.json({ success: false, error: "Enter a valid email address." }, { status: 400 });
	}
	const domainId = crypto.randomUUID();
	const addressId = crypto.randomUUID();
	try {
		await db.transaction(async (tx) => {
			const [domain] = await tx.insert(domains).values({ id: domainId, userId: session.user.id, name: domainName }).onConflictDoNothing({ target: domains.name }).returning({ id: domains.id, userId: domains.userId });
			const existingDomain = domain ?? (await tx.select({ id: domains.id, userId: domains.userId }).from(domains).where(eq(domains.name, domainName)).limit(1))[0];
			if (!existingDomain || existingDomain.userId !== session.user.id) throw new Error("domain-unavailable");
			await tx.insert(addresses).values({ id: addressId, userId: session.user.id, domainId: existingDomain.id, localPart, displayName: parsed.data.displayName });
		});
	} catch {
		return Response.json(
			{ success: false, error: "That email address is unavailable." },
			{ status: 409 },
		);
	}

	return Response.json({ success: true });
}

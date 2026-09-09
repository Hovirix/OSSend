import { headers } from "next/headers";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

async function AuthLayout({ children }: { children: ReactNode }) {
	const [{ auth }, { db }, { mailboxes }] = await Promise.all([
		import("@/lib/auth"),
		import("@/db"),
		import("@/db/schema"),
	]);
	const session = await auth.api.getSession({ headers: await headers() });

	if (session) {
		const [mailbox] = await db
			.select({ id: mailboxes.id })
			.from(mailboxes)
			.where(eq(mailboxes.userId, session.user.id))
			.limit(1);
		redirect(mailbox ? "/inbox" : "/onboarding/mailbox");
	}

	return children;
}

export default AuthLayout;

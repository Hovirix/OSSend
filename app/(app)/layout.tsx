import { headers } from "next/headers";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { AppShell } from "@/components/app-shell/app-shell";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

async function AppLayout({ children }: { children: ReactNode }) {
	const [{ auth }, { db }, { addresses }] = await Promise.all([
		import("@/lib/auth"),
		import("@/db"),
		import("@/db/schema"),
	]);
	const session = await auth.api.getSession({ headers: await headers() });

	if (!session) {
		redirect("/sign-in");
	}
	const [mailbox] = await db
		.select({ id: addresses.id })
		.from(addresses)
		.where(eq(addresses.userId, session.user.id))
		.limit(1);
	if (!mailbox) {
		redirect("/onboarding/mailbox");
	}

	return <AppShell userEmail={session.user.email}>{children}</AppShell>;
}

export default AppLayout;

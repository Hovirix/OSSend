import { headers } from "next/headers";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

export const dynamic = "force-dynamic";

async function AuthLayout({ children }: { children: ReactNode }) {
	const { getSession } = await import("@/lib/auth/session");
	const session = await getSession(await headers());

	if (session) {
		redirect("/settings/domains");
	}

	return children;
}

export default AuthLayout;

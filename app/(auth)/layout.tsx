import { headers } from "next/headers";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

export const dynamic = "force-dynamic";

async function AuthLayout({ children }: { children: ReactNode }) {
	const { auth } = await import("@/lib/auth");
	const session = await auth.api.getSession({ headers: await headers() });

	if (session) {
		redirect("/settings/domains");
	}

	return children;
}

export default AuthLayout;

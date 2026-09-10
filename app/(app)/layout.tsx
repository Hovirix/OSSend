import { headers } from "next/headers";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { AppShell } from "@/components/app-shell/app-shell";
export const dynamic = "force-dynamic";

async function AppLayout({ children }: { children: ReactNode }) {
	const [{ getSession }, { getUsableSendingAddresses }] = await Promise.all([import("@/lib/auth/session"), import("@/lib/domains/service")]);
	const session = await getSession(await headers());

	if (!session) {
		redirect("/sign-in");
	}
	const sendingAddresses = await getUsableSendingAddresses(session.user.id);
	return <AppShell userEmail={session.user.email} sendingAddresses={sendingAddresses.map((address) => ({ id: address.id, label: `${address.displayName ? `${address.displayName} <` : ""}${address.localPart}@${address.domainName}${address.displayName ? ">" : ""}` }))}>{children}</AppShell>;
}

export default AppLayout;

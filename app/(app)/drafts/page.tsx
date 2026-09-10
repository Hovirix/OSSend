import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";

import { listDrafts } from "@/lib/mail/drafts";

async function DraftsPage() {
	const { auth } = await import("@/lib/auth");
	const session = await auth.api.getSession({ headers: await headers() });
	if (!session) redirect("/sign-in");
	const drafts = await listDrafts(session.user.id);
	return <section className="p-5 md:p-6"><h1 className="text-[15px] font-semibold tracking-tight">Drafts</h1><div className="mt-5 divide-y border">{drafts.length ? drafts.map((draft) => <Link key={draft.id} href="/inbox" className="block px-3 py-3 text-sm hover:bg-muted"><p className="font-medium">{draft.subject || "(No subject)"}</p><p className="mt-1 truncate text-muted-foreground">{draft.snippet || "No message content"}</p>{draft.outboundStatus === "failed" ? <p className="mt-1 text-xs text-destructive">Failed to send. Open compose to retry.</p> : null}</Link>) : <p className="px-3 py-6 text-sm text-muted-foreground">No drafts.</p>}</div></section>;
}

export default DraftsPage;

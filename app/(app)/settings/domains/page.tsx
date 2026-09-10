import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { AddDomainForm } from "@/components/domains/domain-forms";
import { listDomains } from "@/lib/domains/service";

export default async function DomainsPage() {
	const { auth } = await import("@/lib/auth");
	const session = await auth.api.getSession({ headers: await headers() });
	if (!session) redirect("/sign-in");
	const domains = await listDomains(session.user.id);
	return <section className="max-w-3xl p-5 md:p-6"><h1 className="text-[15px] font-semibold tracking-tight">Domains</h1><p className="mt-1 text-sm text-muted-foreground">Add a domain to send and receive mail with hosted addresses.</p><div className="mt-6"><AddDomainForm /></div><div className="mt-6 divide-y border">{domains.length ? domains.map((domain) => <Link key={domain.id} href={`/settings/domains/${domain.id}`} className="flex items-center justify-between px-3 py-3 text-sm hover:bg-muted"><span>{domain.name}</span><span className={domain.status === "verified" ? "text-emerald-700" : domain.status === "failed" ? "text-destructive" : "text-amber-700"}>{domain.status === "verified" ? "Verified" : domain.status === "failed" ? "Failed" : "Pending"}</span></Link>) : <p className="px-3 py-6 text-sm text-muted-foreground">No domains yet.</p>}</div></section>;
}

import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";

import { AddressManager, CopyButton, DomainActions, DomainBackLink } from "@/components/domains/domain-forms";
import { getDomain, listAddressesForDomain, refreshDomainStatus } from "@/lib/domains/service";

export default async function DomainDetailsPage({ params }: { params: Promise<{ domainId: string }> }) {
	const { domainId } = await params;
	const { auth } = await import("@/lib/auth");
	const session = await auth.api.getSession({ headers: await headers() });
	if (!session) redirect("/sign-in");
	let domain = await getDomain(session.user.id, domainId);
	if (!domain) notFound();
	let providerState = null;
	try { providerState = await refreshDomainStatus(session.user.id, domainId); domain = await getDomain(session.user.id, domainId); } catch { /* The stored state remains safe to show if Resend is temporarily unavailable. */ }
	if (!domain) notFound();
	const addresses = await listAddressesForDomain(session.user.id, domainId);
	return <section className="max-w-4xl p-5 md:p-6"><DomainBackLink /><div className="mt-5 flex flex-wrap items-start justify-between gap-4"><div><h1 className="text-[15px] font-semibold tracking-tight">{domain.name}</h1><p className="mt-1 text-sm text-muted-foreground">Status: <span className="capitalize">{domain.status}</span></p></div><DomainActions domainId={domain.id} /></div><div className="mt-7 grid gap-3 border p-4 text-sm sm:grid-cols-2"><div><p className="font-medium">Sending</p><p className="text-muted-foreground">{providerState?.sendingEnabled ? "Enabled" : "Pending provider setup"}</p></div><div><p className="font-medium">Receiving</p><p className="text-muted-foreground">{providerState?.receivingEnabled ? "Enabled" : "Pending provider setup"}</p></div></div><section className="mt-8"><h2 className="text-sm font-semibold">DNS records</h2><p className="mt-1 text-sm text-muted-foreground">Add the records below at your DNS provider. Receiving requires the MX record returned by Resend.</p><div className="mt-3 overflow-x-auto border"><table className="w-full min-w-[680px] text-left text-sm"><thead className="border-b bg-muted/50 text-muted-foreground"><tr><th className="px-3 py-2 font-medium">Type</th><th className="px-3 py-2 font-medium">Name / host</th><th className="px-3 py-2 font-medium">Value</th><th className="px-3 py-2 font-medium">Priority</th><th className="px-3 py-2 font-medium">Status</th></tr></thead><tbody>{providerState?.records.length ? providerState.records.map((record, index) => <tr key={`${record.type}-${record.name}-${index}`} className="border-b last:border-0"><td className="px-3 py-2">{record.type}</td><td className="px-3 py-2 font-mono text-xs">{record.name} <CopyButton value={record.name} /></td><td className="px-3 py-2 font-mono text-xs break-all">{record.value} <CopyButton value={record.value} /></td><td className="px-3 py-2">{record.priority ?? "-"}</td><td className="px-3 py-2 capitalize">{record.status ?? "-"}</td></tr>) : <tr><td colSpan={5} className="px-3 py-5 text-muted-foreground">DNS records are temporarily unavailable. Use Check verification to try again.</td></tr>}</tbody></table></div></section><AddressManager domainId={domain.id} domainName={domain.name} canCreate={domain.status === "verified"} addresses={addresses} /></section>;
}

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { localPartSchema } from "@/db/contracts";
import { addDomainAction, createAddressAction, deleteAddressAction, deleteDomainAction, setAddressEnabledAction, verifyDomainAction } from "@/app/(app)/settings/domains/actions";

function ErrorMessage({ error }: { error: string | null }) {
	return error ? <p className="text-sm text-destructive" role="alert">{error}</p> : null;
}

export function AddDomainForm() {
	const router = useRouter();
	const [name, setName] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [pending, startTransition] = useTransition();
	function submit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault(); setError(null);
		startTransition(async () => {
			const response = await addDomainAction(name);
			if (!response.success) return setError(response.error);
			if (response.domainId) router.push(`/settings/domains/${response.domainId}`);
			else router.refresh();
		});
	}
	return <form onSubmit={submit} className="flex max-w-xl gap-2"><label className="sr-only" htmlFor="domain-name">Domain name</label><input id="domain-name" required value={name} onChange={(event) => setName(event.target.value)} placeholder="example.com" className="h-8 min-w-0 flex-1 rounded-md border bg-background px-2.5 text-sm" /><Button type="submit" disabled={pending}>{pending ? "Adding" : "Add domain"}</Button><ErrorMessage error={error} /></form>;
}

export function DomainActions({ domainId }: { domainId: string }) {
	const router = useRouter(); const [error, setError] = useState<string | null>(null); const [pending, startTransition] = useTransition();
	function verify() { setError(null); startTransition(async () => { const response = await verifyDomainAction(domainId); if (!response.success) setError(response.error); else router.refresh(); }); }
	function remove() { setError(null); startTransition(async () => { const response = await deleteDomainAction(domainId); if (!response.success) setError(response.error); else router.push("/settings/domains"); }); }
	return <div className="flex flex-wrap items-center gap-2"><Button onClick={verify} disabled={pending}>{pending ? "Checking" : "Check verification"}</Button><Button variant="destructive" onClick={remove} disabled={pending}>Delete domain</Button><ErrorMessage error={error} /></div>;
}

export function AddressManager({ domainId, domainName, canCreate, addresses }: { domainId: string; domainName: string; canCreate: boolean; addresses: { id: string; localPart: string; displayName: string | null; isEnabled: boolean }[] }) {
	const router = useRouter(); const [localPart, setLocalPart] = useState(""); const [displayName, setDisplayName] = useState(""); const [error, setError] = useState<string | null>(null); const [pending, startTransition] = useTransition();
	function create(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const parsed = localPartSchema.safeParse(localPart); if (!parsed.success) return setError(parsed.error.issues[0]?.message ?? "Enter a valid address name."); setError(null); startTransition(async () => { const response = await createAddressAction(domainId, parsed.data, displayName); if (!response.success) return setError(response.error); setLocalPart(""); setDisplayName(""); router.refresh(); }); }
	function change(addressId: string, enabled: boolean) { setError(null); startTransition(async () => { const response = await setAddressEnabledAction(domainId, addressId, enabled); if (!response.success) setError(response.error); else router.refresh(); }); }
	function remove(addressId: string) { setError(null); startTransition(async () => { const response = await deleteAddressAction(domainId, addressId); if (!response.success) setError(response.error); else router.refresh(); }); }
	return <section className="mt-8 border-t pt-6"><h2 className="text-sm font-semibold">Addresses</h2><div className="mt-3 divide-y border"><div className="grid grid-cols-[1fr_auto] gap-3 px-3 py-2 text-sm text-muted-foreground"><span>Email address</span><span>Status</span></div>{addresses.map((address) => <div key={address.id} className="grid grid-cols-[1fr_auto] items-center gap-3 px-3 py-3 text-sm"><div><p>{address.localPart}@{domainName}</p>{address.displayName ? <p className="text-xs text-muted-foreground">{address.displayName}</p> : null}</div><div className="flex items-center gap-2"><span className={address.isEnabled ? "text-emerald-700" : "text-muted-foreground"}>{address.isEnabled ? "Enabled" : "Disabled"}</span><Button size="sm" variant="outline" disabled={pending} onClick={() => change(address.id, !address.isEnabled)}>{address.isEnabled ? "Disable" : "Enable"}</Button><Button size="sm" variant="destructive" disabled={pending} onClick={() => remove(address.id)}>Delete</Button></div></div>)}</div>{canCreate ? <form onSubmit={create} className="mt-4 flex flex-wrap gap-2"><label className="sr-only" htmlFor="local-part">Address name</label><input id="local-part" required value={localPart} onChange={(event) => setLocalPart(event.target.value)} placeholder="hello" className="h-8 w-36 rounded-md border bg-background px-2.5 text-sm" /><span className="self-center text-sm text-muted-foreground">@{domainName}</span><input value={displayName} onChange={(event) => setDisplayName(event.target.value)} placeholder="Display name (optional)" className="h-8 w-48 rounded-md border bg-background px-2.5 text-sm" /><Button type="submit" disabled={pending}>Create address</Button></form> : <p className="mt-4 text-sm text-muted-foreground">Verify this domain before creating hosted addresses.</p>}<ErrorMessage error={error} /></section>;
}

export function DomainBackLink() { return <Link href="/settings/domains" className="text-sm text-muted-foreground hover:text-foreground">Back to domains</Link>; }

export function CopyButton({ value }: { value: string }) {
	const [copied, setCopied] = useState(false);
	return <Button size="xs" variant="outline" onClick={async () => { await navigator.clipboard.writeText(value); setCopied(true); window.setTimeout(() => setCopied(false), 1500); }}>{copied ? "Copied" : "Copy"}</Button>;
}

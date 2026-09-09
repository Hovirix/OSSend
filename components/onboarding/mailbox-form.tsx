"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { mailboxSchema } from "@/lib/mail/schemas";

function MailboxForm({
	defaultDisplayName,
	defaultEmail,
}: {
	defaultDisplayName: string;
	defaultEmail: string;
}) {
	const router = useRouter();
	const [displayName, setDisplayName] = useState(defaultDisplayName);
	const [email, setEmail] = useState(defaultEmail);
	const [error, setError] = useState<string | null>(null);
	const [isPending, startTransition] = useTransition();

	function submit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		const input = { displayName, email };
		const validation = mailboxSchema.safeParse(input);
		if (!validation.success) {
			setError(
				validation.error.issues[0]?.message ?? "Check the mailbox details.",
			);
			return;
		}

		setError(null);
		startTransition(async () => {
			try {
				const response = await fetch("/api/mailboxes", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify(input),
				});
				const result = (await response.json()) as
					| { success: true }
					| { success: false; error: string };
				if (result.success === false) {
					setError(result.error);
					return;
				}

				router.replace("/inbox");
				router.refresh();
			} catch {
				setError("Unable to create this mailbox. Please try again.");
			}
		});
	}

	return (
		<main className="flex min-h-svh items-center justify-center bg-muted/40 px-4 py-8">
			<section className="w-full max-w-sm border bg-background p-5 sm:p-6">
				<p className="text-sm font-semibold tracking-tight">OSSend</p>
				<h1 className="mt-5 text-[15px] font-semibold tracking-tight">
					Set up your mailbox
				</h1>
				<p className="mt-1 text-sm text-muted-foreground">
					Choose the name and address people will see when you send email.
				</p>
				<form onSubmit={submit} className="mt-6 space-y-4">
					<label className="block space-y-1.5 text-sm">
						<span>Display name</span>
						<input
							required
							value={displayName}
							onChange={(event) => setDisplayName(event.target.value)}
							autoComplete="name"
							className="h-8 w-full rounded-md border bg-background px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"
						/>
					</label>
					<label className="block space-y-1.5 text-sm">
						<span>Email address</span>
						<input
							required
							type="email"
							value={email}
							onChange={(event) => setEmail(event.target.value)}
							autoComplete="email"
							className="h-8 w-full rounded-md border bg-background px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"
						/>
					</label>
					{error ? <p className="text-sm text-destructive">{error}</p> : null}
					<Button type="submit" className="w-full" disabled={isPending}>
						{isPending ? "Creating mailbox" : "Create mailbox"}
					</Button>
				</form>
			</section>
		</main>
	);
}

export { MailboxForm };

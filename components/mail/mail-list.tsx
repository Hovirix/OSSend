"use client";

import { Search } from "lucide-react";
import { useState } from "react";

import type { MailSummary } from "@/lib/mail/types";

import { MailRow } from "./mail-row";

function MailList({
	mails,
	title = "Inbox",
}: {
	mails: MailSummary[];
	title?: string;
}) {
	const [query, setQuery] = useState("");
	const normalizedQuery = query.trim().toLowerCase();
	const filteredMails = mails.filter((mail) =>
		[mail.senderName, mail.senderEmail, mail.subject, mail.preview]
			.join(" ")
			.toLowerCase()
			.includes(normalizedQuery),
	);

	return (
		<section className="min-w-0">
			<div className="flex min-h-14 items-center gap-4 border-b px-4 md:px-6">
				<h1 className="text-[15px] font-semibold tracking-tight">{title}</h1>
				<div className="relative ml-auto w-full max-w-64">
					<Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
					<label className="sr-only" htmlFor="mail-search">
						Search {title.toLowerCase()}
					</label>
					<input
						id="mail-search"
						type="search"
						value={query}
						onChange={(event) => setQuery(event.target.value)}
						placeholder="Search"
						className="h-8 w-full rounded-md border bg-background py-1 pr-2 pl-8 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"
					/>
				</div>
			</div>
			<ul aria-label={`${title} conversations`}>
				{filteredMails.map((mail) => (
					<MailRow key={mail.id} mail={mail} />
				))}
			</ul>
			{filteredMails.length === 0 ? (
				<p className="px-4 py-10 text-center text-sm text-muted-foreground md:px-6">
					No conversations match your search.
				</p>
			) : null}
		</section>
	);
}

export { MailList };

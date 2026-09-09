import { Paperclip } from "lucide-react";
import Link from "next/link";

import type { MailThread } from "@/lib/mock-mails";
import { cn } from "@/lib/utils";

function MailRow({ mail }: { mail: MailThread }) {
	return (
		<li className="border-b last:border-b-0">
			<Link
				href={`/inbox/${mail.id}`}
				className={cn(
					"grid w-full grid-cols-[minmax(0,1fr)_auto] px-4 py-2.5 text-left outline-none transition-colors hover:bg-muted/60 focus-visible:bg-muted focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/50 md:grid-cols-[11rem_minmax(0,1fr)_3.75rem] md:items-center md:px-6",
					mail.unread && "bg-muted/30",
				)}
			>
				<div className="min-w-0">
					<p
						className={cn(
							"truncate text-sm text-foreground",
							mail.unread && "font-medium",
						)}
					>
						{mail.senderName}
					</p>
					<p className="hidden truncate text-xs text-muted-foreground md:block">
						{mail.senderEmail}
					</p>
				</div>
				<div className="col-span-2 mt-0.5 flex min-w-0 items-center gap-1.5 md:col-span-1 md:col-start-2 md:row-start-1 md:mt-0">
					{mail.hasAttachment ? (
						<Paperclip
							className="size-3 shrink-0 text-muted-foreground"
							aria-label="Has attachment"
						/>
					) : null}
					<p className="min-w-0 truncate text-sm text-muted-foreground">
						<span
							className={cn("text-foreground", mail.unread && "font-medium")}
						>
							{mail.subject}
						</span>
						<span className="text-muted-foreground"> - {mail.preview}</span>
					</p>
					{mail.messageCount ? (
						<span className="shrink-0 text-xs tabular-nums text-muted-foreground">
							{mail.messageCount}
						</span>
					) : null}
				</div>
				<time className="col-start-2 row-start-1 text-xs tabular-nums text-muted-foreground md:col-start-3">
					{mail.timestamp}
				</time>
			</Link>
		</li>
	);
}

export { MailRow };

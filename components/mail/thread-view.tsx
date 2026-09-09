import { Archive, ArrowLeft, Ellipsis, Trash2 } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import type { MailThreadData } from "@/lib/mail/types";

import { MessageItem } from "./message-item";
import { ReplyBox } from "./reply-box";

function ThreadView({ thread }: { thread: MailThreadData }) {
	return (
		<section className="min-w-0">
			<header className="flex min-h-14 items-center gap-2 border-b px-4 md:px-6">
				<Link
					href="/inbox"
					className="flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50"
					aria-label="Back to inbox"
				>
					<ArrowLeft className="size-4" />
				</Link>
				<h1 className="min-w-0 flex-1 truncate text-[15px] font-semibold tracking-tight">
					{thread.subject}
				</h1>
				<div className="flex shrink-0 items-center gap-1">
					<Button
						variant="ghost"
						size="icon-sm"
						aria-label="Archive conversation"
					>
						<Archive />
					</Button>
					<Button
						variant="ghost"
						size="icon-sm"
						aria-label="Delete conversation"
					>
						<Trash2 />
					</Button>
					<Button variant="ghost" size="icon-sm" aria-label="More options">
						<Ellipsis />
					</Button>
				</div>
			</header>
			<div className="mx-auto max-w-3xl px-4 md:px-6">
				{thread.messages.map((message) => (
					<MessageItem key={message.id} message={message} />
				))}
				<div className="py-6 md:py-8">
					<ReplyBox />
				</div>
			</div>
		</section>
	);
}

export { ThreadView };

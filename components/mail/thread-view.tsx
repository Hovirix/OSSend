import { ArrowLeft } from "lucide-react";
import Link from "next/link";

import type { MailThreadData } from "@/lib/mail/types";

import { MessageItem } from "./message-item";
import { ReplyBox } from "./reply-box";
import { ThreadMailboxActions } from "./thread-mailbox-actions";

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
				<ThreadMailboxActions threadId={thread.id} />
			</header>
			<div className="mx-auto max-w-3xl px-4 md:px-6">
				{thread.messages.map((message) => (
					<MessageItem key={message.id} message={message} />
				))}
				<div className="py-6 md:py-8">
				<ReplyBox parentMessageId={thread.messages.at(-1)?.id} />
				</div>
			</div>
		</section>
	);
}

export { ThreadView };

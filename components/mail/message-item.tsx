import { Paperclip } from "lucide-react";

import type { MailMessage } from "@/lib/mock-mails";

function MessageItem({ message }: { message: MailMessage }) {
	return (
		<article className="border-b py-6 last:border-b-0 md:py-8">
			<div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
				<div className="min-w-0">
					<p className="break-words text-sm font-medium text-foreground">
						{message.senderName}
						<span className="ml-1.5 break-all font-normal text-muted-foreground sm:break-normal">
							&lt;{message.senderEmail}&gt;
						</span>
					</p>
					<p className="mt-0.5 text-xs text-muted-foreground">
						To: {message.recipients}
					</p>
				</div>
				<time className="shrink-0 text-xs tabular-nums text-muted-foreground">
					{message.timestamp}
				</time>
			</div>
			<div className="mt-5 max-w-2xl whitespace-pre-wrap text-sm leading-6 text-foreground">
				{message.body}
			</div>
			{message.attachments?.length ? (
				<div className="mt-5 flex flex-wrap gap-2">
					{message.attachments.map((attachment) => (
						<div
							key={attachment.name}
							className="flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-xs text-muted-foreground"
						>
							<Paperclip className="size-3" />
							<span className="text-foreground">{attachment.name}</span>
							<span>{attachment.size}</span>
						</div>
					))}
				</div>
			) : null}
			{message.isCurrentUser && message.deliveryStatus ? (
				<p className="mt-4 text-xs text-muted-foreground">
					{message.deliveryStatus}
				</p>
			) : null}
		</article>
	);
}

export { MessageItem };

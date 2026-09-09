"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";

function ReplyBox() {
	const [isOpen, setIsOpen] = useState(false);
	const [reply, setReply] = useState("");

	function closeReply() {
		setReply("");
		setIsOpen(false);
	}

	if (!isOpen) {
		return (
			<Button variant="outline" onClick={() => setIsOpen(true)}>
				Reply
			</Button>
		);
	}

	return (
		<form
			onSubmit={(event) => {
				event.preventDefault();
				closeReply();
			}}
			className="border"
		>
			<label className="sr-only" htmlFor="thread-reply">
				Reply
			</label>
			<textarea
				id="thread-reply"
				value={reply}
				onChange={(event) => setReply(event.target.value)}
				placeholder="Write a reply..."
				className="min-h-32 w-full resize-y bg-background p-3 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/50"
			/>
			<div className="flex items-center justify-end gap-2 border-t px-3 py-2">
				<Button type="button" variant="ghost" size="sm" onClick={closeReply}>
					Cancel
				</Button>
				<Button type="submit" size="sm" disabled={!reply.trim()}>
					Send reply
				</Button>
			</div>
		</form>
	);
}

export { ReplyBox };

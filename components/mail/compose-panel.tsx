"use client";

import { MoreHorizontal, Paperclip, Send, X } from "lucide-react";
import { type FormEvent, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
} from "@/components/ui/sheet";

function ComposePanel({
	open,
	onOpenChange,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}) {
	const [to, setTo] = useState("");
	const [cc, setCc] = useState("");
	const [bcc, setBcc] = useState("");
	const [subject, setSubject] = useState("");
	const [body, setBody] = useState("");
	const [showCcBcc, setShowCcBcc] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [isPending, startTransition] = useTransition();

	function clearDraft() {
		setTo("");
		setCc("");
		setBcc("");
		setSubject("");
		setBody("");
		setShowCcBcc(false);
	}

	function closeComposer() {
		clearDraft();
		setError(null);
		onOpenChange(false);
	}

	function handleOpenChange(nextOpen: boolean) {
		if (!nextOpen) {
			clearDraft();
			setError(null);
		}
		onOpenChange(nextOpen);
	}

	const canSend = Boolean(to.trim() && subject.trim() && body.trim());

	function submit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		if (!canSend) {
			return;
		}

		setError(null);
		startTransition(async () => {
			try {
				const response = await fetch("/api/mail/send", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ to, cc, bcc, subject, body }),
				});
				const result = (await response.json()) as
					| { success: true }
					| { success: false; error: string };
				if (result.success === false) {
					setError(result.error);
					return;
				}

				closeComposer();
			} catch {
				setError("Unable to send this message. Please try again.");
			}
		});
	}

	return (
		<Sheet open={open} onOpenChange={handleOpenChange}>
			<SheetContent
				side="bottom"
				showCloseButton={false}
				className="data-[side=bottom]:h-[85svh] data-[side=bottom]:max-h-[42rem] data-[side=bottom]:gap-0 data-[side=bottom]:rounded-t-md data-[side=bottom]:p-0 md:data-[side=bottom]:inset-x-auto md:data-[side=bottom]:right-4 md:data-[side=bottom]:bottom-4 md:data-[side=bottom]:h-[34rem] md:data-[side=bottom]:w-[min(38rem,calc(100vw-2rem))] md:data-[side=bottom]:rounded-md md:data-[side=bottom]:border"
			>
				<SheetHeader className="flex h-11 shrink-0 flex-row items-center justify-between border-b p-0 pl-3">
					<SheetTitle className="text-sm font-medium">New message</SheetTitle>
					<SheetDescription className="sr-only">
						Compose a new email message.
					</SheetDescription>
					<Button
						type="button"
						variant="ghost"
						size="icon-sm"
						onClick={closeComposer}
						aria-label="Discard draft"
					>
						<X />
					</Button>
				</SheetHeader>
				<form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
					<div className="flex min-h-10 items-center gap-2 border-b px-3">
						<label
							className="w-12 shrink-0 text-xs text-muted-foreground"
							htmlFor="compose-to"
						>
							To
						</label>
						<input
							id="compose-to"
							value={to}
							onChange={(event) => setTo(event.target.value)}
							className="min-w-0 flex-1 bg-transparent py-2 text-sm outline-none placeholder:text-muted-foreground focus-visible:bg-muted/30"
							placeholder="Recipients"
						/>
						<Button
							type="button"
							variant="ghost"
							size="xs"
							onClick={() => setShowCcBcc((visible) => !visible)}
						>
							Cc / Bcc
						</Button>
					</div>
					{showCcBcc ? (
						<>
							<div className="flex min-h-10 items-center gap-2 border-b px-3">
								<label
									className="w-12 shrink-0 text-xs text-muted-foreground"
									htmlFor="compose-cc"
								>
									Cc
								</label>
								<input
									id="compose-cc"
									value={cc}
									onChange={(event) => setCc(event.target.value)}
									className="min-w-0 flex-1 bg-transparent py-2 text-sm outline-none placeholder:text-muted-foreground focus-visible:bg-muted/30"
									placeholder="Carbon copy"
								/>
							</div>
							<div className="flex min-h-10 items-center gap-2 border-b px-3">
								<label
									className="w-12 shrink-0 text-xs text-muted-foreground"
									htmlFor="compose-bcc"
								>
									Bcc
								</label>
								<input
									id="compose-bcc"
									value={bcc}
									onChange={(event) => setBcc(event.target.value)}
									className="min-w-0 flex-1 bg-transparent py-2 text-sm outline-none placeholder:text-muted-foreground focus-visible:bg-muted/30"
									placeholder="Blind carbon copy"
								/>
							</div>
						</>
					) : null}
					<div className="flex min-h-10 items-center gap-2 border-b px-3">
						<label
							className="w-12 shrink-0 text-xs text-muted-foreground"
							htmlFor="compose-subject"
						>
							Subject
						</label>
						<input
							id="compose-subject"
							value={subject}
							onChange={(event) => setSubject(event.target.value)}
							className="min-w-0 flex-1 bg-transparent py-2 text-sm outline-none placeholder:text-muted-foreground focus-visible:bg-muted/30"
						/>
					</div>
					<label className="sr-only" htmlFor="compose-body">
						Message body
					</label>
					<textarea
						id="compose-body"
						value={body}
						onChange={(event) => setBody(event.target.value)}
						placeholder="Write your message..."
						className="min-h-32 flex-1 resize-none bg-background p-3 text-sm leading-6 outline-none placeholder:text-muted-foreground focus-visible:bg-muted/30"
					/>
					{error ? (
						<p className="border-t px-3 py-2 text-sm text-destructive">
							{error}
						</p>
					) : null}
					<footer className="flex h-12 shrink-0 items-center gap-1 border-t px-3">
						<Button type="submit" size="sm" disabled={!canSend || isPending}>
							<Send />
							{isPending ? "Sending" : "Send"}
						</Button>
						<Button
							type="button"
							variant="ghost"
							size="icon-sm"
							aria-label="Attach file"
						>
							<Paperclip />
						</Button>
						<Button
							type="button"
							variant="ghost"
							size="icon-sm"
							aria-label="More compose options"
						>
							<MoreHorizontal />
						</Button>
						<Button
							type="button"
							variant="ghost"
							size="sm"
							className="ml-auto"
							onClick={closeComposer}
						>
							Discard
						</Button>
					</footer>
				</form>
			</SheetContent>
		</Sheet>
	);
}

export { ComposePanel };

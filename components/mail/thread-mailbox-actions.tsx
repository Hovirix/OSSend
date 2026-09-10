"use client";

import { Archive, Trash2 } from "lucide-react";
import { useTransition } from "react";

import { setThreadMailboxStateAction } from "@/app/(app)/mail-actions";
import { Button } from "@/components/ui/button";

export function ThreadMailboxActions({ threadId }: { threadId: string }) {
	const [, startTransition] = useTransition();
	function update(state: "archive" | "trash") { startTransition(async () => { await setThreadMailboxStateAction(threadId, state); }); }
	return <div className="flex shrink-0 items-center gap-1"><Button variant="ghost" size="icon-sm" aria-label="Archive conversation" onClick={() => update("archive")}><Archive /></Button><Button variant="ghost" size="icon-sm" aria-label="Delete conversation" onClick={() => update("trash")}><Trash2 /></Button></div>;
}

"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";

import { addAttachment, createDraft, DraftError, sendMessage } from "@/lib/mail/drafts";
import { getBlobStorage } from "@/lib/storage/filesystem";

async function userId() { const { auth } = await import("@/lib/auth"); const session = await auth.api.getSession({ headers: await headers() }); if (!session) throw new DraftError("Your session has expired. Sign in again.", "not-found"); return session.user.id; }
function failure(error: unknown) { return { success: false as const, error: error instanceof DraftError ? error.message : "Unable to save this message." }; }
async function save(input: unknown, files: File[]) {
	const id = await userId(); const draft = await createDraft(id, input); if (!draft) throw new DraftError("Unable to create draft.", "conflict"); const storage = getBlobStorage();
	for (const file of files) await addAttachment(id, draft.id, { filename: file.name, contentType: file.type || "application/octet-stream", data: new Uint8Array(await file.arrayBuffer()) }, storage);
	return { id, storage };
}
export async function saveDraftAction(input: unknown, files: File[]) { try { const draft = await save(input, files); revalidatePath("/drafts"); return { success: true as const, messageId: draft.id }; } catch (error) { return failure(error); } }
export async function sendNewMessageAction(input: unknown, files: File[]) { try { const draft = await save(input, files); await sendMessage(await userId(), draft.id, draft.storage); revalidatePath("/sent"); revalidatePath("/drafts"); return { success: true as const }; } catch (error) { return failure(error); } }

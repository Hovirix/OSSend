import { Buffer } from "node:buffer";
import { headers } from "next/headers";

import { getSession } from "@/lib/auth/session";
import { getAttachmentForUser } from "@/db/queries/mail";
import { getBlobStorage } from "@/lib/storage/filesystem";

export const runtime = "nodejs";

export async function GET(_: Request, { params }: { params: Promise<{ attachmentId: string }> }) {
	const session = await getSession(await headers());
	if (!session) return new Response("Unauthorized", { status: 401 });
	const attachment = await getAttachmentForUser(session.user.id, (await params).attachmentId);
	if (!attachment) return new Response("Not found", { status: 404 });
	try {
		const data = await getBlobStorage().get(attachment.blobKey);
		return new Response(Buffer.from(data), { headers: { "Content-Type": attachment.contentType, "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(attachment.filename)}`, "X-Content-Type-Options": "nosniff" } });
	} catch { return new Response("Not found", { status: 404 }); }
}

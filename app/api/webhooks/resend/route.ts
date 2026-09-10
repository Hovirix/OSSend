import { getInboundTransport } from "@/lib/mail/providers/resend";
import { receiveInboundEvent } from "@/lib/mail/receive";
import { getBlobStorage } from "@/lib/storage/filesystem";

export const runtime = "nodejs";

export async function POST(request: Request) {
	try {
		const event = await getInboundTransport().verifyWebhook({ body: new Uint8Array(await request.arrayBuffer()), headers: request.headers });
		if (!event) return Response.json({ received: true });
		const result = await receiveInboundEvent(event, getInboundTransport(), getBlobStorage());
		return Response.json({ received: true, status: result.status });
	} catch (error) {
		console.error("Unable to process Resend inbound email", { error: error instanceof Error ? error.message : "Unknown error" });
		const status = error instanceof Error && (error.message.includes("signature") || error.message.includes("webhook")) ? 400 : 500;
		return Response.json({ error: "Unable to process webhook." }, { status });
	}
}

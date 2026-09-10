export const runtime = "nodejs";

export async function POST(request: Request) {
	let message: import("@/lib/mail/types").IncomingMessage | null;
	const id = request.headers.get("svix-id");
	const timestamp = request.headers.get("svix-timestamp");
	const signature = request.headers.get("svix-signature");
	if (!id || !timestamp || !signature) {
		return Response.json({ error: "Invalid webhook." }, { status: 400 });
	}

	const payload = await request.text();
	try {
		const { parseResendIncomingMessage } = await import(
			"@/lib/mail/providers/resend"
		);
		message = await parseResendIncomingMessage({
			payload,
			headers: { id, timestamp, signature },
		});
	} catch {
		return Response.json({ error: "Invalid webhook." }, { status: 400 });
	}

	if (!message) {
		return Response.json({ received: true });
	}

	try {
		const { handleIncomingMessage } = await import("@/lib/mail/receive");
		const result = await handleIncomingMessage(message);
		return Response.json({ received: true, status: result.status });
	} catch (error) {
		console.error("Unable to process Resend inbound email", {
			externalId: message.externalId,
			error: error instanceof Error ? error.message : "Unknown error",
		});
		return Response.json(
			{ error: "Unable to process webhook." },
			{ status: 500 },
		);
	}
}

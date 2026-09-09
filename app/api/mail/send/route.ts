export async function POST(request: Request) {
	let input: unknown;
	try {
		input = await request.json();
	} catch {
		return Response.json(
			{ success: false, error: "Invalid request body." },
			{ status: 400 },
		);
	}

	try {
		const { sendEmail } = await import("@/lib/mail/send");
		const result = await sendEmail(input, request.headers);
		return Response.json(result, { status: result.success ? 200 : 400 });
	} catch {
		return Response.json(
			{ success: false, error: "Unable to send this message." },
			{ status: 500 },
		);
	}
}

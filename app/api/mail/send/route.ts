export async function POST(request: Request) {
	void request;
	return Response.json({ success: false, error: "Use the authenticated compose flow." }, { status: 410 });
}

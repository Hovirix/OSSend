export async function POST(request: Request) {
	const { auth } = await import("@/lib/auth");
	const session = await auth.api.getSession({ headers: request.headers });
	if (!session) {
		return Response.json(
			{ success: false, error: "Your session has expired. Sign in again." },
			{ status: 401 },
		);
	}

	return Response.json(
		{ success: false, error: "Create a verified domain and hosted address in Settings." },
		{ status: 410 },
	);
}

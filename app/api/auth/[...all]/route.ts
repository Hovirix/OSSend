import { toNextJsHandler } from "better-auth/next-js";

async function handler() {
	const { auth } = await import("@/lib/auth");
	return toNextJsHandler(auth);
}

export async function GET(request: Request) {
	return (await handler()).GET(request);
}

export async function POST(request: Request) {
	return (await handler()).POST(request);
}

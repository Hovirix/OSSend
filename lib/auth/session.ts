import { auth } from "../auth";

export async function getSession(requestHeaders: Headers) {
	try {
		return await auth.api.getSession({ headers: requestHeaders });
	} catch {
		// A stale or malformed signed cookie is not an application error.
		return null;
	}
}

export async function requireSession(requestHeaders: Headers) {
	const session = await getSession(requestHeaders);
	if (!session) {
		throw new Error("Authentication required.");
	}
	return session;
}

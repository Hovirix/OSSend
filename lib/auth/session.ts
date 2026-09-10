import { auth } from "../auth";

export async function getSession(requestHeaders: Headers) {
	return auth.api.getSession({ headers: requestHeaders });
}

export async function requireSession(requestHeaders: Headers) {
	const session = await getSession(requestHeaders);
	if (!session) {
		throw new Error("Authentication required.");
	}
	return session;
}

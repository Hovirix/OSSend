import { headers } from "next/headers";
import { notFound } from "next/navigation";

import { ThreadView } from "@/components/mail/thread-view";

async function ThreadPage({
	params,
}: {
	params: Promise<{ threadId: string }>;
}) {
	const { threadId } = await params;
	const [{ auth }, { getThreadForUser }] = await Promise.all([
		import("@/lib/auth"),
		import("@/db/queries/mail"),
	]);
	const session = await auth.api.getSession({ headers: await headers() });
	const thread = session
		? await getThreadForUser(session.user.id, threadId)
		: null;

	if (thread) {
		return <ThreadView thread={thread} />;
	}

	notFound();
}

export default ThreadPage;

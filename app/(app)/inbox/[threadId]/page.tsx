import { headers } from "next/headers";
import { notFound } from "next/navigation";

import { ThreadView } from "@/components/mail/thread-view";
import { getMockMail } from "@/lib/mail/mock";

async function ThreadPage({
	params,
}: {
	params: Promise<{ threadId: string }>;
}) {
	const { threadId } = await params;
	const [{ auth }, { getThreadForUser }] = await Promise.all([
		import("@/lib/auth"),
		import("@/lib/mail/queries"),
	]);
	const session = await auth.api.getSession({ headers: await headers() });
	const thread = session
		? await getThreadForUser(session.user.id, threadId)
		: null;

	if (thread) {
		return <ThreadView thread={thread} />;
	}

	const mockThread = getMockMail(threadId);
	if (!mockThread) {
		notFound();
	}

	return <ThreadView thread={mockThread} />;
}

export default ThreadPage;

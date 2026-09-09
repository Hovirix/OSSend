import { notFound } from "next/navigation";

import { ThreadView } from "@/components/mail/thread-view";
import { getMockMail } from "@/lib/mock-mails";

async function ThreadPage({
	params,
}: {
	params: Promise<{ threadId: string }>;
}) {
	const { threadId } = await params;
	const thread = getMockMail(threadId);

	if (!thread) {
		notFound();
	}

	return <ThreadView thread={thread} />;
}

export default ThreadPage;

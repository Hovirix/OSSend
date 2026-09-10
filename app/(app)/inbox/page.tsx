import { MailList } from "@/components/mail/mail-list";

export const dynamic = "force-dynamic";

async function InboxPage() {
	const [{ auth }, { getInboxThreads }, { headers }] = await Promise.all([
		import("@/lib/auth"),
		import("@/db/queries/mail"),
		import("next/headers"),
	]);
	const session = await auth.api.getSession({ headers: await headers() });
	const mails = session ? await getInboxThreads(session.user.id) : [];

	return <MailList mails={mails} />;
}

export default InboxPage;

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { MailList } from "@/components/mail/mail-list";

async function SentPage() {
	const [{ auth }, { getSentMessages }] = await Promise.all([
		import("@/lib/auth"),
		import("@/db/queries/mail"),
	]);
	const session = await auth.api.getSession({ headers: await headers() });
	if (!session) {
		redirect("/sign-in");
	}

	const messages = await getSentMessages(session.user.id);
	return <MailList mails={messages} title="Sent" />;
}

export default SentPage;

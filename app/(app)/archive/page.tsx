import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { MailList } from "@/components/mail/mail-list";

async function ArchivePage() {
	const [{ auth }, { getArchivedThreads }] = await Promise.all([import("@/lib/auth"), import("@/db/queries/mail")]);
	const session = await auth.api.getSession({ headers: await headers() });
	if (!session) redirect("/sign-in");
	return <MailList mails={await getArchivedThreads(session.user.id)} title="Archive" />;
}

export default ArchivePage;

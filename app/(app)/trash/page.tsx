import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { MailList } from "@/components/mail/mail-list";

export default async function TrashPage() {
	const [{ getSession }, { getTrashThreads }] = await Promise.all([import("@/lib/auth/session"), import("@/db/queries/mail")]);
	const session = await getSession(await headers());
	if (!session) redirect("/sign-in");
	return <MailList mails={await getTrashThreads(session.user.id)} title="Trash" />;
}

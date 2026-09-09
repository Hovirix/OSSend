import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { MailboxForm } from "@/components/onboarding/mailbox-form";

async function MailboxOnboardingPage() {
	const { auth } = await import("@/lib/auth");
	const session = await auth.api.getSession({ headers: await headers() });
	if (!session) {
		redirect("/sign-in");
	}

	return (
		<MailboxForm
			defaultDisplayName={session.user.name}
			defaultEmail={session.user.email}
		/>
	);
}

export default MailboxOnboardingPage;

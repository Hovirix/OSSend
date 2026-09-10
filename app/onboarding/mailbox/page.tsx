import { redirect } from "next/navigation";

async function MailboxOnboardingPage() {
	redirect("/settings/domains");
}

export default MailboxOnboardingPage;

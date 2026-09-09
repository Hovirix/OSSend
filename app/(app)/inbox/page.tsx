import { MailList } from "@/components/mail/mail-list";
import { mockMails } from "@/lib/mail/mock";

function InboxPage() {
	return <MailList mails={mockMails} />;
}

export default InboxPage;

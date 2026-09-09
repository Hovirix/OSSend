import { MailList } from "@/components/mail/mail-list";
import { mockMails } from "@/lib/mock-mails";

function InboxPage() {
	return <MailList mails={mockMails} />;
}

export default InboxPage;

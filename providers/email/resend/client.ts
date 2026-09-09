import { Resend } from "resend";

import { getEmailEnvironment } from "@/lib/env";

export function createResendClient() {
	const { RESEND_API_KEY } = getEmailEnvironment();
	return new Resend(RESEND_API_KEY);
}

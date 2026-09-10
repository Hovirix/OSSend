import {
	persistIncomingMessage,
	type ReceiveInboundEmailResult,
} from "@/db/queries/mail";

import type { IncomingMessage } from "./types";

export type { ReceiveInboundEmailResult };

export async function handleIncomingMessage(
	email: IncomingMessage,
): Promise<ReceiveInboundEmailResult> {
	return persistIncomingMessage(email);
}

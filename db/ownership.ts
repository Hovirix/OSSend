import { and, eq } from "drizzle-orm";

import { addresses, auditLogs, domains, messages, threads } from "./schema";

export function ownedDomain(userId: string, domainId: string) {
	return and(eq(domains.id, domainId), eq(domains.userId, userId));
}

export function ownedAddress(userId: string, addressId: string) {
	return and(eq(addresses.id, addressId), eq(addresses.userId, userId));
}

export function ownedThread(userId: string, threadId: string) {
	return and(eq(threads.id, threadId), eq(threads.userId, userId));
}

export function ownedMessage(userId: string, messageId: string) {
	return and(eq(messages.id, messageId), eq(messages.userId, userId));
}

export function ownedAuditLog(userId: string, auditLogId: string) {
	return and(eq(auditLogs.id, auditLogId), eq(auditLogs.userId, userId));
}

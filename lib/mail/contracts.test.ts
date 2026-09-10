import { describe, expect, it } from "vitest";

import {
	normalizedInboundMessageSchema,
	normalizedOutgoingMessageSchema,
} from "./contracts";

describe("normalized mail contracts", () => {
	it("validates inbound provider data at the transport boundary", () => {
		const message = normalizedInboundMessageSchema.parse({
			provider: "provider-a",
			externalId: "external-message-1",
			from: { email: "Sender@Example.test" },
			recipients: [{ role: "to", position: 0, email: "recipient@example.test" }],
			receivedAt: "2026-09-10T00:00:00.000Z",
		});

		expect(message.from.email).toBe("sender@example.test");
		expect(message.attachments).toEqual([]);
	});

	it("requires a recipient and stable idempotency key for outbound mail", () => {
		expect(() => normalizedOutgoingMessageSchema.parse({
			from: { email: "sender@example.test" },
			recipients: [],
			idempotencyKey: "ossend-message/1",
		})).toThrow();
	});

	it("retains attachments and the caller-provided stable idempotency key", () => {
		const message = normalizedOutgoingMessageSchema.parse({
			from: { email: "sender@example.test" }, recipients: [{ role: "to", position: 0, email: "recipient@example.test" }],
			attachments: [{ filename: "note.txt", contentType: "text/plain", sizeBytes: 2, disposition: "attachment", data: new Uint8Array([1, 2]) }], idempotencyKey: "ossend-message/message-1",
		});
		expect(message.idempotencyKey).toBe("ossend-message/message-1");
		expect(message.attachments).toHaveLength(1);
	});
});

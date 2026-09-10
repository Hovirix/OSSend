import { describe, expect, it } from "vitest";

import { LocalMailProvider } from "./local";

describe("LocalMailProvider", () => {
	it("accepts outbound mail without external credentials", async () => {
		const result = await new LocalMailProvider().send({
			from: "sender@example.test",
			replyTo: "sender@example.test",
			to: ["recipient@example.test"],
			cc: [],
			bcc: [],
			subject: "Local message",
			text: "Hello",
			html: "<p>Hello</p>",
			idempotencyKey: "outbound/test-message",
		});

		expect(result).toEqual({ externalId: "local/outbound/test-message" });
	});
});

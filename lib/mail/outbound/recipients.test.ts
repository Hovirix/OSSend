import { describe, expect, it } from "vitest";

import { replyAllRecipients, replyRecipients } from "./recipients";

describe("outbound reply recipients", () => {
	it("addresses a reply to the original sender", () => {
		expect(replyRecipients("Sender@Example.test", "Sender")).toEqual([{ email: "sender@example.test", name: "Sender" }]);
	});

	it("calculates reply-all recipients without the selected sending identity", () => {
		expect(replyAllRecipients("sender@example.test", null, [
			{ role: "to", email: "me@example.test", name: null },
			{ role: "cc", email: "team@example.test", name: "Team" },
			{ role: "bcc", email: "hidden@example.test", name: null },
		], "me@example.test")).toEqual([
			{ email: "sender@example.test" },
			{ email: "team@example.test", name: "Team" },
		]);
	});
});

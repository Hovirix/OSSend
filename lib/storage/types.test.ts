import { describe, expect, it } from "vitest";

import { attachmentBlobKey, rawEmailBlobKey } from "./types";

describe("blob storage keys", () => {
	it("uses portable logical object keys", () => {
		expect(rawEmailBlobKey("user-1", "message-1")).toBe("raw/user-1/message-1.eml");
		expect(attachmentBlobKey("user-1", "message-1", "attachment-1")).toBe("attachments/user-1/message-1/attachment-1");
	});
});

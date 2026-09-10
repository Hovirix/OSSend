import { describe, expect, it } from "vitest";

import { domainNameSchema, localPartSchema } from "./contracts";

describe("domain boundary contracts", () => {
	it("normalizes domains to canonical ASCII without a trailing dot", () => {
		expect(domainNameSchema.parse(" BÜCHER.example. ")).toBe("xn--bcher-kva.example");
	});

	it("normalizes local parts to lowercase", () => {
		expect(localPartSchema.parse(" Sales ")).toBe("sales");
	});

	it("accepts practical hosted address local parts", () => {
		for (const localPart of ["john.smith", "orders-uk", "notifications_test"]) {
			expect(localPartSchema.parse(localPart)).toBe(localPart);
		}
	});

	it("rejects malformed hosted address local parts", () => {
		for (const localPart of ["", "has space", "a@b", ".start", "end.", "two..dots", "line\nbreak"]) {
			expect(() => localPartSchema.parse(localPart)).toThrow();
		}
	});

	it("rejects URL components that are not domain names", () => {
		expect(() => domainNameSchema.parse("example.test/path")).toThrow();
	});
});

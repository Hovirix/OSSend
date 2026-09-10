import { describe, expect, it } from "vitest";

import { mapResendDomainStatus } from "./contracts";
import type { DomainProvider } from "./types";

describe("domain provider contracts", () => {
	it("maps Resend states to canonical domain states safely", () => {
		expect(mapResendDomainStatus("verified")).toBe("verified");
		expect(mapResendDomainStatus("failed")).toBe("failed");
		expect(mapResendDomainStatus("partially_failed")).toBe("failed");
		expect(mapResendDomainStatus("partially_verified")).toBe("pending");
		expect(mapResendDomainStatus("new_provider_state")).toBe("pending");
	});

	it("can be exercised with a provider-neutral mock", async () => {
		const provider: DomainProvider = {
			createDomain: async (name) => ({ externalId: "domain_123", status: "pending", records: [{ type: "MX", name, value: "mx.resend.com", priority: 10, status: "pending" }], sendingEnabled: true, receivingEnabled: true }),
			getDomain: async () => ({ externalId: "domain_123", status: "verified", records: [], sendingEnabled: true, receivingEnabled: true }),
			verifyDomain: async () => undefined,
			deleteDomain: async () => undefined,
		};

		await provider.verifyDomain("domain_123");
		expect(mapResendDomainStatus((await provider.getDomain("domain_123")).status)).toBe("verified");
	});
});

import { beforeEach, describe, expect, it, vi } from "vitest";

import type { DomainProvider } from "./types";

const queryResult = vi.hoisted(() => ({ rows: [] as { id: string }[] }));

vi.mock("@/db", () => ({
	db: {
		select: () => ({
			from: () => ({
				where: () => ({ limit: async () => queryResult.rows }),
			}),
		}),
	},
}));

import { createDomain, DomainServiceError } from "./service";

function provider(overrides: Partial<DomainProvider> = {}): DomainProvider {
	return {
		createDomain: vi.fn(async () => ({ externalId: "domain_123", status: "pending", records: [], sendingEnabled: true, receivingEnabled: true })),
		getDomain: vi.fn(),
		verifyDomain: vi.fn(),
		deleteDomain: vi.fn(),
		...overrides,
	};
}

describe("createDomain", () => {
	beforeEach(() => { queryResult.rows = []; });

	it("does not call the provider when the canonical domain is already owned", async () => {
		queryResult.rows = [{ id: "existing-domain" }];
		const mockedProvider = provider();

		await expect(createDomain("user_1", { name: "Example.COM." }, mockedProvider)).rejects.toMatchObject<Partial<DomainServiceError>>({ kind: "conflict" });
		expect(mockedProvider.createDomain).not.toHaveBeenCalled();
	});

	it("maps a provider failure to a safe application error", async () => {
		const mockedProvider = provider({ createDomain: vi.fn(async () => { throw new Error("provider API key details"); }) });

		await expect(createDomain("user_1", { name: "example.com" }, mockedProvider)).rejects.toMatchObject<Partial<DomainServiceError>>({ message: "Unable to register this domain. Try again later.", kind: "provider" });
	});
});

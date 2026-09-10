import { Resend } from "resend";

import { getResendEnvironment } from "@/lib/env";

import type { DnsRecord, DomainProvider, ProviderDomain } from "./types";

function client() {
	return new Resend(getResendEnvironment().RESEND_API_KEY);
}

function normalizeDomain(data: {
	id: string;
	status: string;
	records: Array<{
		type: string;
		name: string;
		value: string;
		priority?: number;
		status?: string;
	}>;
	capabilities: { sending: string; receiving: string };
}): ProviderDomain {
	return {
		externalId: data.id,
		status: data.status,
		records: data.records.map(
			(record): DnsRecord => ({
				type: record.type,
				name: record.name,
				value: record.value,
				priority: record.priority,
				status: record.status,
			}),
		),
		sendingEnabled: data.capabilities.sending === "enabled",
		receivingEnabled: data.capabilities.receiving === "enabled",
	};
}

function requireData<T>(response: { data: T | null; error: { message: string } | null }) {
	if (!response.data || response.error) {
		throw new Error("The domain provider could not complete that request.");
	}
	return response.data;
}

export class ResendDomainProvider implements DomainProvider {
	async createDomain(name: string): Promise<ProviderDomain> {
		const data = requireData(
			await client().domains.create({
				name,
				capabilities: { sending: "enabled", receiving: "enabled" },
			}),
		);
		return normalizeDomain(data);
	}

	async getDomain(externalId: string): Promise<ProviderDomain> {
		return normalizeDomain(requireData(await client().domains.get(externalId)));
	}

	async verifyDomain(externalId: string): Promise<void> {
		requireData(await client().domains.verify(externalId));
	}

	async deleteDomain(externalId: string): Promise<void> {
		requireData(await client().domains.remove(externalId));
	}
}

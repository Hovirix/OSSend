import type { DomainStatus } from "@/db/states";

export type DnsRecord = {
	type: string;
	name: string;
	value: string;
	priority?: number;
	status?: string;
};

export type ProviderDomain = {
	externalId: string;
	status: string;
	records: DnsRecord[];
	sendingEnabled: boolean;
	receivingEnabled: boolean;
};

export type CreatedProviderDomain = ProviderDomain;

export interface DomainProvider {
	createDomain(name: string): Promise<CreatedProviderDomain>;
	getDomain(externalId: string): Promise<ProviderDomain>;
	verifyDomain(externalId: string): Promise<void>;
	deleteDomain(externalId: string): Promise<void>;
}

export type DomainProviderState = ProviderDomain & {
	canonicalStatus: DomainStatus;
};

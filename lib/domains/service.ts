import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import { domainNameSchema, localPartSchema } from "@/db/contracts";
import { createId } from "@/db/ids";
import { ownedAddress, ownedDomain } from "@/db/ownership";
import { addresses, auditLogs, domainProviderBindings, domains, messages } from "@/db/schema";

import { getDomainProvider } from "./provider";
import { mapResendDomainStatus } from "./contracts";
import type { DomainProvider, DomainProviderState, ProviderDomain } from "./types";

export { mapResendDomainStatus } from "./contracts";

const createDomainSchema = z.object({ name: domainNameSchema });
const createAddressSchema = z.object({
	domainId: z.string().uuid(),
	localPart: localPartSchema,
	displayName: z.string().trim().min(1).max(120).optional(),
});
const updateAddressSchema = z.object({
	displayName: z.string().trim().min(1).max(120).nullable().optional(),
	isEnabled: z.boolean().optional(),
});

export class DomainServiceError extends Error {
	constructor(
		message: string,
		readonly kind: "conflict" | "not-found" | "provider" | "validation" = "validation",
	) {
		super(message);
	}
}

function providerOrDefault(provider?: DomainProvider) {
	return provider ?? getDomainProvider();
}

function parse<T>(schema: z.ZodType<T>, input: unknown): T {
	const result = schema.safeParse(input);
	if (!result.success) {
		throw new DomainServiceError(
			result.error.issues[0]?.message ?? "Invalid input.",
			"validation",
		);
	}
	return result.data;
}

async function getBinding(userId: string, domainId: string) {
	const [binding] = await db
		.select({ id: domainProviderBindings.id, externalId: domainProviderBindings.externalId })
		.from(domainProviderBindings)
		.innerJoin(domains, eq(domainProviderBindings.domainId, domains.id))
		.where(and(ownedDomain(userId, domainId), eq(domainProviderBindings.provider, "resend")))
		.limit(1);
	if (!binding) throw new DomainServiceError("Domain not found.", "not-found");
	return binding;
}

async function syncProviderState(
	userId: string,
	domainId: string,
	providerDomain: ProviderDomain,
): Promise<DomainProviderState> {
	const canonicalStatus = mapResendDomainStatus(providerDomain.status);
	const [current] = await db
		.select({ status: domains.status, verifiedAt: domains.verifiedAt })
		.from(domains)
		.where(ownedDomain(userId, domainId))
		.limit(1);
	if (!current) throw new DomainServiceError("Domain not found.", "not-found");

	if (current.status !== canonicalStatus || (canonicalStatus === "verified" && !current.verifiedAt)) {
		const now = new Date();
		await db
			.update(domains)
			.set({
				status: canonicalStatus,
				verifiedAt:
					canonicalStatus === "verified" ? (current.verifiedAt ?? now) : current.verifiedAt,
				updatedAt: now,
			})
			.where(ownedDomain(userId, domainId));
		if (canonicalStatus === "verified" && current.status !== "verified") {
			await db.insert(auditLogs).values({
				id: createId(), userId, actor: "user", action: "domain.verified",
				entityType: "domain", entityId: domainId, createdAt: now,
			});
		}
	}

	return { ...providerDomain, canonicalStatus };
}

export async function listDomains(userId: string) {
	return db.select().from(domains).where(eq(domains.userId, userId)).orderBy(domains.name);
}

export async function getDomain(userId: string, domainId: string) {
	const [domain] = await db.select().from(domains).where(ownedDomain(userId, domainId)).limit(1);
	return domain ?? null;
}

export async function createDomain(userId: string, input: unknown, provider?: DomainProvider) {
	const { name } = parse(createDomainSchema, input);
	const [existing] = await db.select({ id: domains.id }).from(domains).where(eq(domains.name, name)).limit(1);
	if (existing) throw new DomainServiceError("That domain is already in use.", "conflict");

	let external: ProviderDomain;
	try {
		external = await providerOrDefault(provider).createDomain(name);
	} catch {
		throw new DomainServiceError("Unable to register this domain. Try again later.", "provider");
	}

	const domainId = createId();
	const canonicalStatus = mapResendDomainStatus(external.status);
	try {
		await db.transaction(async (tx) => {
			const now = new Date();
			await tx.insert(domains).values({
				id: domainId, userId, name, status: canonicalStatus,
				verifiedAt: canonicalStatus === "verified" ? now : null,
			});
			await tx.insert(domainProviderBindings).values({
				id: createId(), domainId, provider: "resend", externalId: external.externalId,
			});
			await tx.insert(auditLogs).values({
				id: createId(), userId, actor: "user", action: "domain.created",
				entityType: "domain", entityId: domainId, createdAt: now,
			});
			if (canonicalStatus === "verified") {
				await tx.insert(auditLogs).values({
					id: createId(), userId, actor: "user", action: "domain.verified",
					entityType: "domain", entityId: domainId, createdAt: now,
				});
			}
		});
	} catch {
		try { await providerOrDefault(provider).deleteDomain(external.externalId); } catch { /* Best-effort cleanup. */ }
		throw new DomainServiceError("Unable to save this domain. Try again later.", "provider");
	}
	return { domain: await getDomain(userId, domainId), provider: { ...external, canonicalStatus } };
}

export async function refreshDomainStatus(userId: string, domainId: string, provider?: DomainProvider) {
	const binding = await getBinding(userId, domainId);
	try {
		return await syncProviderState(userId, domainId, await providerOrDefault(provider).getDomain(binding.externalId));
	} catch (error) {
		if (error instanceof DomainServiceError) throw error;
		throw new DomainServiceError("Unable to check domain verification. Try again later.", "provider");
	}
}

export async function verifyDomain(userId: string, domainId: string, provider?: DomainProvider) {
	const binding = await getBinding(userId, domainId);
	try {
		await providerOrDefault(provider).verifyDomain(binding.externalId);
		return await refreshDomainStatus(userId, domainId, provider);
	} catch (error) {
		if (error instanceof DomainServiceError) throw error;
		throw new DomainServiceError("Unable to request verification. Try again later.", "provider");
	}
}

export async function deleteDomain(userId: string, domainId: string, provider?: DomainProvider) {
	const domain = await getDomain(userId, domainId);
	if (!domain) throw new DomainServiceError("Domain not found.", "not-found");
	const [address] = await db.select({ id: addresses.id }).from(addresses).where(and(eq(addresses.domainId, domainId), eq(addresses.userId, userId))).limit(1);
	if (address) throw new DomainServiceError("Remove hosted addresses before deleting this domain.", "conflict");
	const binding = await getBinding(userId, domainId);
	try { await providerOrDefault(provider).deleteDomain(binding.externalId); } catch {
		throw new DomainServiceError("Unable to delete this domain from the provider. Try again later.", "provider");
	}
	await db.transaction(async (tx) => {
		await tx.delete(domains).where(ownedDomain(userId, domainId));
		await tx.insert(auditLogs).values({ id: createId(), userId, actor: "user", action: "domain.deleted", entityType: "domain", entityId: domainId, createdAt: new Date() });
	});
}

export async function listAddresses(userId: string) {
	return db.select({ address: addresses, domainName: domains.name, domainStatus: domains.status }).from(addresses).innerJoin(domains, eq(addresses.domainId, domains.id)).where(eq(addresses.userId, userId)).orderBy(domains.name, addresses.localPart);
}

export async function listAddressesForDomain(userId: string, domainId: string) {
	return db.select().from(addresses).where(and(eq(addresses.userId, userId), eq(addresses.domainId, domainId))).orderBy(addresses.localPart);
}

export async function getAddress(userId: string, addressId: string) {
	const [address] = await db.select().from(addresses).where(ownedAddress(userId, addressId)).limit(1);
	return address ?? null;
}

export async function createAddress(userId: string, input: unknown) {
	const value = parse(createAddressSchema, input);
	const domain = await getDomain(userId, value.domainId);
	if (!domain) throw new DomainServiceError("Domain not found.", "not-found");
	if (domain.status !== "verified") throw new DomainServiceError("Verify this domain before creating addresses.", "conflict");
	const addressId = createId();
	try {
		await db.transaction(async (tx) => {
			await tx.insert(addresses).values({ id: addressId, userId, domainId: domain.id, localPart: value.localPart, displayName: value.displayName });
			await tx.insert(auditLogs).values({ id: createId(), userId, actor: "user", action: "address.created", entityType: "address", entityId: addressId, createdAt: new Date() });
		});
	} catch {
		throw new DomainServiceError("That email address already exists.", "conflict");
	}
	return getAddress(userId, addressId);
}

export async function updateAddress(userId: string, addressId: string, input: unknown) {
	const value = parse(updateAddressSchema, input);
	const current = await getAddress(userId, addressId);
	if (!current) throw new DomainServiceError("Address not found.", "not-found");
	await db.transaction(async (tx) => {
		await tx.update(addresses).set({ ...value, updatedAt: new Date() }).where(ownedAddress(userId, addressId));
		if (value.isEnabled === false && current.isEnabled) {
			await tx.insert(auditLogs).values({ id: createId(), userId, actor: "user", action: "address.disabled", entityType: "address", entityId: addressId, createdAt: new Date() });
		}
	});
	return getAddress(userId, addressId);
}

export async function setAddressEnabled(userId: string, addressId: string, isEnabled: boolean) {
	return updateAddress(userId, addressId, { isEnabled });
}

export async function deleteAddress(userId: string, addressId: string) {
	const address = await getAddress(userId, addressId);
	if (!address) throw new DomainServiceError("Address not found.", "not-found");
	const [sent] = await db.select({ id: messages.id }).from(messages).where(and(eq(messages.userId, userId), eq(messages.sendingAddressId, addressId))).limit(1);
	if (sent) throw new DomainServiceError("This address is used by historical messages and cannot be deleted.", "conflict");
	await db.transaction(async (tx) => {
		await tx.delete(addresses).where(ownedAddress(userId, addressId));
		await tx.insert(auditLogs).values({ id: createId(), userId, actor: "user", action: "address.deleted", entityType: "address", entityId: addressId, createdAt: new Date() });
	});
}

export async function getUsableSendingAddresses(userId: string) {
	return db.select({ id: addresses.id, displayName: addresses.displayName, localPart: addresses.localPart, domainName: domains.name }).from(addresses).innerJoin(domains, eq(addresses.domainId, domains.id)).where(and(eq(addresses.userId, userId), eq(addresses.isEnabled, true), eq(domains.status, "verified"))).orderBy(domains.name, addresses.localPart);
}

"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";

import {
	createAddress,
	createDomain,
	deleteAddress,
	deleteDomain,
	DomainServiceError,
	setAddressEnabled,
	verifyDomain,
} from "@/lib/domains/service";

async function currentUserId() {
	const { auth } = await import("@/lib/auth");
	const session = await auth.api.getSession({ headers: await headers() });
	if (!session) throw new DomainServiceError("Your session has expired. Sign in again.", "not-found");
	return session.user.id;
}

function result(error: unknown) {
	return { success: false as const, error: error instanceof DomainServiceError ? error.message : "Unable to complete that request. Try again later." };
}

export async function addDomainAction(name: string) {
	try {
		const created = await createDomain(await currentUserId(), { name });
		revalidatePath("/settings/domains");
		return { success: true as const, domainId: created.domain?.id };
	} catch (error) { return result(error); }
}

export async function verifyDomainAction(domainId: string) {
	try {
		await verifyDomain(await currentUserId(), domainId);
		revalidatePath(`/settings/domains/${domainId}`);
		revalidatePath("/settings/domains");
		return { success: true as const };
	} catch (error) { return result(error); }
}

export async function deleteDomainAction(domainId: string) {
	try {
		await deleteDomain(await currentUserId(), domainId);
		revalidatePath("/settings/domains");
		return { success: true as const };
	} catch (error) { return result(error); }
}

export async function createAddressAction(domainId: string, localPart: string, displayName?: string) {
	try {
		await createAddress(await currentUserId(), { domainId, localPart, displayName: displayName || undefined });
		revalidatePath(`/settings/domains/${domainId}`);
		return { success: true as const };
	} catch (error) { return result(error); }
}

export async function setAddressEnabledAction(domainId: string, addressId: string, isEnabled: boolean) {
	try {
		await setAddressEnabled(await currentUserId(), addressId, isEnabled);
		revalidatePath(`/settings/domains/${domainId}`);
		return { success: true as const };
	} catch (error) { return result(error); }
}

export async function deleteAddressAction(domainId: string, addressId: string) {
	try {
		await deleteAddress(await currentUserId(), addressId);
		revalidatePath(`/settings/domains/${domainId}`);
		return { success: true as const };
	} catch (error) { return result(error); }
}

import type { DomainStatus } from "@/db/states";

export function mapResendDomainStatus(status: string): DomainStatus {
	switch (status) {
		case "verified":
			return "verified";
		case "failed":
		case "partially_failed":
			return "failed";
		default:
			return "pending";
	}
}

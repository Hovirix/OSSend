import { ResendDomainProvider } from "./resend";
import type { DomainProvider } from "./types";

export function getDomainProvider(): DomainProvider {
	return new ResendDomainProvider();
}

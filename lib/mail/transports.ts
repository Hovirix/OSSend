import type {
	NormalizedInboundMessage,
	NormalizedOutgoingMessage,
} from "./contracts";

export type OutboundSendResult =
	| { externalId: string; error?: never }
	| { error: string; externalId?: never };

export interface OutboundTransport {
	send(message: NormalizedOutgoingMessage): Promise<OutboundSendResult>;
}

export type InboundWebhookRequest = {
	body: Uint8Array;
	headers: Headers;
};

export type VerifiedInboundEvent = {
	provider: string;
	eventId: string;
	eventType: string;
	externalMessageId?: string;
	eventCreatedAt?: Date;
};

export interface InboundTransport {
	verifyWebhook(request: InboundWebhookRequest): Promise<VerifiedInboundEvent | null>;
	retrieveMessage(event: VerifiedInboundEvent): Promise<NormalizedInboundMessage>;
}

import { ResendOutboundTransport } from "./resend";
import type { OutboundTransport } from "../transports";

export function getOutboundTransport(): OutboundTransport { return new ResendOutboundTransport(); }

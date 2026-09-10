import { readFile } from "node:fs/promises";

import { closeDatabase } from "@/db";
import { handleIncomingMessage } from "@/lib/mail/receive";
import type { IncomingMessage } from "@/lib/mail/types";

type IncomingMessageFixture = Omit<IncomingMessage, "receivedAt"> & {
	receivedAt: string;
};

const fixturePath = process.argv[2] ?? "fixtures/mail/inbound/basic.json";
const fixture = JSON.parse(
	await readFile(fixturePath, "utf8"),
) as IncomingMessageFixture;
try {
	const result = await handleIncomingMessage({
		...fixture,
		receivedAt: new Date(fixture.receivedAt),
	});

	console.log(`Inbound fixture ${result.status}: ${fixturePath}`);
} finally {
	await closeDatabase();
}

import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { betterAuth } from "better-auth/minimal";

import { db } from "@/db";
import * as schema from "@/db/schema";
import { getCoreEnvironment } from "@/lib/env";

const { BETTER_AUTH_SECRET, BETTER_AUTH_URL } = getCoreEnvironment();

export const auth = betterAuth({
	baseURL: BETTER_AUTH_URL,
	secret: BETTER_AUTH_SECRET,
	database: drizzleAdapter(db, { provider: "pg", schema }),
	user: { modelName: "users" },
	session: { modelName: "sessions" },
	account: { modelName: "accounts" },
	verification: { modelName: "verifications" },
	emailAndPassword: {
		enabled: true,
	},
});

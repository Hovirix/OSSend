import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { betterAuth } from "better-auth/minimal";

import { db } from "@/db";
import { workspaceMembers, workspaces } from "@/db/schema";
import * as schema from "@/db/schema";
import { getCoreEnvironment } from "@/lib/env";

const { BETTER_AUTH_SECRET, BETTER_AUTH_URL } = getCoreEnvironment();

export const auth = betterAuth({
	baseURL: BETTER_AUTH_URL,
	secret: BETTER_AUTH_SECRET,
	database: drizzleAdapter(db, { provider: "pg", schema }),
	emailAndPassword: {
		enabled: true,
	},
	databaseHooks: {
		user: {
			create: {
				after: async (user) => {
					const workspaceId = crypto.randomUUID();
					await db.transaction(async (tx) => {
						await tx.insert(workspaces).values({
							id: workspaceId,
							name: `${user.name}'s workspace`,
						});
						await tx.insert(workspaceMembers).values({
							workspaceId,
							userId: user.id,
							role: "owner",
						});
					});
				},
			},
		},
	},
});

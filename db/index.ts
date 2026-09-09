import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
	throw new Error("DATABASE_URL is not configured");
}

// Supabase transaction pooling does not support prepared statements.
const client = postgres(connectionString, { prepare: false });

export const db = drizzle({ client });

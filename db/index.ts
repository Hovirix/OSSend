import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { getCoreEnvironment } from "@/lib/env";

const { DATABASE_URL } = getCoreEnvironment();

const client = postgres(DATABASE_URL);

export const db = drizzle({ client });

import { Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";

// ws is a CommonJS module — use require to avoid ESM default-import issues
// eslint-disable-next-line @typescript-eslint/no-require-imports
neonConfig.webSocketConstructor = require("ws");

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set — check your .env file");
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

import * as schema from "./schema";

export const db = drizzle(pool, { schema });
export type DB = typeof db;

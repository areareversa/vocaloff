import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  // Fail loudly at request time, not at import/build time.
  console.warn("[db] DATABASE_URL is not set");
}

const sql = neon(connectionString ?? "postgresql://user:pass@localhost/db");

export const db = drizzle(sql, { schema });
export { schema };

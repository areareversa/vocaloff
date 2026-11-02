// Migração aditiva e idempotente para a arquitetura local-first.
// Roda com: node scripts/migrate-local.mjs
import fs from "node:fs";
import { neon } from "@neondatabase/serverless";

const env = fs.readFileSync(new URL("../.env.local", import.meta.url), "utf8");
const match = env.match(/^DATABASE_URL="?([^"\n]+)"?/m);
if (!match) throw new Error("DATABASE_URL not found in .env.local");
const sql = neon(match[1]);

const statements = [
  `ALTER TABLE songs ADD COLUMN IF NOT EXISTS storage_type text NOT NULL DEFAULT 'device'`,
  `ALTER TABLE songs ADD COLUMN IF NOT EXISTS storage_path text`,
  `ALTER TABLE songs ADD COLUMN IF NOT EXISTS folder_name text`,
  `ALTER TABLE songs ADD COLUMN IF NOT EXISTS source_url text`,
  `ALTER TABLE songs ADD COLUMN IF NOT EXISTS license text`,
  `ALTER TABLE songs ADD COLUMN IF NOT EXISTS attribution text`,
  `ALTER TABLE songs ADD COLUMN IF NOT EXISTS catalog_id text`,
  `CREATE INDEX IF NOT EXISTS songs_catalog_id_idx ON songs (catalog_id)`,
  `ALTER TABLE stems ADD COLUMN IF NOT EXISTS storage_type text NOT NULL DEFAULT 'device'`,
  `ALTER TABLE stems ADD COLUMN IF NOT EXISTS mime text`,
];

for (const statement of statements) {
  await sql.query(statement);
  console.log("ok:", statement.replace(/\s+/g, " ").slice(0, 90));
}

const cols = await sql`select column_name from information_schema.columns where table_schema='public' and table_name='songs' order by ordinal_position`;
console.log("songs:", cols.map((r) => r.column_name).join(", "));
const stemCols = await sql`select column_name from information_schema.columns where table_schema='public' and table_name='stems' order by ordinal_position`;
console.log("stems:", stemCols.map((r) => r.column_name).join(", "));

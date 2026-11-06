import fs from "node:fs";
import { neon } from "@neondatabase/serverless";

const env = fs.readFileSync(new URL("../.env.local", import.meta.url), "utf8");
const match = env.match(/^\s*DATABASE_URL\s*=\s*"?([^"\r\n]+)"?/m);
if (!match) throw new Error("DATABASE_URL not found");
const sql = neon(match[1]);

const tables = await sql`select table_name from information_schema.tables where table_schema='public' order by 1`;
console.log("tables:", tables.map((r) => r.table_name).join(", "));

const cols = await sql`select column_name from information_schema.columns where table_schema='public' and table_name='songs' order by ordinal_position`;
console.log("songs cols:", cols.map((r) => r.column_name).join(", "));

const enums = await sql`select typname from pg_type where typname in ('song_status','stem_kind','job_status','plan_code','storage_type')`;
console.log("enums:", enums.map((r) => r.typname).join(", "));

const songs = await sql`select count(*)::int as n from songs`;
const users = await sql`select count(*)::int as n from "user"`;
const stems = await sql`select count(*)::int as n from stems`;
console.log("rows:", { songs: songs[0].n, users: users[0].n, stems: stems[0].n });

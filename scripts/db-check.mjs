import { neon } from "@neondatabase/serverless";
import fs from "node:fs";

const env = fs.readFileSync(new URL("../.env.local", import.meta.url), "utf8");
const match = env.match(/^DATABASE_URL="?([^"\n]+)"?/m);
if (!match) throw new Error("DATABASE_URL not found in .env.local");

const sql = neon(match[1]);
const rows = await sql`select version() as v, current_database() as db`;
console.log("connected:", rows[0].db, "|", rows[0].v.split(",")[0]);

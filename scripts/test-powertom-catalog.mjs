import fs from "node:fs";
import path from "node:path";
import { neon } from "@neondatabase/serverless";

const env = fs.readFileSync(new URL("../.env.local", import.meta.url), "utf8");
const match = env.match(/^DATABASE_URL="?([^"\n]+)"?/m);
if (!match) throw new Error("DATABASE_URL not found");

const catalogPath = "C:/dev/powertom-re/site/catalog.json";
if (!fs.existsSync(catalogPath)) {
  console.error("catalog.json not found at", catalogPath);
  process.exit(1);
}

const catalog = JSON.parse(fs.readFileSync(catalogPath, "utf8"));
console.log("Found catalog with", catalog.length, "songs");

// Let's test URL resolution for first song stem
const firstSong = catalog[0];
console.log("First song:", firstSong.t, "by", firstSong.a, "| Genre:", firstSong.g, "| Slug:", firstSong.s);
console.log("Stems:", firstSong.st);

const R2_BASE = "https://pub-81339f96e6c746e8ac25fbe60e95563c.r2.dev";
const firstStem = firstSong.st[0].replace(/^~/, "");
const stemUrl = `${R2_BASE}/stems/${firstSong.g}/${firstSong.s}/${firstStem}`;
console.log("Testing URL:", stemUrl);

const res = await fetch(stemUrl, { method: "HEAD" });
console.log("R2 HEAD Status:", res.status, "Content-Length:", res.headers.get("content-length"));

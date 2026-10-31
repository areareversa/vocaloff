import fs from "node:fs";

const R2 = "https://pub-81339f96e6c746e8ac25fbe60e95563c.r2.dev";
const catalog = JSON.parse(fs.readFileSync("C:/dev/powertom-re/site/catalog.json", "utf8"));

function buildPath(song, entry) {
  let name = entry;
  let alias = null;
  const sep = entry.indexOf("::");
  if (sep >= 0) {
    alias = entry.slice(0, sep);
    name = entry.slice(sep + 2);
  }
  if (name.startsWith("@")) return { key: name.slice(1), name: alias ?? name.slice(1), alias };
  let optional = false;
  if (name.startsWith("~")) {
    optional = true;
    name = name.slice(1);
  }
  return {
    key: `${optional ? "opt/" : ""}stems/${song.g}/${song.s}/${name}`,
    name: alias ?? name.replace(/\.[a-z0-9]+$/i, ""),
    alias,
    optional,
  };
}

const special = catalog.filter((s) => s.st.some((e) => e.startsWith("@") || e.includes("::")));
console.log("songs with @ or :: aliases:", special.length);
const optSongs = catalog.filter((s) => s.st.some((e) => e.startsWith("~")));
console.log("songs with optional (~) stems:", optSongs.length);

// sample tests
const tests = [];
const s0 = catalog[0];
tests.push({ song: s0, entry: s0.st.find((e) => e.startsWith("~")) });
tests.push({ song: s0, entry: s0.st[0] });
if (special.length) tests.push({ song: special[0], entry: special[0].st.find((e) => e.startsWith("@") || e.includes("::")) });

for (const t of tests) {
  if (!t.entry) continue;
  const b = buildPath(t.song, t.entry);
  const url = `${R2}/${b.key}`;
  const res = await fetch(url, { method: "HEAD" });
  console.log(res.status, b.key, "| label:", b.name, "| len:", res.headers.get("content-length"));
}

// distribution of top-level path prefixes
const prefixes = new Map();
for (const s of catalog.slice(0, 500)) {
  for (const e of s.st) {
    const b = buildPath(s, e);
    const p = b.key.split("/").slice(0, 2).join("/");
    prefixes.set(p, (prefixes.get(p) ?? 0) + 1);
  }
}
console.log("prefixes:", [...prefixes.entries()]);

// sample of alias forms
const aliasSamples = [];
for (const s of special.slice(0, 5)) for (const e of s.st) if (e.startsWith("@") || e.includes("::")) aliasSamples.push(e);
console.log("alias samples:", aliasSamples.slice(0, 12));

// Gera src/data/public-tracks.json a partir do acervo público do ccMixter.
// Só entram faixas com licença que permite uso/redistribuição:
//   Attribution, Attribution Share Alike, CC0 / Public Domain.
// Licenças NonCommercial, NoDerivatives e Sampling+ são descartadas.

import fs from "node:fs";
import path from "node:path";
import dns from "node:dns";

dns.setDefaultResultOrder("ipv4first");

const UA = { "user-agent": "Mozilla/5.0 (compatible; VocalOff/0.1 catalog builder)" };
const API = "https://ccmixter.org/api/query";
const OUT = path.resolve("src/data/public-tracks.json");

const ALLOWED = [/attribution(?! noncommercial)/i, /attribution share alike/i, /public domain/i, /cc0/i];
const BLOCKED = /noncommercial|non-commercial|noderiv|no deriv|sampling/i;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function httpsText(url, tries = 4) {
  return new Promise((resolve, reject) => {
    const attempt = (n) => {
      import("node:https").then(({ default: https }) => {
        const req = https.get(
          url,
          { headers: UA, maxHeaderSize: 1024 * 1024 },
          (res) => {
            if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
              res.resume();
              attempt(n);
              return;
            }
            if (res.statusCode !== 200) {
              res.resume();
              if (n + 1 < tries) setTimeout(() => attempt(n + 1), 700 * (n + 1));
              else reject(new Error(`HTTP ${res.statusCode}`));
              return;
            }
            const chunks = [];
            res.on("data", (c) => chunks.push(c));
            res.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
            res.on("error", reject);
          },
        );
        req.on("error", (err) => {
          if (n + 1 < tries) setTimeout(() => attempt(n + 1), 700 * (n + 1));
          else reject(err);
        });
        req.setTimeout(30000, () => req.destroy(new Error("timeout")));
      });
    };
    attempt(0);
  });
}

async function getJson(url) {
  const text = await httpsText(url);
  return JSON.parse(text);
}

function parseDuration(fmt) {
  const ps = fmt?.ps;
  if (!ps) return null;
  const parts = ps.split(":").map(Number);
  if (parts.some(Number.isNaN)) return null;
  return parts.reduce((acc, v) => acc * 60 + v, 0);
}

function allowedLicense(name = "") {
  if (!name || BLOCKED.test(name)) return false;
  return ALLOWED.some((re) => re.test(name));
}

const STEM_WORDS =
  /vox|vocal|pell|pella|acap|bass|drum|perc|piano|keys|keyboard|synth|guitar|viol|string|brass|horn|flute|sax|trumpet|trombone|pad|loop|arp|lead|fx|choir|organ|bell|mallet|rhodes|wurli|harp|banjo|ukulele|bpm|click/i;
const NOT_A_STEM = /^(mp3|flac|wav|ogg|m4a|aiff?)$|preview|premix|full mix|master|secret mixer|remix$/i;

function stemLabel(file, index) {
  return String(file.file_nicname || file.file_name || `pista ${index + 1}`)
    .replace(/\.[a-z0-9]+$/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

function normalize(upload) {
  if (!allowedLicense(upload.license_name)) return null;
  const audio = (upload.files ?? []).filter(
    (f) => f.file_format_info?.["media-type"] === "audio" && f.download_url,
  );
  if (!audio.length) return null;
  const main = audio.find((f) => /mp3/i.test(f.file_nicname)) ?? audio[0];
  const durationSec =
    parseDuration(main.file_format_info) ?? parseDuration(audio[0].file_format_info);
  if (!durationSec) return null;
  const bpm = Number(upload.upload_extra?.bpm) || null;
  const tags = (upload.upload_tags ?? "")
    .split(",")
    .map((t) => t.trim())
    .filter((t) => t && !["media", "remix", "trackback", "ccplus", "audio", "mp3", "44k", "stereo"].includes(t));

  // Só contam como pista separada arquivos que são instrumento/voz de verdade,
  // não a mesma mix em outro formato (mp3/flac/preview) nem remixes completos.
  const stems = audio
    .map((f, i) => ({ file: f, label: stemLabel(f, i) }))
    .filter(({ file, label }) => file.download_url !== main.download_url)
    .filter(({ label }) => STEM_WORDS.test(label) && !NOT_A_STEM.test(label))
    .filter(
      (s, i, arr) =>
        arr.findIndex((o) => o.label.toLowerCase() === s.label.toLowerCase()) === i,
    )
    .slice(0, 10)
    .map(({ file, label }) => ({
      label,
      url: file.download_url,
      mime: file.file_format_info?.mime_type ?? "audio/mpeg",
    }));

  return {
    id: `ccm-${upload.upload_id}`,
    title: String(upload.upload_name).trim(),
    artist: String(upload.user_real_name || upload.user_name).trim(),
    durationSec,
    bpm,
    genre: tags[0] ?? "outros",
    tags: tags.slice(0, 6),
    license: upload.license_name,
    licenseUrl: upload.license_url,
    pageUrl: upload.file_page_url,
    audioUrl: main.download_url,
    mime: main.file_format_info?.mime_type ?? "audio/mpeg",
    bytes: Number(main.file_rawsize) || null,
    hasStems: stems.length >= 2,
    stems,
  };
}

const seen = new Set();
const tracks = [];

const queries = [
  { sort: "rank", tags: "" },
  { sort: "rank", tags: "instrumental" },
  { sort: "rank", tags: "pells" },
  { sort: "rank", tags: "stems" },
];

for (const q of queries) {
  for (let page = 0; page < 2; page++) {
    const url =
      `${API}?f=json&search_type=all&datasource=uploads&limit=100&offset=${page * 100}` +
      `&sort=${q.sort}` +
      (q.tags ? `&tags=${encodeURIComponent(q.tags)}` : "");
    let data;
    try {
      data = await getJson(url);
    } catch (err) {
      console.error("skip", url, String(err));
      continue;
    }
    if (!Array.isArray(data)) {
      console.error("unexpected payload for", url);
      continue;
    }
    for (const upload of data) {
      const id = upload.upload_id;
      if (!id || seen.has(id)) continue;
      const t = normalize(upload);
      if (!t) continue;
      seen.add(id);
      tracks.push(t);
    }
    await sleep(350);
  }
}

tracks.sort((a, b) => Number(b.stems.length > 0) - Number(a.stems.length > 0));

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(
  OUT,
  JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      source: "ccMixter (ccmixter.org)",
      licenseFilter: "Attribution / Attribution Share Alike / CC0 / Public Domain",
      tracks,
    },
    null,
    2,
  ),
);

const withStems = tracks.filter((t) => t.stems.length > 0).length;
const licenses = [...new Set(tracks.map((t) => t.license))];
console.log(`tracks: ${tracks.length} | com pistas separadas: ${withStems}`);
console.log("licenças:", licenses.join(" · "));
console.log("exemplos:");
for (const t of tracks.slice(0, 5)) {
  console.log(` - ${t.title} — ${t.artist} (${t.durationSec}s, ${t.license}, pistas ${t.stems.length})`);
}

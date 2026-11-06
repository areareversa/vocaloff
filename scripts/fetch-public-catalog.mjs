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
  /vox|vocal|pell|pella|acap|bass|drum|perc|piano|keys|keyboard|synth|guitar|viol|string|brass|horn|flute|sax|trumpet|trombone|pad|loop|arp|lead|fx|choir|organ|bell|mallet|rhodes|wurli|harp|banjo|ukulele|bpm|click|cavaquinho|pandeiro|berimbau|cuica|agogo|surdo|reco|flauta|violao|acordeon|accordion|accordian|sanfona|marimba|backing/i;

// Termos que identificam conteúdo brasileiro (usado para filtrar buscas amplas).
const BR =
  /bra[sz]il|bossa|samba|mpb|forr[oó]|bai[aã]o|choro|tropic[aá]lia|frevo|maracatu|ax[eé]|batucada|berimbau|cu[ií]ca|pandeiro|surdo|cavaquinho|viol[aã]o|caipira|sertanejo|pagode|afox[eé]|carimb[oó]|lambada|nordeste|amaz[oô]nia|bahia|carnaval|capoeira|ijex[aá]|brasileir|portugu[eê]s|latin/i;

// Gêneros preferidos para o filtro da biblioteca (evita "tubed_by_you", "acappella" etc.).
const GENRE_PREFERENCE = [
  "samba", "bossa_nova", "bossa", "mpb", "choro", "forro", "tropicalia", "frevo",
  "maracatu", "afro", "afrobeat", "latin", "latin_jazz", "brazilian_jazz", "brazil",
  "jazz", "reggae", "dub", "folk", "rock", "pop", "hip_hop", "electronic", "chill",
  "ambient", "funk", "soul", "r_n_b", "blues", "instrumental",
];

// Artistas brasileiros cujo material não traz tag de gênero brasileiro.
const BR_ARTISTS = /^(cdala|nethis)$/i;
const NOT_A_STEM = /^(mp3|flac|wav|ogg|m4a|aiff?)$|preview|premix|full mix|master|secret mixer|remix$/i;

function stemLabel(file, index) {
  return String(file.file_nicname || file.file_name || `pista ${index + 1}`)
    .replace(/\.[a-z0-9]+$/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

function normalize(upload) {
  if (!allowedLicense(upload.license_name)) return null;
  // Títulos com caractere inválido (encoding quebrado na origem) ficam de fora.
  if (String(upload.upload_name ?? "").includes("\uFFFD")) return null;
  const audio = (upload.files ?? []).filter(
    (f) => f.file_format_info?.["media-type"] === "audio" && f.download_url,
  );
  if (!audio.length) return null;
  const main = audio.find((f) => /mp3/i.test(f.file_nicname)) ?? audio[0];
  const durationSec =
    parseDuration(main.file_format_info) ?? parseDuration(audio[0].file_format_info);
  if (!durationSec) return null;
  // Amostras de 2–30 s não são músicas para a biblioteca.
  if (durationSec < 45) return null;
  const bpm = Number(upload.upload_extra?.bpm) || null;
  const tags = (upload.upload_tags ?? "")
    .split(",")
    .map((t) => t.trim())
    .filter((t) => t && !["media", "remix", "trackback", "ccplus", "audio", "mp3", "44k", "stereo"].includes(t));

  // Só contam como pista separada arquivos que são instrumento/voz de verdade,
  // não a mesma mix em outro formato (mp3/flac/preview) nem remixes completos.
  const stemsRaw = audio
    .map((f, i) => ({
      file: f,
      label: stemLabel(f, i),
      dur: parseDuration(f.file_format_info),
    }))
    .filter(({ file, label }) => file.download_url !== main.download_url)
    .filter(({ label }) => STEM_WORDS.test(label) && !NOT_A_STEM.test(label))
    .filter(
      (s, i, arr) =>
        arr.findIndex((o) => o.label.toLowerCase() === s.label.toLowerCase()) === i,
    );

  // Prefere pistas de duração próxima à música inteira; se não houver pelo menos
  // duas, usa as mais longas (descartando cortes de 2–5 s) — músicas de loops.
  const fullStems = stemsRaw.filter(
    ({ dur }) => durationSec > 0 && dur != null && dur >= durationSec * 0.5,
  );
  const pool =
    fullStems.length >= 2
      ? fullStems
      : [...stemsRaw].sort((a, b) => (b.dur ?? 0) - (a.dur ?? 0));
  const chosen = pool.slice(0, 12);
  // Uma pista só não faz um mixer: nesse caso a música entra como mix completa.
  const stems =
    chosen.length >= 2
      ? chosen.map(({ file, label }) => ({
          label,
          url: file.download_url,
          mime: file.file_format_info?.mime_type ?? "audio/mpeg",
        }))
      : [];

  const artist = String(upload.user_real_name || upload.user_name).trim();
  const isBr = BR_ARTISTS.test(artist) || BR.test(`${upload.upload_name} ${upload.upload_tags ?? ""}`);
  const preferredGenre = tags.find((tag) => GENRE_PREFERENCE.includes(tag.toLowerCase()));
  const genre =
    (preferredGenre === "brazil" ? "brasil" : preferredGenre) ??
    (isBr ? "brasil" : null) ??
    tags[0] ??
    "outros";
  const finalTags = isBr && !tags.includes("brasil") ? ["brasil", ...tags] : tags;

  return {
    id: `ccm-${upload.upload_id}`,
    title: String(upload.upload_name).trim(),
    artist,
    durationSec,
    bpm,
    genre,
    tags: finalTags.slice(0, 6),
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
  { tags: "" },
  { tags: "instrumental" },
  { tags: "pells" },
  { tags: "stems" },
  // Conteúdo brasileiro: tags, termos em português e artistas conhecidos.
  { tags: "brazil" },
  { tags: "samba" },
  { tags: "bossa_nova" },
  { tags: "mpb" },
  { tags: "choro" },
  { tags: "latin" },
  { tags: "latin_jazz" },
  { tags: "brazilian_jazz" },
  { tags: "portuguese" },
  { tags: "cavaquinho" },
  { tags: "world" },
  { search: "brasil", onlyBr: true },
  { search: "brazil", onlyBr: true },
  { search: "samba", onlyBr: true },
  { search: "bossa nova", onlyBr: true },
  { search: "mpb", onlyBr: true },
  { search: "choro", onlyBr: true },
  { search: "forro", onlyBr: true },
  { search: "tropicalia", onlyBr: true },
  { search: "baiao", onlyBr: true },
  { search: "maracatu", onlyBr: true },
  { search: "violao", onlyBr: true },
  { user: "cdala" },
  { user: "Nethis" },
  { user: "AIR_LOMEG" },
];

for (const q of queries) {
  for (let page = 0; page < 2; page++) {
    const params = new URLSearchParams({
      f: "json",
      search_type: "all",
      datasource: "uploads",
      limit: "100",
      offset: String(page * 100),
      sort: "rank",
    });
    if (q.tags) params.set("tags", q.tags);
    if (q.search) params.set("search", q.search);
    if (q.user) params.set("user", q.user);
    const url = `${API}?${params.toString()}`;
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
      if (q.onlyBr) {
        const hay = `${t.title} ${t.artist} ${t.tags.join(" ")} ${t.genre}`;
        if (!BR.test(hay)) continue;
      }
      seen.add(id);
      tracks.push(t);
    }
    await sleep(350);
  }
}

// Preserva faixas adicionadas manualmente (ids que não vêm do ccMixter).
try {
  const existing = JSON.parse(fs.readFileSync(OUT, "utf8"));
  const ids = new Set(tracks.map((t) => t.id));
  for (const track of existing.tracks ?? []) {
    if (typeof track.id !== "string" || track.id.startsWith("ccm-")) continue;
    if (ids.has(track.id)) continue;
    tracks.push(track);
  }
} catch {
  // primeira geração: nada a preservar
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

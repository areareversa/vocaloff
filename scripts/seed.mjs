import fs from "node:fs";
import path from "node:path";

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./src/db/schema";
import { eq } from "drizzle-orm";

const env = fs.readFileSync(new URL("../.env.local", import.meta.url), "utf8");
const match = env.match(/^DATABASE_URL="?([^"\n]+)"?/m);
if (!match) throw new Error("DATABASE_URL not found");

const sql = neon(match[1]);
const db = drizzle(sql, { schema });

async function main() {
  // pegar as 3 primeiras músicas do catálogo powertom (já baixado em C:\dev\powertom-re\site\catalog.json)
  const catalogPath = path.resolve(
    import.meta.url,
    "../..",
    "dev/powertom-re/site/catalog.json",
  );
  // Note: this path assumes the script runs from vocaloff and powertom-re is a sibling
  // We'll hardcode a tiny sample instead of reading 8046 records.
  const sampleSongs = [
    {
      id: crypto.randomUUID(),
      title: "085 ROGEIRINHO ORIGINAL",
      artist: "Rogeirinho",
      durationSec: 156,
      bpm: null,
      keyNote: "B",
      coverUrl: null,
      sourceKey: "085-rogeirinho-original",
      sourceMime: "audio/mpeg",
      sourceBytes: null,
      status: "ready",
      isPublic: false,
    },
    {
      id: crypto.randomUUID(),
      title: "Em Pouco Tempo",
      artist: "Acústicos & Valvulados",
      durationSec: 210,
      bpm: 120,
      keyNote: "B",
      coverUrl: null,
      sourceKey: "acusticos-valvulados-em-pouco-tempo-b-major-120bpm",
      sourceMime: "audio/mpeg",
      sourceBytes: null,
      status: "ready",
      isPublic: false,
    },
    {
      id: crypto.randomUUID(),
      title: "Batera Forte",
      artist: "Grupo Exemplo",
      durationSec: 180,
      bpm: 100,
      keyNote: "G",
      coverUrl: null,
      sourceKey: "batera-forte",
      sourceMime: "audio/mpeg",
      sourceBytes: null,
      status: "ready",
      isPublic: false,
    },
  ];

  // inserir músicas e stems
  for (const s of sampleSongs) {
    await db.insert(schema.songs).values({
      id: s.id,
      title: s.title,
      artist: s.artist,
      durationSec: s.durationSec,
      bpm: s.bpm,
      keyNote: s.keyNote,
      coverUrl: s.coverUrl,
      sourceKey: s.sourceKey,
      sourceMime: s.sourceMime,
      sourceBytes: s.sourceBytes,
      status: s.status,
      isPublic: s.isPublic,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // 4 stems genéricos para cada música
    const kinds = ["vocals", "drums", "bass", "other"];
    for (let k = 0; k < kinds.length; k++) {
      await db.insert(schema.stems).values({
        id: crypto.randomUUID(),
        songId: s.id,
        kind: kinds[k],
        label: `${kinds[k]}-${s.id.slice(0, 8)}`,
        storageKey: `users/${s.id}/stems/${kinds[k]}.wav`,
        durationSec: s.durationSec,
        bytes: null,
        position: k,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    // job de separação pendente
    await db.insert(schema.separationJobs).values({
      id: crypto.randomUUID(),
      songId: s.id,
      status: "queued",
      model: "htdemucs_ft",
      progress: 0,
      attempts: 0,
      error: null,
      workerId: null,
      startedAt: null,
      finishedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  console.log("seed concluído: inseridas", sampleSongs.length, "músicas + stems + jobs");
}

main().catch((err) => {
  console.error("seed error:", err);
  process.exit(1);
});
import { auth } from "@/lib/auth";
import { db, schema } from "@/db";
import type { SongStatus, StemKind } from "@/db/schema";
import { desc, eq, inArray } from "drizzle-orm";
import { NextResponse } from "next/server";
import crypto from "crypto";

const STATUSES = new Set<string>(["uploading", "queued", "separating", "ready", "failed"]);
const STORAGE_TYPES = new Set(["device", "idb", "remote"]);
const STEM_KINDS = new Set<string>([
  "vocals",
  "drums",
  "bass",
  "guitar",
  "piano",
  "other",
  "instrumental",
  "click",
  "backing",
]);

function text(value: unknown, max = 300): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, max) : null;
}

function num(value: unknown): number | null {
  const n = typeof value === "string" ? Number(value) : typeof value === "number" ? value : NaN;
  return Number.isFinite(n) && n >= 0 ? n : null;
}

export async function GET(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const rows = await db
    .select()
    .from(schema.songs)
    .where(eq(schema.songs.userId, session.user.id))
    .orderBy(desc(schema.songs.createdAt));

  const stemRows = rows.length
    ? await db
        .select()
        .from(schema.stems)
        .where(inArray(schema.stems.songId, rows.map((row) => row.id)))
        .orderBy(schema.stems.position)
    : [];

  const bySong = new Map<string, typeof stemRows>();
  for (const stem of stemRows) {
    const list = bySong.get(stem.songId) ?? [];
    list.push(stem);
    bySong.set(stem.songId, list);
  }

  return NextResponse.json({
    songs: rows.map((song) => ({ ...song, stems: bySong.get(song.id) ?? [] })),
  });
}

export async function POST(request: Request) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const body = (await request.json()) as Record<string, unknown>;
    const id =
      typeof body.id === "string" && /^[0-9a-f-]{36}$/i.test(body.id)
        ? body.id
        : crypto.randomUUID();

    const title = text(body.title, 200) ?? "Sem título";
    const artist = text(body.artist, 200);
    const rawStatus = String(body.status ?? "ready");
    const status = (STATUSES.has(rawStatus) ? rawStatus : "ready") as SongStatus;
    const storageType = STORAGE_TYPES.has(String(body.storageType))
      ? String(body.storageType)
      : "device";
    const storagePath = text(body.storagePath, 500);
    const sourceUrl = text(body.sourceUrl, 1000);

    if (!storagePath && !sourceUrl) {
      return NextResponse.json(
        { error: "Informe o caminho local do áudio ou a URL de origem." },
        { status: 400 },
      );
    }

    await db.insert(schema.songs).values({
      id,
      userId: session.user.id,
      title,
      artist,
      durationSec: num(body.durationSec),
      bpm: num(body.bpm),
      keyNote: text(body.keyNote, 8),
      coverUrl: text(body.coverUrl, 1000),
      sourceKey: storagePath ?? sourceUrl ?? id,
      sourceMime: text(body.sourceMime, 100) ?? "audio/mpeg",
      sourceBytes: num(body.sourceBytes),
      status,
      isPublic: false,
      storageType,
      storagePath,
      folderName: text(body.folderName, 120),
      sourceUrl,
      license: text(body.license, 200),
      attribution: text(body.attribution, 500),
      catalogId: text(body.catalogId, 120),
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const stems = Array.isArray(body.stems) ? body.stems : [];
    const stemRows = stems
      .slice(0, 24)
      .map((raw, index) => {
        const stem = (raw ?? {}) as Record<string, unknown>;
        const storageKey = text(stem.storagePath, 500);
        if (!storageKey) return null;
        const kind = text(stem.kind, 20) ?? "other";
        return {
          id: crypto.randomUUID(),
          songId: id,
          kind: kind as "other",
          label: text(stem.label, 80) ?? `Pista ${index + 1}`,
          storageKey,
          storageType: STORAGE_TYPES.has(String(stem.storageType))
            ? String(stem.storageType)
            : "device",
          mime: text(stem.mime, 100) ?? "audio/mpeg",
          durationSec: num(stem.durationSec),
          bytes: num(stem.bytes),
          position: index,
          createdAt: new Date(),
        } as typeof schema.stems.$inferInsert;
      })
      .filter((row): row is typeof schema.stems.$inferInsert => row !== null && 'id' in row);

    if (stemRows.length) {
      await db.insert(schema.stems).values(stemRows);
    }

    if (stemRows.length) {
      await db.insert(schema.stems).values(stemRows);
    }

    return NextResponse.json({ id, status, stems: stemRows.length }, { status: 201 });
  } catch (err) {
    console.error("POST /api/songs error:", err);
    return NextResponse.json({ error: "Erro interno ao salvar a música" }, { status: 500 });
  }
}

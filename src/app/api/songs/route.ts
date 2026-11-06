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
  try {
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
  } catch (err) {
    console.error("GET /api/songs error:", err);
    return NextResponse.json({ error: "Erro ao carregar músicas" }, { status: 500 });
  }
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

    const songData = {
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
    };

    // Tenta inserir com todas as colunas; se falhar, tenta sem as colunas novas
    let dbInsertOk = false;
    try {
      await db.insert(schema.songs).values(songData);
      dbInsertOk = true;
    } catch (err1) {
      // Segunda tentativa: inserir sem as colunas que podem não existir na DB antiga
      const fallbackData = {
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
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      try {
        await db.insert(schema.songs).values(fallbackData);
        dbInsertOk = true;
      } catch (err2) {
        console.error("DB insert failed both attempts:", err1, err2);
        return NextResponse.json({ error: "Erro ao salvar música no banco" }, { status: 500 });
      }
    }

    // Inserir stems (best-effort - se falhar, a música ainda é salva)
    const stems = Array.isArray(body.stems) ? body.stems : [];
    const stemRows: typeof schema.stems.$inferInsert[] = [];
    for (const raw of stems.slice(0, 24)) {
      const stem = (raw ?? {}) as Record<string, unknown>;
      const storageKey = text(stem.storagePath, 500);
      if (!storageKey) continue;
      const stemKindVal = text(stem.kind, 20);
      const effectiveKind = STEM_KINDS.has(stemKindVal as string) ? stemKindVal as StemKind : "other";
      stemRows.push({
        id: crypto.randomUUID(),
        songId: id,
        kind: effectiveKind,
        label: text(stem.label, 80) ?? `Pista ${stemRows.length + 1}`,
        storageKey,
        storageType: STORAGE_TYPES.has(String(stem.storageType))
          ? String(stem.storageType)
          : "device",
        mime: text(stem.mime, 100) ?? "audio/mpeg",
        durationSec: num(stem.durationSec),
        bytes: num(stem.bytes),
        position: stemRows.length,
        createdAt: new Date(),
      });
    }

    // Inserção pista a pista: uma pista problemática não derruba as demais.
    let insertedStems = 0;
    for (const row of stemRows) {
      try {
        const inserted = await db
          .insert(schema.stems)
          .values(row)
          .onConflictDoNothing()
          .returning({ id: schema.stems.id });
        insertedStems += inserted.length;
      } catch (stemErr) {
        console.warn(`Stem insert failed (${row.label}), but song was saved:`, stemErr);
      }
    }

    return NextResponse.json(
      { id, status, stems: insertedStems },
      { status: 201 },
    );
  } catch (err) {
    console.error("POST /api/songs error:", err);
    return NextResponse.json({ error: "Erro interno ao salvar a música" }, { status: 500 });
  }
}
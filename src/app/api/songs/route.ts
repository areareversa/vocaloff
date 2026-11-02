import { auth } from "@/lib/auth";
import { db, schema } from "@/db";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import crypto from "crypto";

export async function POST(request: Request) {
  try {
    const session = await auth.api.getSession({
      headers: await request.headers,
    });
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }
    const body = await request.json();
    const { title, artist, durationSec, bpm, keyNote, coverUrl, sourceMime } = body;
    const id = crypto.randomUUID();
    const sourceKey = crypto.randomUUID();
    await db.insert(schema.songs).values({
      id,
      userId: session.user.id,
      title: title ?? "Sem título",
      artist: artist,
      durationSec: durationSec ?? null,
      bpm: bpm ?? null,
      keyNote: keyNote ?? null,
      coverUrl: coverUrl ?? null,
      sourceMime: sourceMime ?? "audio/mpeg",
      sourceKey,
      sourceBytes: null,
      status: "uploading",
      isPublic: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    return NextResponse.json({ id, status: "uploading" }, { status: 201 });
  } catch (err) {
    console.error("POST /api/songs error:", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
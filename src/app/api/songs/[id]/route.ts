import { auth } from "@/lib/auth";
import { db, schema } from "@/db";
import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function DELETE(request: Request) {
  const url = new URL(request.url);
  const id = url.pathname.split("/").filter(Boolean)[1];

  if (!id) {
    return NextResponse.json({ error: "ID ausente" }, { status: 400 });
  }

  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const deleted = await db
    .delete(schema.songs)
    .where(and(eq(schema.songs.id, id), eq(schema.songs.userId, session.user.id)))
    .returning({ id: schema.songs.id });

  if (!deleted.length) {
    return NextResponse.json({ error: "Música não encontrada" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, id: deleted[0].id });
}
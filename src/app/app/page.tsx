import { Suspense } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { desc, eq, inArray } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db, schema } from "@/db";
import LibraryView, { type LibrarySong } from "@/components/library-view";

async function Library() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

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

  const songs: LibrarySong[] = rows.map((song) => ({
    id: song.id,
    title: song.title,
    artist: song.artist,
    durationSec: song.durationSec,
    coverUrl: song.coverUrl,
    status: song.status,
    storageType: song.storageType,
    storagePath: song.storagePath,
    sourceUrl: song.sourceUrl,
    license: song.license,
    attribution: song.attribution,
    catalogId: song.catalogId,
    sourceBytes: song.sourceBytes,
    createdAt: song.createdAt.toISOString(),
    stems: (bySong.get(song.id) ?? []).map((stem) => ({
      id: stem.id,
      kind: stem.kind,
      label: stem.label,
      storageKey: stem.storageKey,
      storageType: stem.storageType,
      bytes: stem.bytes,
    })),
  }));

  return <LibraryView songs={songs} email={session.user.email} />;
}

export default function AppPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto w-full max-w-5xl animate-pulse px-5 py-10">
          <div className="h-10 w-64 rounded-lg bg-surface" />
          <div className="mt-8 h-64 rounded-2xl bg-surface" />
        </div>
      }
    >
      <Library />
    </Suspense>
  );
}

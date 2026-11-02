"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AudioLines,
  BadgeCheck,
  Check,
  Download,
  Loader2,
  Music2,
  Pause,
  Play,
  Search,
  Sparkles,
} from "lucide-react";
import {
  audioProxy,
  stemKindFromLabel,
  type PublicTrack,
} from "@/lib/public-tracks";
import { saveFromUrl, slugify, songPath } from "@/lib/local-store";
import { cn, formatDuration } from "@/lib/utils";

const GENRE_LABEL: Record<string, string> = {
  rock: "Rock",
  pop: "Pop",
  mpb: "MPB",
  jazz: "Jazz",
  blues: "Blues",
  funk: "Funk",
  soul: "Soul",
  hip_hop: "Hip hop",
  electronic: "Eletrônico",
  classical: "Clássico",
  folk: "Folk",
  reggae: "Reggae",
  gospel: "Gospel",
  latin: "Latino",
  country: "Country",
  ambient: "Ambient",
  soundtrack: "Trilha",
};

function extFromUrl(url: string) {
  const match = /\.([a-z0-9]{2,5})(?:$|\?)/i.exec(url);
  return match ? match[1].toLowerCase() : "mp3";
}

export default function PublicLibrary({ tracks }: { tracks: PublicTrack[] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [genre, setGenre] = useState<string>("todos");
  const [onlyStems, setOnlyStems] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [progress, setProgress] = useState<string | null>(null);
  const [added, setAdded] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  const genres = useMemo(() => {
    const counts = new Map<string, number>();
    for (const track of tracks) {
      counts.set(track.genre, (counts.get(track.genre) ?? 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12);
  }, [tracks]);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    return tracks.filter((track) => {
      if (onlyStems && !track.hasStems) return false;
      if (genre !== "todos" && track.genre !== genre) return false;
      if (!term) return true;
      return (
        track.title.toLowerCase().includes(term) ||
        track.artist.toLowerCase().includes(term) ||
        track.tags.some((tag) => tag.toLowerCase().includes(term))
      );
    });
  }, [genre, onlyStems, query, tracks]);

  const togglePreview = useCallback(
    (track: PublicTrack) => {
      const audio = audioRef.current;
      if (!audio) return;
      if (preview === track.id) {
        audio.pause();
        setPreview(null);
        return;
      }
      audio.src = audioProxy(track.audioUrl);
      audio.currentTime = 0;
      void audio.play().catch(() => setError("O navegador bloqueou o play. Toque em Ouvir de novo."));
      setPreview(track.id);
    },
    [preview],
  );

  async function addTrack(track: PublicTrack) {
    setError(null);
    setBusy(track.id);
    setProgress("Baixando a música…");
    try {
      const songId = crypto.randomUUID();
      const ext = extFromUrl(track.audioUrl);
      const mainPath = songPath(songId, `${slugify(track.title)}.${ext}`);
      const main = await saveFromUrl(audioProxy(track.audioUrl), mainPath);

      const stems: Array<{
        kind: string;
        label: string;
        storagePath: string;
        storageType: string;
        mime: string;
        bytes: number;
      }> = [];

      for (const [index, stem] of track.stems.entries()) {
        setProgress(`Baixando pista ${index + 1} de ${track.stems.length}…`);
        const stemExt = extFromUrl(stem.url);
        const label = `${String(index + 1).padStart(2, "0")}-${slugify(stem.label)}`;
        const path = `songs/${songId}/stems/${label}.${stemExt}`;
        try {
          const saved = await saveFromUrl(audioProxy(stem.url), path);
          stems.push({
            kind: stemKindFromLabel(stem.label),
            label: stem.label,
            storagePath: path,
            storageType: saved.storage,
            mime: stem.mime,
            bytes: saved.bytes,
          });
        } catch (stemError) {
          console.warn("stem falhou", stem.label, stemError);
        }
      }

      setProgress("Salvando metadados…");
      const res = await fetch("/api/songs", {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          id: songId,
          title: track.title,
          artist: track.artist,
          durationSec: track.durationSec,
          bpm: track.bpm,
          sourceMime: track.mime,
          sourceBytes: main.bytes,
          storageType: main.storage,
          storagePath: mainPath,
          sourceUrl: track.audioUrl,
          license: track.license,
          attribution: `"${track.title}" de ${track.artist} — ${track.license} — ${track.pageUrl}`,
          catalogId: track.id,
          status: "ready",
          stems,
        }),
      });

      if (res.status === 401) {
        router.push("/login?next=/library");
        return;
      }
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Falha ao salvar na biblioteca.");
      }

      setAdded((prev) => new Set(prev).add(track.id));
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao adicionar.");
    } finally {
      setBusy(null);
      setProgress(null);
    }
  }

  return (
    <main className="flex-1">
      <header className="border-b border-border/60">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-5">
          <Link href="/" className="flex items-center gap-2 font-black tracking-tight">
            <AudioLines className="h-5 w-5 text-primary" />
            VocalOff
          </Link>
          <nav className="ml-auto hidden items-center gap-4 text-sm text-muted sm:flex">
            <Link href="/app" className="hover:text-foreground">Minha biblioteca</Link>
            <Link href="/upload" className="hover:text-foreground">Enviar música</Link>
          </nav>
          <Link
            href="/app"
            className="rounded-full bg-primary px-4 py-2 text-xs font-bold text-primary-foreground"
          >
            Abrir app
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-5 py-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
              <Sparkles className="h-3.5 w-3.5" /> Creative Commons · uso liberado
            </span>
            <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">Biblioteca pública</h1>
            <p className="mt-2 max-w-2xl text-sm text-muted">
              {tracks.length} faixas do acervo público do ccMixter com licença de atribuição.
              Escolha uma, baixe para o seu dispositivo e use no player. Quando a faixa tem pistas
              separadas, o mixer é liberado de verdade.
            </p>
          </div>
        </div>

        {error && (
          <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}

        <div className="mt-6 flex flex-wrap items-center gap-2">
          <div className="relative min-w-[240px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar por título, artista ou tag…"
              className="w-full rounded-xl border border-border bg-background py-2.5 pl-9 pr-3 text-sm outline-none focus:border-primary/60"
            />
          </div>
          <button
            type="button"
            onClick={() => setOnlyStems((value) => !value)}
            className={cn(
              "flex items-center gap-2 rounded-xl border px-3 py-2.5 text-xs font-bold",
              onlyStems
                ? "border-primary/40 bg-primary/10 text-primary"
                : "border-border text-muted hover:text-foreground",
            )}
          >
            <BadgeCheck className="h-4 w-4" /> Só com pistas separadas
          </button>
          <span className="text-xs text-muted">{filtered.length} faixas</span>
        </div>

        <div className="mt-3 flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => setGenre("todos")}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-semibold",
              genre === "todos" ? "border-primary/40 bg-primary/10 text-primary" : "border-border text-muted",
            )}
          >
            Todos
          </button>
          {genres.map(([name, count]) => (
            <button
              key={name}
              type="button"
              onClick={() => setGenre(name)}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-semibold",
                genre === name ? "border-primary/40 bg-primary/10 text-primary" : "border-border text-muted",
              )}
            >
              {GENRE_LABEL[name] ?? name.replace(/[_-]/g, " ")} · {count}
            </button>
          ))}
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.slice(0, 120).map((track) => {
            const isAdded = added.has(track.id);
            const isBusy = busy === track.id;
            return (
              <article
                key={track.id}
                className="flex flex-col rounded-2xl border border-border bg-surface p-4"
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-surface-2">
                    <Music2 className="h-4 w-4 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h2 className="truncate text-sm font-bold">{track.title}</h2>
                    <p className="truncate text-xs text-muted">{track.artist}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => togglePreview(track)}
                    className="rounded-full border border-border p-1.5 text-primary hover:bg-primary/10"
                    aria-label="Ouvir prévia"
                  >
                    {preview === track.id ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                  </button>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-1.5 text-[10px] font-semibold">
                  <span className="rounded bg-white/5 px-1.5 py-0.5 text-muted">
                    {formatDuration(track.durationSec)}
                  </span>
                  {track.bpm && (
                    <span className="rounded bg-white/5 px-1.5 py-0.5 text-muted">{track.bpm} BPM</span>
                  )}
                  {track.hasStems && (
                    <span className="rounded bg-primary/15 px-1.5 py-0.5 text-primary">
                      {track.stems.length} pistas
                    </span>
                  )}
                  <a
                    href={track.licenseUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded bg-white/5 px-1.5 py-0.5 text-muted hover:text-foreground"
                  >
                    {track.license}
                  </a>
                </div>

                <p className="mt-2 line-clamp-2 text-[11px] leading-relaxed text-muted">
                  {track.tags.map((tag) => `#${tag.replace(/\s+/g, "")}`).join(" ")}
                </p>

                <div className="mt-auto flex items-center gap-2 pt-3">
                  <button
                    type="button"
                    onClick={() => void addTrack(track)}
                    disabled={isBusy || isAdded}
                    className={cn(
                      "flex flex-1 items-center justify-center gap-2 rounded-full px-3 py-2 text-xs font-bold",
                      isAdded
                        ? "bg-primary/15 text-primary"
                        : "bg-primary text-primary-foreground disabled:opacity-60",
                    )}
                  >
                    {isBusy ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : isAdded ? (
                      <Check className="h-3.5 w-3.5" />
                    ) : (
                      <Download className="h-3.5 w-3.5" />
                    )}
                    {isBusy ? "Baixando…" : isAdded ? "Na sua biblioteca" : "Baixar e usar"}
                  </button>
                  <a
                    href={track.pageUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-full border border-border px-2.5 py-2 text-[10px] font-semibold text-muted hover:text-foreground"
                  >
                    Fonte
                  </a>
                </div>
                {isBusy && progress && (
                  <p className="mt-2 text-[10px] text-muted">{progress}</p>
                )}
              </article>
            );
          })}
        </div>

        {filtered.length > 120 && (
          <p className="mt-6 text-center text-xs text-muted">
            Mostrando 120 de {filtered.length}. Use a busca para refinar.
          </p>
        )}

        <p className="mt-10 text-center text-[11px] leading-relaxed text-muted">
          Todo o catálogo é conteúdo de terceiros com licença Creative Commons (atribuição).
          O crédito e o link da licença aparecem em cada faixa e ficam salvos com a música.
          Nada é copiado para o servidor do VocalOff — o download vai direto para o seu dispositivo.
        </p>
      </section>

      <audio ref={audioRef} onEnded={() => setPreview(null)} className="hidden" />
    </main>
  );
}

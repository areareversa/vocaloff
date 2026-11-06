"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  AudioLines,
  AlertCircle,
  FolderOpen,
  Loader2,
  Music2,
  Pause,
  Play,
  SkipBack,
  Volume2,
  VolumeX,
  MonitorPlay,
} from "lucide-react";
import { ensureFolderPermission, readBlobUrl } from "@/lib/local-store";
import {
  audioProxy,
  publicTracks,
  stemKindFromLabel,
} from "@/lib/public-tracks";
import { cn, formatDuration } from "@/lib/utils";

const catalogById = new Map(publicTracks.map((track) => [track.id, track]));

function isRemotePath(path: string) {
  return path.startsWith("/api/") || /^https?:\/\//i.test(path);
}

function stemCount(song: Song) {
  if (song.stems.length > 0) return song.stems.length;
  const catalog = song.catalogId ? catalogById.get(song.catalogId) : null;
  return catalog?.stems.length ?? 0;
}

interface Stem {
  id: string;
  kind: string;
  label: string;
  storageKey: string;
  storageType: string;
  mime: string | null;
}

interface Song {
  id: string;
  title: string;
  artist: string | null;
  durationSec: number | null;
  coverUrl: string | null;
  status: string;
  storageType: string;
  storagePath: string | null;
  sourceUrl: string | null;
  license: string | null;
  attribution: string | null;
  catalogId: string | null;
  stems: Stem[];
}

interface Channel {
  id: string;
  label: string;
  kind: string;
  path: string;
  /** Fonte remota (catálogo público) usada quando o arquivo local não está disponível. */
  proxy: string | null;
}

function youtubeId(url: string | null) {
  if (!url) return null;
  const match = /(?:youtu\.be\/|v=|shorts\/|embed\/|live\/)([a-zA-Z0-9_-]{11})/.exec(url);
  return match ? match[1] : null;
}

function PlayerInner() {
  const params = useSearchParams();
  const songId = params.get("id");

  const [songs, setSongs] = useState<Song[] | null>(null);
  const [song, setSong] = useState<Song | null>(null);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [missing, setMissing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [mix, setMix] = useState<Record<string, { volume: number; muted: boolean }>>({});
  const [solo, setSolo] = useState<string | null>(null);

  const audioRefs = useRef<Map<string, HTMLAudioElement>>(new Map());

  useEffect(() => {
    let cancelled = false;
    fetch("/api/songs", { credentials: "include" })
      .then(async (res) => {
        if (res.status === 401) throw new Error("Entre na sua conta para abrir o player.");
        if (!res.ok) throw new Error("Não foi possível carregar a biblioteca.");
        const data = (await res.json()) as { songs: Song[] };
        if (cancelled) return;
        setSongs(data.songs);
        const selected = songId
          ? data.songs.find((item) => item.id === songId) ?? null
          : data.songs[0] ?? null;
        setSong(selected);
      })
      .catch((err) => !cancelled && setError(err instanceof Error ? err.message : "Erro ao carregar."))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [songId]);

  const channels: Channel[] = useMemo(() => {
    if (!song) return [];
    const catalog = song.catalogId ? catalogById.get(song.catalogId) ?? null : null;
    const catalogStems = catalog?.stems ?? [];
    const mainProxy = catalog ? audioProxy(catalog.audioUrl) : null;

    // Prefere as pistas locais quando estão completas; senão usa o catálogo público
    // (áudio servido pelo nosso proxy), o que também conserta músicas antigas
    // salvas sem pistas.
    if (song.stems.length > 0 && song.stems.length >= catalogStems.length) {
      return song.stems.map((stem, index) => ({
        id: stem.id,
        label: stem.label,
        kind: stem.kind,
        path: stem.storageKey,
        proxy: catalogStems[index] ? audioProxy(catalogStems[index].url) : null,
      }));
    }

    if (catalogStems.length > 0) {
      return catalogStems.map((stem, index) => ({
        id: `catalog-${index}`,
        label: stem.label,
        kind: stemKindFromLabel(stem.label),
        path: audioProxy(stem.url),
        proxy: audioProxy(stem.url),
      }));
    }

    return song.storagePath
      ? [
          {
            id: "main",
            label: "Música completa",
            kind: "other",
            path: song.storagePath,
            proxy: mainProxy,
          },
        ]
      : [];
  }, [song]);

  const hasStems = channels.some((channel) => channel.id !== "main");

  const resolve = useCallback(async (requestPermission: boolean) => {
    if (!song) return;
    if (requestPermission) await ensureFolderPermission();
    const entries = await Promise.all(
      channels.map(async (channel) => {
        if (isRemotePath(channel.path)) return [channel.id, channel.path] as const;
        const url = await readBlobUrl(channel.path);
        return [channel.id, url ?? channel.proxy] as const;
      }),
    );
    const next: Record<string, string> = {};
    for (const [id, url] of entries) {
      if (url) next[id] = url;
    }
    setUrls(next);
    setMissing(entries.some(([, url]) => !url));
    setMix((current) => {
      const updated = { ...current };
      for (const channel of channels) {
        updated[channel.id] ??= { volume: 1, muted: false };
      }
      return updated;
    });
  }, [channels, song]);

  useEffect(() => {
    if (!song) return;
    void resolve(false);
    return () => {
      for (const url of Object.values(urls)) URL.revokeObjectURL(url);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [song?.id, channels.length]);

  useEffect(() => {
    for (const [id, el] of audioRefs.current) {
      const settings = mix[id];
      if (settings) {
        el.volume = settings.volume;
        el.muted = settings.muted || (solo !== null && solo !== id);
      }
      el.playbackRate = speed;
    }
  }, [mix, solo, speed, urls]);

  const elements = () => [...audioRefs.current.values()].filter(Boolean);

  const toggle = useCallback(() => {
    const els = elements();
    if (!els.length) return;
    if (playing) {
      els.forEach((el) => el.pause());
      setPlaying(false);
      return;
    }
    setPlaying(true);
    els.forEach((el) => {
      void el.play().catch(() => {
        setPlaying(false);
        setError("O navegador bloqueou o áudio. Toque em play novamente.");
      });
    });
  }, [playing]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.code === "Space" && !(event.target instanceof HTMLInputElement)) {
        event.preventDefault();
        toggle();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [toggle]);

  function seek(value: number) {
    for (const el of elements()) el.currentTime = value;
    setTime(value);
  }

  const ytId = youtubeId(song?.sourceUrl ?? null);
  const hasAudio = Object.keys(urls).length > 0;

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-4xl px-5 py-8">
      <div className="mb-6 flex items-center justify-between">
        <Link href="/app" className="flex items-center gap-2 font-black tracking-tight">
          <AudioLines className="h-5 w-5 text-primary" />
          VocalOff
        </Link>
        <Link
          href="/app"
          className="rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-muted hover:text-foreground"
        >
          Minha biblioteca
        </Link>
      </div>

      {error && (
        <div className="mb-4 flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {error}
        </div>
      )}

      {!song ? (
        <div className="rounded-2xl border border-dashed border-border bg-surface/50 px-6 py-14 text-center">
          <Music2 className="mx-auto h-8 w-8 text-muted" />
          <h1 className="mt-4 text-xl font-bold">Nenhuma música selecionada</h1>
          <p className="mt-1 text-sm text-muted">
            {songs && songs.length > 0
              ? "Escolha uma música da sua biblioteca."
              : "Sua biblioteca está vazia. Envie um arquivo ou baixe uma faixa pública."}
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <Link
              href="/upload"
              className="rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground"
            >
              Enviar música
            </Link>
            <Link
              href="/library"
              className="rounded-full border border-border px-5 py-2.5 text-sm font-semibold"
            >
              Biblioteca pública
            </Link>
          </div>
          {songs && songs.length > 0 && (
            <ul className="mx-auto mt-8 max-w-md space-y-2 text-left">
              {songs.slice(0, 10).map((item) => (
                <li key={item.id}>
                  <Link
                    href={`/player?id=${item.id}`}
                    className="flex items-center justify-between rounded-xl border border-border bg-surface px-4 py-2.5 text-sm hover:border-primary/40"
                  >
                    <span className="truncate">{item.title}</span>
                    <span className="text-xs text-muted">{item.artist ?? "—"}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : (
        <div className="rounded-2xl border border-border bg-surface p-6">
          <div className="flex flex-wrap items-start gap-4">
            <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-surface-2">
              {song.coverUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={song.coverUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <Music2 className="m-auto h-6 w-6 text-muted" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-2xl font-black tracking-tight">{song.title}</h1>
              <p className="text-sm text-muted">{song.artist ?? "Artista desconhecido"}</p>
              {song.attribution && (
                <p className="mt-1 text-[11px] text-muted/80">{song.attribution}</p>
              )}
            </div>
            <span className="rounded-full bg-white/5 px-2.5 py-1 text-[10px] font-bold uppercase text-muted">
              {hasStems ? `${channels.length} pistas` : "Mix completa"}
            </span>
          </div>

          {!song.storagePath && (
            <div className="mt-5 rounded-xl border border-border bg-background p-4">
              <p className="flex items-center gap-2 text-sm font-semibold">
                <MonitorPlay className="h-4 w-4 text-red-400" /> Esta música é só uma referência do YouTube
              </p>
              <p className="mt-1 text-xs text-muted">
                O YouTube não fornece o áudio para separação. Envie o arquivo de áudio para liberar o
                player:{" "}
                <Link href="/upload" className="text-primary underline">
                  anexar áudio
                </Link>
                .
              </p>
              {ytId && (
                <div className="mt-3 aspect-video w-full overflow-hidden rounded-lg">
                  <iframe
                    src={`https://www.youtube.com/embed/${ytId}`}
                    title={song.title}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="h-full w-full"
                  />
                </div>
              )}
            </div>
          )}

          {song.storagePath && missing && (
            <div className="mt-5 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
              <p className="text-sm font-semibold text-amber-200">Precisamos de acesso à pasta</p>
              <p className="mt-1 text-xs text-amber-200/80">
                O navegador pede a permissão de novo depois de recarregar.
              </p>
              <button
                type="button"
                onClick={() => void resolve(true)}
                className="mt-3 flex items-center gap-2 rounded-full bg-amber-400 px-4 py-2 text-xs font-bold text-black"
              >
                <FolderOpen className="h-3.5 w-3.5" /> Liberar acesso à pasta
              </button>
            </div>
          )}

          {song.storagePath && (
            <>
              <div className="mt-6">
                <input
                  type="range"
                  min={0}
                  max={duration || song.durationSec || 1}
                  step={0.1}
                  value={Math.min(time, duration || song.durationSec || 1)}
                  onChange={(event) => seek(Number(event.target.value))}
                  className="w-full accent-[color:var(--primary)]"
                />
                <div className="mt-1 flex justify-between text-[11px] text-muted">
                  <span>{formatDuration(time)}</span>
                  <span>{formatDuration(duration || song.durationSec)}</span>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => seek(0)}
                  className="rounded-full border border-border p-2 text-muted hover:text-foreground"
                  aria-label="Voltar ao início"
                >
                  <SkipBack className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={toggle}
                  disabled={!hasAudio}
                  className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground disabled:opacity-50"
                >
                  {playing ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
                </button>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted">Velocidade</span>
                  <input
                    type="range"
                    min={0.5}
                    max={1.5}
                    step={0.05}
                    value={speed}
                    onChange={(event) => setSpeed(Number(event.target.value))}
                    className="w-28 accent-[color:var(--primary)]"
                  />
                  <span className="w-10 text-xs text-muted">{speed.toFixed(2)}×</span>
                </div>
              </div>

              <div className="mt-6 space-y-2">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-bold">
                    {hasStems ? "Mixer por pista" : "Pista única"}
                  </h2>
                  {solo && (
                    <button
                      type="button"
                      onClick={() => setSolo(null)}
                      className="text-[11px] font-semibold text-primary"
                    >
                      limpar solo
                    </button>
                  )}
                </div>

                {channels.map((channel) => {
                  const settings = mix[channel.id] ?? { volume: 1, muted: false };
                  const available = Boolean(urls[channel.id]);
                  return (
                    <div
                      key={channel.id}
                      className={cn(
                        "flex flex-wrap items-center gap-2 rounded-xl border border-border bg-background px-3 py-2",
                        !available && "opacity-50",
                      )}
                    >
                      <button
                        type="button"
                        onClick={() =>
                          setMix((current) => ({
                            ...current,
                            [channel.id]: { ...settings, muted: !settings.muted },
                          }))
                        }
                        className="rounded p-1 text-muted hover:text-foreground"
                        aria-label={`Mudo em ${channel.label}`}
                      >
                        {settings.muted ? (
                          <VolumeX className="h-4 w-4 text-red-300" />
                        ) : (
                          <Volume2 className="h-4 w-4" />
                        )}
                      </button>
                      <span className="w-28 truncate text-xs font-semibold">{channel.label}</span>
                      <input
                        type="range"
                        min={0}
                        max={1}
                        step={0.01}
                        value={settings.volume}
                        onChange={(event) =>
                          setMix((current) => ({
                            ...current,
                            [channel.id]: { ...settings, volume: Number(event.target.value) },
                          }))
                        }
                        className="min-w-[100px] flex-1 accent-[color:var(--primary)]"
                      />
                      <button
                        type="button"
                        onClick={() => setSolo((current) => (current === channel.id ? null : channel.id))}
                        className={cn(
                          "rounded px-2 py-0.5 text-[10px] font-bold",
                          solo === channel.id
                            ? "bg-primary text-primary-foreground"
                            : "bg-white/5 text-muted hover:text-foreground",
                        )}
                      >
                        SOLO
                      </button>
                      <span className="w-8 text-right text-[10px] text-muted">
                        {Math.round(settings.volume * 100)}
                      </span>
                    </div>
                  );
                })}
              </div>

              {channels.map((channel) => (
                <audio
                  key={`${channel.id}-${urls[channel.id] ?? "pending"}`}
                  src={urls[channel.id]}
                  preload="auto"
                  className="hidden"
                  ref={(el) => {
                    if (el) audioRefs.current.set(channel.id, el);
                    else audioRefs.current.delete(channel.id);
                  }}
                  onLoadedMetadata={(event) => {
                    if (channel.id === channels[0]?.id) {
                      setDuration(event.currentTarget.duration || 0);
                    }
                  }}
                  onTimeUpdate={(event) => {
                    if (channel.id === channels[0]?.id) {
                      setTime(event.currentTarget.currentTime);
                    }
                  }}
                  onEnded={() => {
                    if (channel.id === channels[0]?.id) setPlaying(false);
                  }}
                />
              ))}

              <p className="mt-6 text-[11px] leading-relaxed text-muted">
                O áudio é lido do seu dispositivo. Nada é enviado ao servidor. Para separar uma música
                nova em vocais/bateria/baixo, é preciso um worker de IA — veja{" "}
                <Link href="/upload" className="text-primary underline">
                  como enviar
                </Link>
                .
              </p>
            </>
          )}
        </div>
      )}

      {song && songs && songs.length > 1 && (
        <section className="mt-8">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-bold">Faixas do seu dispositivo</h2>
            <span className="text-[11px] text-muted">
              {songs.length} {songs.length === 1 ? "faixa" : "faixas"}
            </span>
          </div>
          <ul className="space-y-2">
            {songs.map((item) => (
              <li key={item.id}>
                <Link
                  href={`/player?id=${item.id}`}
                  className={cn(
                    "flex items-center justify-between gap-3 rounded-xl border px-4 py-2.5 text-sm transition-colors",
                    item.id === song.id
                      ? "border-primary/60 bg-primary/10"
                      : "border-border bg-surface hover:border-primary/40",
                  )}
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">{item.title}</span>
                    <span className="block truncate text-xs text-muted">
                      {item.artist ?? "Artista desconhecido"}
                    </span>
                  </span>
                  <span className="shrink-0 rounded-full bg-white/5 px-2 py-0.5 text-[10px] font-bold uppercase text-muted">
                    {stemCount(item) > 0 ? `${stemCount(item)} pistas` : "Mix"}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}

export default function PlayerPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </main>
      }
    >
      <PlayerInner />
    </Suspense>
  );
}

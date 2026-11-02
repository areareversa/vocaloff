"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AudioLines,
  Download,
  FolderPlus,
  HardDrive,
  Loader2,
  Music2,
  Play,
  Plus,
  Search,
  Trash2,
  Upload,
} from "lucide-react";
import {
  connectFolder,
  ensureFolderPermission,
  folderStatus,
  formatBytes,
  readBlob,
  removeSongFiles,
  storageEstimate,
} from "@/lib/local-store";
import { cn, formatDuration } from "@/lib/utils";

export interface LibraryStem {
  id: string;
  kind: string;
  label: string;
  storageKey: string;
  storageType: string;
  bytes: number | null;
}

export interface LibrarySong {
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
  sourceBytes: number | null;
  createdAt: string | Date;
  stems: LibraryStem[];
}

const STATUS_LABEL: Record<string, string> = {
  uploading: "Enviando",
  queued: "Aguardando áudio",
  separating: "Separando",
  ready: "Pronto",
  failed: "Falhou",
};

const STORAGE_LABEL: Record<string, string> = {
  device: "Pasta do dispositivo",
  idb: "IndexedDB",
  remote: "Link",
};

function storageBadge(song: LibrarySong) {
  if (!song.storagePath) return "Só referência";
  return STORAGE_LABEL[song.storageType] ?? song.storageType;
}

export default function LibraryView({
  songs,
  email,
}: {
  songs: LibrarySong[];
  email: string;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [folder, setFolder] = useState<{ name: string | null; permission: string } | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [estimate, setEstimate] = useState<{ usage: number; quota: number } | null>(null);

  useEffect(() => {
    folderStatus().then((status) =>
      setFolder({
        name: status.folderName,
        permission: status.supported ? status.permission : "unsupported",
      }),
    );
    storageEstimate().then(setEstimate);
  }, []);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return songs;
    return songs.filter(
      (song) =>
        song.title.toLowerCase().includes(term) ||
        (song.artist ?? "").toLowerCase().includes(term),
    );
  }, [query, songs]);

  const totalBytes = songs.reduce(
    (sum, song) =>
      sum +
      (song.sourceBytes ?? 0) +
      song.stems.reduce((inner, stem) => inner + (stem.bytes ?? 0), 0),
    0,
  );

  const handleConnect = useCallback(async () => {
    try {
      const result = await connectFolder();
      setFolder({ name: result.folderName, permission: "granted" });
      setError(null);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível abrir a pasta.");
    }
  }, [router]);

  async function handleDownload(song: LibrarySong) {
    setError(null);
    setBusyId(song.id);
    try {
      await ensureFolderPermission();
      const path = song.storagePath;
      if (!path) throw new Error("Esta música é só uma referência, sem áudio salvo.");
      const blob = await readBlob(path);
      if (!blob) throw new Error("Arquivo não encontrado na pasta. Ele pode ter sido movido ou apagado.");
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `${song.title}.${path.split(".").pop() ?? "mp3"}`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao baixar.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(song: LibrarySong) {
    if (!window.confirm(`Excluir "${song.title}"? O arquivo local também será apagado.`)) return;
    setError(null);
    setBusyId(song.id);
    try {
      const res = await fetch(`/api/songs/${song.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Falha ao excluir.");
      }
      await removeSongFiles(song.id);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao excluir.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <main className="flex-1">
      <header className="border-b border-border/60">
        <div className="mx-auto flex h-16 max-w-5xl items-center gap-4 px-5">
          <Link href="/app" className="flex items-center gap-2 font-black tracking-tight">
            <AudioLines className="h-5 w-5 text-primary" />
            VocalOff
          </Link>
          <nav className="ml-auto hidden items-center gap-4 text-sm text-muted sm:flex">
            <Link href="/library" className="hover:text-foreground">Biblioteca pública</Link>
            <Link href="/player" className="hover:text-foreground">Player</Link>
          </nav>
          <span className="hidden text-xs text-muted md:inline">{email}</span>
          <Link
            href="/api/auth/sign-out"
            className="rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-muted hover:text-foreground"
          >
            Sair
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-5xl px-5 py-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black tracking-tight">Minha biblioteca</h1>
            <p className="mt-1 text-sm text-muted">
              {songs.length === 0
                ? "Nenhuma música ainda."
                : `${songs.length} música${songs.length > 1 ? "s" : ""} · ${formatBytes(totalBytes)}`}
              {estimate && estimate.usage > 0
                ? ` · ${formatBytes(estimate.usage)} usados no navegador`
                : ""}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/library"
              className="rounded-full border border-border px-4 py-2.5 text-sm font-semibold hover:bg-surface"
            >
              Biblioteca pública
            </Link>
            <Link
              href="/upload"
              className="flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground"
            >
              <Plus className="h-4 w-4" /> Enviar música
            </Link>
          </div>
        </div>

        {error && (
          <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}

        <div className="mt-5 flex flex-wrap items-center gap-3 rounded-xl border border-border bg-surface/60 px-4 py-3">
          <HardDrive className="h-4 w-4 text-primary" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">
              {folder?.name ? `Pasta: ${folder.name}` : "Sem pasta conectada (usando IndexedDB)"}
            </p>
            <p className="text-xs text-muted">
              Os MP3 ficam no seu dispositivo. O banco guarda só o caminho e os metadados.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void handleConnect()}
            className="flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-3 py-1.5 text-xs font-bold text-primary"
          >
            <FolderPlus className="h-3.5 w-3.5" />
            {folder?.name ? "Trocar pasta" : "Escolher pasta"}
          </button>
        </div>

        {songs.length > 0 && (
          <div className="relative mt-5">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar por título ou artista…"
              className="w-full rounded-xl border border-border bg-background py-2.5 pl-9 pr-3 text-sm outline-none focus:border-primary/60"
            />
          </div>
        )}

        {songs.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-dashed border-border bg-surface/50 px-6 py-14 text-center">
            <Upload className="mx-auto h-8 w-8 text-muted" />
            <h2 className="mt-4 font-bold">Sua biblioteca está vazia</h2>
            <p className="mx-auto mt-1 max-w-md text-sm text-muted">
              Envie um MP3/WAV do seu dispositivo ou cole um link do YouTube. O áudio é gravado na
              pasta que você escolher — nunca no banco de dados.
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/upload"
                className="rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground"
              >
                Enviar minha primeira música
              </Link>
              <Link
                href="/library"
                className="rounded-full border border-border px-5 py-2.5 text-sm font-semibold hover:bg-surface"
              >
                Explorar biblioteca pública
              </Link>
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <p className="mt-10 text-center text-sm text-muted">Nada encontrado para “{query}”.</p>
        ) : (
          <ul className="mt-6 space-y-2">
            {filtered.map((song) => (
              <li
                key={song.id}
                className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-surface p-3 sm:flex-nowrap"
              >
                <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-surface-2">
                  {song.coverUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={song.coverUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <Music2 className="m-auto h-5 w-5 text-muted" />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate font-bold">{song.title}</p>
                    <span
                      className={cn(
                        "rounded px-1.5 py-0.5 text-[10px] font-bold uppercase",
                        song.status === "ready"
                          ? "bg-primary/15 text-primary"
                          : song.status === "failed"
                            ? "bg-red-500/15 text-red-300"
                            : "bg-white/5 text-muted",
                      )}
                    >
                      {STATUS_LABEL[song.status] ?? song.status}
                    </span>
                    {song.stems.length > 0 && (
                      <span className="rounded bg-white/5 px-1.5 py-0.5 text-[10px] font-bold text-muted">
                        {song.stems.length} pistas
                      </span>
                    )}
                  </div>
                  <p className="truncate text-xs text-muted">
                    {song.artist ?? "Artista desconhecido"}
                    {song.durationSec ? ` · ${formatDuration(song.durationSec)}` : ""}
                    {" · "}
                    {storageBadge(song)}
                    {song.license ? ` · ${song.license}` : ""}
                  </p>
                  {song.attribution && (
                    <p className="truncate text-[10px] text-muted/80">{song.attribution}</p>
                  )}
                </div>

                <div className="ml-auto flex items-center gap-1.5">
                  <Link
                    href={`/player?id=${song.id}`}
                    className="flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-bold text-primary hover:bg-primary/15"
                  >
                    <Play className="h-3.5 w-3.5" /> Tocar
                  </Link>
                  <button
                    type="button"
                    onClick={() => void handleDownload(song)}
                    disabled={busyId === song.id || !song.storagePath}
                    title={song.storagePath ? "Baixar do dispositivo" : "Sem áudio salvo"}
                    className="rounded-full border border-border p-1.5 text-muted hover:text-foreground disabled:opacity-40"
                  >
                    {busyId === song.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Download className="h-3.5 w-3.5" />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleDelete(song)}
                    disabled={busyId === song.id}
                    className="rounded-full border border-border p-1.5 text-muted hover:text-red-300 disabled:opacity-40"
                    aria-label="Excluir música"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}

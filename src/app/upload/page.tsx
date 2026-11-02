"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  AudioLines,
  AlertCircle,
  CheckCircle2,
  FileAudio,
  FolderPlus,
  HardDrive,
  Link2,
  Loader2,
  MonitorPlay,
  Music2,
  Upload,
  X,
} from "lucide-react";
import {
  connectFolder,
  extensionFor,
  folderStatus,
  formatBytes,
  saveBlob,
  slugify,
  songPath,
} from "@/lib/local-store";
import { cn } from "@/lib/utils";

type Mode = "file" | "youtube";

interface YouTubeMeta {
  videoId: string;
  url: string;
  title: string;
  artist: string | null;
  thumbnail: string;
  embedUrl: string;
  note: string;
}

function probeDuration(file: File) {
  return new Promise<number | null>((resolve) => {
    const url = URL.createObjectURL(file);
    const audio = new Audio();
    audio.preload = "metadata";
    const done = (value: number | null) => {
      URL.revokeObjectURL(url);
      resolve(value);
    };
    audio.onloadedmetadata = () => done(Number.isFinite(audio.duration) ? audio.duration : null);
    audio.onerror = () => done(null);
    audio.src = url;
  });
}

export default function UploadPage() {
  const router = useRouter();

  const [mode, setMode] = useState<Mode>("file");
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [durationSec, setDurationSec] = useState<number | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const [ytUrl, setYtUrl] = useState("");
  const [ytMeta, setYtMeta] = useState<YouTubeMeta | null>(null);
  const [ytLoading, setYtLoading] = useState(false);
  const [ytError, setYtError] = useState<string | null>(null);

  const [saving, setSaving] = useState(false);
  const [step, setStep] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [folder, setFolder] = useState<{ name: string | null; permission: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const ytFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    folderStatus().then((status) =>
      setFolder({
        name: status.folderName,
        permission: status.supported ? status.permission : "unsupported",
      }),
    );
  }, []);

  const handleConnectFolder = useCallback(async () => {
    try {
      const result = await connectFolder();
      setFolder({ name: result.folderName, permission: "granted" });
      setError(null);
    } catch (err) {
      setFolder({ name: null, permission: "unsupported" });
      setError(err instanceof Error ? err.message : "Não foi possível abrir a pasta.");
    }
  }, []);

  const acceptFile = useCallback(async (next: File) => {
    setFile(next);
    setError(null);
    if (!next.type.startsWith("audio/") && !/\.(mp3|wav|m4a|ogg|flac|aac|opus)$/i.test(next.name)) {
      setError("Escolha um arquivo de áudio (MP3, WAV, M4A, OGG ou FLAC).");
      return;
    }
    const guessed = next.name
      .replace(/\.[a-z0-9]+$/i, "")
      .replace(/[_-]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    setTitle((current) => current || guessed);
    setDurationSec(await probeDuration(next));
  }, []);

  const loadYouTube = useCallback(async () => {
    if (!ytUrl.trim()) return;
    setYtLoading(true);
    setYtError(null);
    setYtMeta(null);
    try {
      const res = await fetch(`/api/youtube?url=${encodeURIComponent(ytUrl.trim())}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Falha ao consultar o link.");
      setYtMeta(data);
      setTitle((current) => current || data.title);
      setArtist((current) => current || data.artist || "");
    } catch (err) {
      setYtError(err instanceof Error ? err.message : "Link inválido.");
    } finally {
      setYtLoading(false);
    }
  }, [ytUrl]);

  async function persistSong(activeFile: File | null, referenceOnly: boolean) {
    const cleanTitle = title.trim() || (activeFile ? activeFile.name : "Nova música");
    const songId = crypto.randomUUID();
    const extension = activeFile ? extensionFor(activeFile.name) : "mp3";
    const path = songPath(songId, `${slugify(cleanTitle)}.${extension}`);

    let bytes: number | null = null;
    let storageType: "device" | "idb" | "remote" = "remote";

    if (activeFile) {
      setStep("Gravando o áudio na pasta do dispositivo…");
      storageType = await saveBlob(path, activeFile);
      bytes = activeFile.size;
    } else if (mode === "youtube" && ytMeta) {
      // fallback: remote, don't attempt to save locally without file
      storageType = "remote";
    } else {
      // sem arquivo nem modo YouTube: nada a salvar localmente
    }

    setStep("Salvando os metadados no banco…");
    const res = await fetch("/api/songs", {
      method: "POST",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        id: songId,
        title: cleanTitle,
        artist: artist.trim() || null,
        durationSec: durationSec ?? null,
        sourceMime: activeFile?.type || "audio/mpeg",
        sourceBytes: bytes,
        storageType,
        storagePath: activeFile ? path : null,
        folderName: folder?.name ?? null,
        sourceUrl: mode === "youtube" ? ytMeta?.url ?? ytUrl : null,
        coverUrl: ytMeta?.thumbnail ?? null,
        status: referenceOnly ? "queued" : "ready",
      }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error ?? "Não foi possível salvar a música.");
    }

    router.push("/app");
    router.refresh();
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    const activeFile = file;
    if (mode === "file" && !activeFile) {
      setError("Selecione um arquivo de áudio.");
      return;
    }
    if (mode === "youtube" && !ytMeta) {
      setError("Primeiro busque as informações do vídeo.");
      return;
    }

    setSaving(true);
    try {
      await persistSong(activeFile, false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar.");
      setSaving(false);
      setStep(null);
    }
  }

  async function handleReferenceOnly() {
    setError(null);
    setSaving(true);
    try {
      await persistSong(null, true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar.");
      setSaving(false);
      setStep(null);
    }
  }

  return (
    <main className="mx-auto w-full max-w-3xl px-5 py-10">
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

      <div className="rounded-2xl border border-border bg-surface p-6 sm:p-8">
        <h1 className="text-2xl font-black tracking-tight sm:text-3xl">Adicionar música</h1>
        <p className="mt-2 text-sm text-muted">
          O áudio fica <strong className="text-foreground">no seu dispositivo</strong>. O banco guarda
          apenas o caminho, o título e o artista.
        </p>

        {/* Pasta do dispositivo */}
        <div className="mt-5 rounded-xl border border-border bg-background/60 p-4">
          <div className="flex flex-wrap items-center gap-3">
            <HardDrive className="h-4 w-4 text-primary" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">
                {folder?.name ? `Pasta: ${folder.name}` : "Pasta do dispositivo não conectada"}
              </p>
              <p className="text-xs text-muted">
                {folder?.permission === "unsupported"
                  ? "Este navegador não permite escolher pasta. Vamos usar o IndexedDB (também persiste)."
                  : folder?.name
                    ? "Os arquivos são gravados nessa pasta e continuam lá depois de fechar o app."
                    : "Conecte uma pasta para gravar os MP3 nela. Sem isso, usamos o IndexedDB."}
              </p>
            </div>
            <button
              type="button"
              onClick={handleConnectFolder}
              className="flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-3 py-1.5 text-xs font-bold text-primary hover:bg-primary/15"
            >
              <FolderPlus className="h-3.5 w-3.5" />
              {folder?.name ? "Trocar pasta" : "Escolher pasta"}
            </button>
          </div>
        </div>

        {/* Abas */}
        <div className="mt-6 grid grid-cols-2 gap-2 rounded-xl border border-border bg-background p-1">
          <button
            type="button"
            onClick={() => setMode("file")}
            className={cn(
              "flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-bold transition",
              mode === "file" ? "bg-primary text-primary-foreground" : "text-muted hover:text-foreground",
            )}
          >
            <Upload className="h-4 w-4" /> Arquivo
          </button>
          <button
            type="button"
            onClick={() => setMode("youtube")}
            className={cn(
              "flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-bold transition",
              mode === "youtube" ? "bg-primary text-primary-foreground" : "text-muted hover:text-foreground",
            )}
          >
            <MonitorPlay className="h-4 w-4" /> Link do YouTube
          </button>
        </div>

        {error && (
          <div className="mt-4 flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {mode === "file" ? (
            <div
              onDragOver={(event) => {
                event.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(event) => {
                event.preventDefault();
                setDragOver(false);
                const dropped = event.dataTransfer.files?.[0];
                if (dropped) void acceptFile(dropped);
              }}
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                "cursor-pointer rounded-xl border-2 border-dashed p-6 text-center transition",
                dragOver ? "border-primary bg-primary/5" : "border-border hover:border-primary/40",
              )}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="audio/*,.mp3,.wav,.m4a,.ogg,.flac,.aac"
                className="hidden"
                onChange={(event) => {
                  const chosen = event.target.files?.[0];
                  if (chosen) void acceptFile(chosen);
                  event.target.value = "";
                }}
              />
              {file ? (
                <div className="flex items-center justify-center gap-3 text-left">
                  <FileAudio className="h-6 w-6 text-primary" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{file.name}</p>
                    <p className="text-xs text-muted">
                      {formatBytes(file.size)}
                      {durationSec ? ` · ${Math.floor(durationSec / 60)}:${String(Math.round(durationSec % 60)).padStart(2, "0")}` : ""}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      setFile(null);
                      setDurationSec(null);
                    }}
                    className="ml-2 rounded-full p-1 text-muted hover:bg-white/5 hover:text-foreground"
                    aria-label="Remover arquivo"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <>
                  <Music2 className="mx-auto h-8 w-8 text-muted" />
                  <p className="mt-3 text-sm font-semibold">Arraste o áudio ou clique para escolher</p>
                  <p className="mt-1 text-xs text-muted">MP3, WAV, M4A, OGG ou FLAC</p>
                </>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <label className="block text-sm font-semibold text-muted">Link do vídeo</label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Link2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                  <input
                    value={ytUrl}
                    onChange={(event) => setYtUrl(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        void loadYouTube();
                      }
                    }}
                    placeholder="https://www.youtube.com/watch?v=..."
                    className="w-full rounded-xl border border-border bg-background py-2.5 pl-9 pr-3 text-sm outline-none focus:border-primary/60"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => void loadYouTube()}
                  disabled={ytLoading || !ytUrl.trim()}
                  className="flex items-center gap-2 rounded-xl border border-border px-4 text-sm font-bold hover:bg-surface-2 disabled:opacity-50"
                >
                  {ytLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <MonitorPlay className="h-4 w-4" />}
                  Buscar
                </button>
              </div>

              {ytError && (
                <p className="flex items-center gap-2 text-xs text-red-300">
                  <AlertCircle className="h-3.5 w-3.5" /> {ytError}
                </p>
              )}

              {ytMeta && (
                <div className="rounded-xl border border-border bg-background p-3">
                  <div className="flex gap-3">
                    <iframe
                      src={ytMeta.embedUrl}
                      title={ytMeta.title}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      className="h-20 w-32 rounded-lg object-cover"
                    />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold">{ytMeta.title}</p>
                      <p className="truncate text-xs text-muted">{ytMeta.artist ?? "YouTube"}</p>
                      <p className="mt-2 text-[11px] leading-relaxed text-muted">{ytMeta.note}</p>
                    </div>
                  </div>

                  <div className="mt-3 rounded-lg border border-dashed border-border p-3">
                    <p className="text-xs text-muted/80">
                      {ytMeta.note}
                    </p>
                    <input
                      ref={ytFileInputRef}
                      type="file"
                      accept="audio/*,.mp3,.wav,.m4a,.ogg,.flac,.aac"
                      className="hidden"
                      onChange={(event) => {
                        const chosen = event.target.files?.[0];
                        if (chosen) void acceptFile(chosen);
                        event.target.value = "";
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => ytFileInputRef.current?.click()}
                      className="flex w-full items-center justify-center gap-2 text-xs font-semibold text-primary"
                    >
                      <Upload className="h-3.5 w-3.5" />
                      {file ? `Áudio anexo: ${file.name}` : "Anexar o arquivo de áudio desta música"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-semibold text-muted">Título *</label>
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                required
                placeholder="Ex: Evidências"
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary/60"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-muted">Artista</label>
              <input
                value={artist}
                onChange={(event) => setArtist(event.target.value)}
                placeholder="Ex: Chitãozinho & Xororó"
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary/60"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            <button
              type="submit"
              disabled={saving}
              className="flex flex-1 items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-bold text-primary-foreground disabled:opacity-60"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              {saving ? step ?? "Salvando…" : "Salvar na minha biblioteca"}
            </button>

            {mode === "youtube" && ytMeta && !file && (
              <button
                type="button"
                onClick={() => void handleReferenceOnly()}
                disabled={saving}
                className="rounded-full border border-border px-5 py-3 text-sm font-semibold text-muted hover:text-foreground disabled:opacity-60"
              >
                Salvar só a referência
              </button>
            )}
          </div>

          <p className="text-center text-[11px] text-muted">
            Nada de arquivo no banco: só o caminho. O MP3 fica na sua pasta e pode ser apagado quando quiser.
          </p>
        </form>
      </div>
    </main>
  );
}

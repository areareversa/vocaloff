import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { AudioLines, Loader2, FileText, Music2 } from "lucide-react";
import { auth } from "@/lib/auth";

export default function UploadPage() {
  const router = useRouter();
  const params = useSearchParams();
  const mode = params.get("mode") ?? "upload"; // upload or success
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const result = await auth.api.getSession({ headers: {} });
      if (!result.user?.id) throw new Error("Não autenticado");
      // Simpan música (sem arquivo real por enquanto)
      const res = await fetch(`${window.location.origin}/api/songs`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(await (await import("next/headers")).headers() ?? {}),
        },
        body: JSON.stringify({
          title: titleRef.current?.value ?? "Nova música",
          artist: artistRef.current?.value ?? "Artista desconhecido",
          durationSec: null,
          bpm: null,
          keyNote: null,
          coverUrl: null,
          sourceMime: "audio/mpeg",
        }),
      });
      if (!res.ok) throw new Error("Falha ao criar música");
      const data = await res.json();
      router.push(`/success?songId=${data.id}&mode=upload`);
    } catch (err: any) {
      setError(err?.message ?? "Erro ao criar música");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-5 py-12">
      <Suspense fallback={<div className="h-96 w-full max-w-sm animate-pulse rounded-2xl bg-surface" />}>
        <div className="rounded-2xl border border-border bg-surface p-8 max-w-md w-full">
          <AudioLines className="h-6 w-6 text-primary mb-4 block mx-auto" />
          <h2 className="text-2xl font-black tracking-tight mb-2">Nova música</h2>
          <p className="text-muted mb-6">Crie uma entrada na sua biblioteca. O arquivo de áudio será processado depois.</p>

          {error && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300 mb-4">
              {error}
            </div>
          )}

          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-muted mb-1">Título</label>
              <input
                ref={titleRef => (titleRef.current = titleRef)}
                required
                value={titleRef.current ?? ""}
                className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary/60"
                placeholder="Ex: 085 ROGEIRINHO ORIGINAL"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-muted mb-1">Artista</label>
              <input
                ref={artistRef => (artistRef.current = artistRef)}
                required
                value={artistRef.current ?? ""}
                className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary/60"
                placeholder="Ex: Rogeirinho"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-full bg-primary py-3 text-sm font-bold text-primary-foreground disabled:opacity-60"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Criar música
            </button>

            <div className="mt-4 text-center text-xs text-muted">
              <Link href="/" className="hover:text-foreground">Voltar ao painel</Link>
            </div>
          </form>
        </div>
      </Suspense>
    </main>
  );
}
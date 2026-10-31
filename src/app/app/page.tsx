import { Suspense } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { AudioLines, LogOut, Music2, Plus, Upload } from "lucide-react";
import { auth } from "@/lib/auth";

async function Library() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  return (
    <main className="flex-1">
      <header className="border-b border-border/60">
        <div className="mx-auto flex h-16 max-w-5xl items-center gap-4 px-5">
          <Link href="/app" className="flex items-center gap-2 font-black tracking-tight">
            <AudioLines className="h-5 w-5 text-primary" />
            VocalOff
          </Link>
          <div className="ml-auto flex items-center gap-3 text-sm">
            <span className="hidden text-muted sm:inline">{session.user.email}</span>
            <Link
              href="/api/auth/sign-out"
              className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-muted hover:text-foreground"
            >
              <LogOut className="h-3.5 w-3.5" /> Sair
            </Link>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-5xl px-5 py-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black tracking-tight">Minha biblioteca</h1>
            <p className="mt-1 text-sm text-muted">
              Envie uma música para separar os stems.
            </p>
          </div>
          <button
            type="button"
            className="flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground"
          >
            <Plus className="h-4 w-4" /> Enviar música
          </button>
        </div>

        <div className="mt-8 rounded-2xl border border-dashed border-border bg-surface/50 px-6 py-16 text-center">
          <Upload className="mx-auto h-8 w-8 text-muted" />
          <h2 className="mt-4 font-bold">Sua biblioteca está vazia</h2>
          <p className="mx-auto mt-1 max-w-sm text-sm text-muted">
            Aceitamos MP3, WAV e M4A. A separação leva de 1 a 3 minutos e você acompanha o
            progresso em tempo real.
          </p>
          <div className="mt-6 flex items-center justify-center gap-2 text-xs text-muted">
            <Music2 className="h-4 w-4" /> 2 separações grátis por mês
          </div>
        </div>
      </section>
    </main>
  );
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

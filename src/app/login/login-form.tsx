"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { AudioLines, Loader2 } from "lucide-react";
import { authClient } from "@/lib/auth-client";

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [mode, setMode] = useState<"signin" | "signup">(
    params.get("mode") === "signup" ? "signup" : "signin",
  );
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const result =
        mode === "signup"
          ? await authClient.signUp.email({ name, email, password })
          : await authClient.signIn.email({ email, password });

      if (result.error) {
        setError(result.error.message ?? "Não foi possível continuar.");
        return;
      }
      router.push("/app");
      router.refresh();
    } catch {
      setError("Erro de conexão. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-sm">
      <Link href="/" className="flex items-center justify-center gap-2 font-black tracking-tight">
        <AudioLines className="h-5 w-5 text-primary" />
        VocalOff
      </Link>

      <div className="mt-8 rounded-2xl border border-border bg-surface p-6">
        <div className="mb-5 grid grid-cols-2 gap-1 rounded-full bg-background p-1 text-sm font-semibold">
          <button
            type="button"
            onClick={() => setMode("signin")}
            className={mode === "signin" ? "rounded-full bg-primary py-2 text-primary-foreground" : "py-2 text-muted"}
          >
            Entrar
          </button>
          <button
            type="button"
            onClick={() => setMode("signup")}
            className={mode === "signup" ? "rounded-full bg-primary py-2 text-primary-foreground" : "py-2 text-muted"}
          >
            Criar conta
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-3">
          {mode === "signup" && (
            <label className="block">
              <span className="text-xs font-semibold text-muted">Nome</span>
              <input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary/60"
                placeholder="Seu nome"
              />
            </label>
          )}
          <label className="block">
            <span className="text-xs font-semibold text-muted">E-mail</span>
            <input
              required
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary/60"
              placeholder="voce@email.com"
            />
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-muted">Senha</span>
            <input
              required
              type="password"
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary/60"
              placeholder="mínimo 8 caracteres"
            />
          </label>

          {error && (
            <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-60"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {mode === "signup" ? "Criar conta" : "Entrar"}
          </button>
        </form>
      </div>

      <p className="mt-4 text-center text-xs text-muted">
        Ao continuar você aceita os termos de uso e a política de privacidade.
      </p>
    </div>
  );
}

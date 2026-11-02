"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import Link from "next/link";
import {
  AudioLines,
  Download,
  FolderPlus,
  HardDrive,
  Loader2,
  LogOut,
  Music2,
  Plus,
  Search,
  Upload,
} from "lucide-react";
import { cn } from "@/lib/utils";

export function NavBar({ loggedIn = false, email = "" }: { loggedIn: boolean; email?: string }) {
  const router = useRouter();
  const [showMenu, setShowMenu] = useState(false);

  const handleLogin = () => router.push("/login");
  const handleUpload = () => router.push("/upload");
  const handleLibrary = () => router.push("/library");
  const handleApp = () => router.push("/app");
  const handlePlayer = () => router.push("/player");
  const handleLogout = () => router.push("/api/auth/sign-out");

  return (
    <nav className="border-b border-border/60 bg-background/80 backdrop-blur-sm">
      <div className="mx-auto max-w-7xl px-5 h-16 flex items-center justify-between">
        <Link
          href="/"
          className="flex items-center gap-2 font-black tracking-tight text-2xl sm:text-3xl"
        >
          <AudioLines className="h-5 w-5 text-primary" /> VocalOff
        </Link>

        <div className="hidden sm:flex items-center gap-8 text-sm text-muted">
          <Link href="/app" className={cn("hover:text-foreground", loggedIn ? "font-bold" : "")}>
            Minha biblioteca
          </Link>
          <Link href="/upload" className={cn("hover:text-foreground", !loggedIn ? "font-bold" : "")}>
            Enviar música
          </Link>
          <Link href="/library" className={cn("hover:text-foreground", loggedIn ? "font-bold" : "")}>
            Biblioteca pública
          </Link>
        </div>

        {loggedIn ? (
          <div className="flex items-center gap-3">
            <span className="hidden text-xs text-muted sm:inline">{email}</span>
            <Link
              href="/api/auth/sign-out"
              className="rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-muted hover:text-foreground"
            >
              Sair
            </Link>
          </div>
        ) : (
          <>
            <Link href="/login" className="rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/10">
              Entrar
            </Link>
            <Link href="/register" className="rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-muted hover:bg-surface-2">
              Cadastro
            </Link>
          </>
        )}
      </div>

      {/* Mobile menu */}
      {(!loggedIn || showMenu) && (
        <div className="sm:hidden pt-4">
          <Link href="/app" className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-left margin-y-2 hover:bg-primary/10">
            <div className="flex items-center gap-3">
              <AudioLines className="h-4 w-4 text-primary" />
              <span>Minha biblioteca</span>
            </div>
          </Link>
          <Link href="/upload" className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-left margin-y-2 hover:bg-primary/10">
            <div className="flex items-center gap-3">
              <Upload className="h-4 w-4" />
              <span>Enviar música</span>
            </div>
          </Link>
          <Link href="/library" className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-left margin-y-2 hover:bg-primary/10">
            <div className="flex items-center gap-3">
              <Music2 className="h-4 w-4 text-primary" />
              <span>Biblioteca pública</span>
            </div>
          </Link>
          {loggedIn && (
            <Link
              href="/api/auth/sign-out"
              className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-left margin-y-2 hover:bg-red-500/10"
            >
              <div className="flex items-center gap-3">
                <LogOut className="h-4 w-4" />
                <span>Sair</span>
              </div>
            </Link>
          )}
        </div>
      )}
    </nav>
  );
}
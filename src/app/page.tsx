import Link from "next/link";
import {
  AudioLines,
  Gauge,
  MicVocal,
  Music4,
  SlidersHorizontal,
  Sparkles,
  Upload,
  Waves,
} from "lucide-react";

const features = [
  {
    icon: MicVocal,
    title: "Tire a voz em minutos",
    text: "Separação por IA entrega vocais, bateria, baixo, guitarra, teclado e o resto — pronto para tocar.",
  },
  {
    icon: SlidersHorizontal,
    title: "Mixer por pista",
    text: "Volume, mute e solo em cada instrumento. O que você toca ao vivo já abre desligado.",
  },
  {
    icon: Gauge,
    title: "Tom e velocidade independentes",
    text: "Suba meio tom sem acelerar. Diminua o tempo sem desafinar. Letra e cifra acompanham.",
  },
  {
    icon: Waves,
    title: "Modo Palco",
    text: "Tela travada, sem apagar, show emendado e atalhos de pedal. Feito para o palco, não para o sofá.",
  },
  {
    icon: Music4,
    title: "Setlists que a banda entende",
    text: "Monte o repertório, arraste para ordenar e compartilhe com o grupo por link.",
  },
  {
    icon: Upload,
    title: "Suas músicas, seu acervo",
    text: "Importe MP3, WAV ou um .zip de pistas. Tudo fica na sua biblioteca, pronto para ensaiar.",
  },
];

const steps = [
  { n: "01", t: "Envie a música", d: "MP3, WAV ou M4A. A gente cuida do resto." },
  { n: "02", t: "A IA separa", d: "Stems limpos, alinhados e normalizados." },
  { n: "03", t: "Toque", d: "Mixer, tom, velocidade e palco — no celular." },
];

export default function Home() {
  return (
    <main className="flex-1">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-5">
          <Link href="/" className="flex items-center gap-2 font-black tracking-tight">
            <AudioLines className="h-5 w-5 text-primary" />
            VocalOff
          </Link>
          <nav className="ml-auto hidden items-center gap-6 text-sm text-muted sm:flex">
            <a href="#recursos" className="hover:text-foreground">Recursos</a>
            <a href="#como-funciona" className="hover:text-foreground">Como funciona</a>
            <a href="#planos" className="hover:text-foreground">Planos</a>
          </nav>
          <div className="ml-auto flex items-center gap-2 sm:ml-0">
            <Link
              href="/login"
              className="rounded-full px-4 py-2 text-sm font-semibold text-muted hover:text-foreground"
            >
              Entrar
            </Link>
            <Link
              href="/login?mode=signup"
              className="rounded-full bg-primary px-4 py-2 text-sm font-bold text-primary-foreground hover:brightness-95"
            >
              Começar grátis
            </Link>
          </div>
        </div>
      </header>

      <section className="glow border-b border-border/60">
        <div className="mx-auto grid max-w-6xl gap-12 px-5 py-20 lg:grid-cols-[1.1fr_0.9fr] lg:py-28">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
              <Sparkles className="h-3.5 w-3.5" />
              Separação de stems com IA
            </span>
            <h1 className="mt-5 text-5xl font-black leading-[1.05] tracking-tight sm:text-6xl">
              Tire a voz.
              <br />
              Fique com a banda.
            </h1>
            <p className="mt-5 max-w-xl text-lg text-muted">
              Envie qualquer música e receba vocais, bateria, baixo, guitarra e teclado
              separados. Depois toque com tom, velocidade e mixer por pista — no celular,
              no palco, sem internet.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                href="/login?mode=signup"
                className="rounded-full bg-primary px-6 py-3 text-sm font-bold text-primary-foreground hover:brightness-95"
              >
                Separar minha primeira música
              </Link>
              <Link
                href="/login"
                className="rounded-full border border-border px-6 py-3 text-sm font-semibold hover:bg-surface"
              >
                Já tenho conta
              </Link>
            </div>
            <p className="mt-4 text-xs text-muted">
              2 músicas grátis por mês · sem cartão · cancele quando quiser
            </p>
          </div>

          <div className="rounded-3xl border border-border bg-surface/80 p-5 shadow-2xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-widest text-muted">Tocando agora</p>
                <p className="mt-1 text-lg font-bold">Evidências</p>
                <p className="text-sm text-muted">César Menotti &amp; Fabiano</p>
              </div>
              <span className="rounded-full bg-primary/15 px-2.5 py-1 text-xs font-bold text-primary">
                −2 st
              </span>
            </div>
            <div className="mt-5 space-y-2.5">
              {[
                { name: "Vocais", level: 0.15, muted: true },
                { name: "Bateria", level: 0.82, muted: false },
                { name: "Baixo", level: 0.7, muted: false },
                { name: "Violão", level: 0.55, muted: false },
                { name: "Sanfona", level: 0.42, muted: false },
              ].map((s) => (
                <div key={s.name} className="flex items-center gap-3">
                  <span className="w-20 text-xs font-semibold text-muted">{s.name}</span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/5">
                    <div
                      className={s.muted ? "h-full rounded-full bg-white/15" : "h-full rounded-full bg-primary"}
                      style={{ width: `${s.level * 100}%` }}
                    />
                  </div>
                  <span
                    className={
                      s.muted
                        ? "rounded bg-white/5 px-2 py-0.5 text-[10px] font-bold text-muted"
                        : "rounded bg-primary/15 px-2 py-0.5 text-[10px] font-bold text-primary"
                    }
                  >
                    {s.muted ? "MUTE" : "ON"}
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-6 flex items-center justify-between border-t border-border pt-4 text-xs text-muted">
              <span>1,00× velocidade</span>
              <span>3:42 / 3:42</span>
            </div>
          </div>
        </div>
      </section>

      <section id="recursos" className="mx-auto max-w-6xl px-5 py-20">
        <h2 className="text-3xl font-black tracking-tight sm:text-4xl">
          Tudo que o músico precisa depois da separação
        </h2>
        <p className="mt-3 max-w-2xl text-muted">
          Separar é só o começo. O VocalOff transforma stems em ferramenta de ensaio e de palco.
        </p>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <div
              key={f.title}
              className="rounded-2xl border border-border bg-surface p-5 transition hover:border-primary/40"
            >
              <f.icon className="h-5 w-5 text-primary" />
              <h3 className="mt-3 font-bold">{f.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted">{f.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="como-funciona" className="border-y border-border/60 bg-surface/40">
        <div className="mx-auto max-w-6xl px-5 py-20">
          <h2 className="text-3xl font-black tracking-tight sm:text-4xl">Como funciona</h2>
          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            {steps.map((s) => (
              <div key={s.n} className="rounded-2xl border border-border bg-background p-6">
                <span className="font-mono text-sm text-primary">{s.n}</span>
                <h3 className="mt-3 text-lg font-bold">{s.t}</h3>
                <p className="mt-1 text-sm text-muted">{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="planos" className="mx-auto max-w-6xl px-5 py-20">
        <h2 className="text-3xl font-black tracking-tight sm:text-4xl">Planos</h2>
        <div className="mt-10 grid gap-4 lg:grid-cols-3">
          {[
            { name: "Grátis", price: "R$ 0", items: ["2 separações/mês", "Mixer por pista", "Modo Palco"] },
            {
              name: "Pro",
              price: "R$ 29/mês",
              items: ["40 separações/mês", "Setlists e compartilhamento", "Offline no celular"],
              highlight: true,
            },
            { name: "Studio", price: "R$ 79/mês", items: ["Separações ilimitadas", "Stems em WAV", "API e exportação"] },
          ].map((p) => (
            <div
              key={p.name}
              className={
                p.highlight
                  ? "rounded-2xl border border-primary/50 bg-primary/[0.06] p-6"
                  : "rounded-2xl border border-border bg-surface p-6"
              }
            >
              <div className="flex items-baseline justify-between">
                <h3 className="font-bold">{p.name}</h3>
                {p.highlight && (
                  <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-primary-foreground">
                    MAIS ESCOLHIDO
                  </span>
                )}
              </div>
              <p className="mt-2 text-2xl font-black">{p.price}</p>
              <ul className="mt-4 space-y-2 text-sm text-muted">
                {p.items.map((i) => (
                  <li key={i} className="flex gap-2">
                    <span className="text-primary">✓</span>
                    {i}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-border/60">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-5 py-8 text-xs text-muted sm:flex-row sm:items-center sm:justify-between">
          <p>© 2026 VocalOff. Feito para quem vive de música.</p>
          <p>Stems privados · sem catálogo de terceiros · sua música, sua conta</p>
        </div>
      </footer>
    </main>
  );
}

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
    title: "Adicionar músicas",
    text: "Envie arquivos do seu dispositivo ou cole links do YouTube. Os stems são salvos na sua pasta.",
  },
];

export default function HomePage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-5 py-10">
      <div className="mb-6 flex items-center justify-between">
        <Link href="/app" className="flex items-center gap-2 font-black tracking-tight">
          <AudioLines className="h-5 w-5 text-primary" /> VocalOff
        </Link>
        <Link href="/upload" className="rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground">
          <Upload className="h-4 w-4" /> Enviar música
        </Link>
      </div>

      <h1 className="text-3xl font-black tracking-tight">VocalOff</h1>

      <p className="mt-4 text-muted">
        Separe qualquer música em vocais, bateria, baixo, guitarra e teclado.
      </p>

      <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3">
        {features.map((feat) => (
          <div
            key={feat.title}
            className="rounded-2xl border border-border bg-surface p-4 text-center"
          >
            <feat.icon className="mx-auto h-10 w-10 text-primary mb-3" />
            <h2 className="font-black tracking-tight">{feat.title}</h2>
            <p className="text-muted line-clamp-2">{feat.text}</p>
          </div>
        ))}
      </div>

      <div className="mt-10 rounded-2xl border border-dashed border-border bg-surface/50 px-6 py-14 text-center">
        <Upload className="mx-auto h-8 w-8 text-muted" />
        <h2 className="mt-4 font-bold">Comece separando suas primeiras músicas</h2>
        <p className="mx-auto mt-1 max-w-md text-sm text-muted">
          Envie um MP3/WAV do seu dispositivo ou cole um link do YouTube. O áudio é gravado na
          pasta que você escolher — nunca no banco de dados. Use o player para misturar as pistas
          separadas e exportar setlists.
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
    </main>
  );
}
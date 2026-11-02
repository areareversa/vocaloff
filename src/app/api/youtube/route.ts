import { NextResponse } from "next/server";

/**
 * Metadados de um vídeo do YouTube via oEmbed (sem API key).
 *
 * Importante: oEmbed devolve título/autor/capa, NÃO devolve áudio. O áudio
 * precisa ser enviado pelo usuário (arquivo do dispositivo) para ser separado.
 * Não fazemos download de áudio do YouTube.
 */

function videoId(input: string): string | null {
  const raw = input.trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(raw)) return raw;
  try {
    const url = new URL(raw.startsWith("http") ? raw : `https://${raw}`);
    const host = url.hostname.replace(/^www\./, "");
    if (host === "youtu.be") {
      const id = url.pathname.split("/").filter(Boolean)[0];
      return id && /^[a-zA-Z0-9_-]{11}$/.test(id) ? id : null;
    }
    if (host === "youtube.com" || host === "m.youtube.com" || host === "music.youtube.com") {
      const v = url.searchParams.get("v");
      if (v && /^[a-zA-Z0-9_-]{11}$/.test(v)) return v;
      const parts = url.pathname.split("/").filter(Boolean);
      const marker = parts.findIndex((part) => ["shorts", "embed", "live"].includes(part));
      const id = marker >= 0 ? parts[marker + 1] : null;
      return id && /^[a-zA-Z0-9_-]{11}$/.test(id) ? id : null;
    }
    return null;
  } catch {
    return null;
  }
}

export async function GET(request: Request) {
  const input = new URL(request.url).searchParams.get("url");
  if (!input) {
    return NextResponse.json({ error: "Informe a URL do vídeo." }, { status: 400 });
  }
  const id = videoId(input);
  if (!id) {
    return NextResponse.json({ error: "Link do YouTube inválido." }, { status: 400 });
  }

  const watchUrl = `https://www.youtube.com/watch?v=${id}`;
  const oembed = `https://www.youtube.com/oembed?url=${encodeURIComponent(watchUrl)}&format=json`;

  try {
    const res = await fetch(oembed, {
      headers: { "user-agent": "VocalOff/0.1" },
      next: { revalidate: 3600 },
    });
    if (!res.ok) {
      return NextResponse.json(
        {
          error:
            res.status === 401 || res.status === 403 || res.status === 404
              ? "Vídeo privado, bloqueado ou inexistente."
              : `YouTube respondeu ${res.status}.`,
        },
        { status: 400 },
      );
    }
    const data = (await res.json()) as {
      title?: string;
      author_name?: string;
      thumbnail_url?: string;
    };

    return NextResponse.json({
      videoId: id,
      url: watchUrl,
      title: data.title ?? "Vídeo do YouTube",
      artist: data.author_name ?? null,
      thumbnail: data.thumbnail_url ?? `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
      embedUrl: `https://www.youtube.com/embed/${id}`,
      audioAvailable: false,
      note: "O YouTube fornece apenas os metadados. Para separar as faixas, anexe o arquivo de áudio que você já tem.",
    });
  } catch (err) {
    console.error("oEmbed error:", err);
    return NextResponse.json({ error: "Não foi possível consultar o YouTube." }, { status: 502 });
  }
}

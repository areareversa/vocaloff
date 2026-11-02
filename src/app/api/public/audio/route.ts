import { NextResponse } from "next/server";

const ALLOWED_HOSTS = new Set([
  "ccmixter.org",
  "content.cohkm.net",
  "ccmixter.s3.amazonaws.com",
  "i.ytimg.com",
  "img.youtube.com",
]);

export async function GET(request: Request) {
  const url = new URL(request.url).searchParams.get("u");
  if (!url) {
    return NextResponse.json({ error: "URL ausente" }, { status: 400 });
  }

  let target: URL;
  try {
    target = new URL(url);
  } catch {
    return NextResponse.json({ error: "URL inválida" }, { status: 400 });
  }

  if (target.protocol !== "https:" && target.protocol !== "http:") {
    return NextResponse.json({ error: "Protocolo não permitido" }, { status: 400 });
  }
  if (!ALLOWED_HOSTS.has(target.hostname)) {
    return NextResponse.json({ error: "Host não permitido" }, { status: 403 });
  }

  const range = request.headers.get("range");

  try {
    const upstream = await fetch(target.toString(), {
      headers: {
        range: range ?? "",
        "user-agent": "VocalOff/0.1",
        referer: "https://ccmixter.org/",
      },
    });

    const headers = new Headers();
    const passthrough = [
      "content-type",
      "content-length",
      "content-range",
      "accept-ranges",
      "etag",
      "last-modified",
      "cache-control",
    ];
    for (const key of passthrough) {
      const value = upstream.headers.get(key);
      if (value) headers.set(key, value);
    }
    if (!headers.get("cache-control")) {
      headers.set("cache-control", "public, max-age=3600, stale-while-revalidate=86400");
    }

    return new Response(upstream.body, {
      status: upstream.status,
      headers,
    });
  } catch (err) {
    console.error("proxy error:", err);
    return NextResponse.json({ error: "Falha ao buscar áudio" }, { status: 502 });
  }
}

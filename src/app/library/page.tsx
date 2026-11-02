import type { Metadata } from "next";
import PublicLibrary from "@/components/public-library";
import { publicCatalogMeta, publicTracks } from "@/lib/public-tracks";

export const metadata: Metadata = {
  title: "Biblioteca pública — VocalOff",
  description:
    "Faixas Creative Commons com pistas separadas para você baixar no seu dispositivo e usar no player.",
};

export default function LibraryPage() {
  return (
    <>
      <PublicLibrary tracks={publicTracks} />
      <p className="sr-only">
        Catálogo gerado em {publicCatalogMeta.generatedAt} a partir de {publicCatalogMeta.source}.
      </p>
    </>
  );
}

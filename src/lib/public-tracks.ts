import catalog from "@/data/public-tracks.json";
import type { StemKind } from "@/db/schema";

export interface PublicTrackStem {
  label: string;
  url: string;
  mime: string;
}

export interface PublicTrack {
  id: string;
  title: string;
  artist: string;
  durationSec: number;
  bpm: number | null;
  genre: string;
  tags: string[];
  license: string;
  licenseUrl: string;
  pageUrl: string;
  audioUrl: string;
  mime: string;
  bytes: number | null;
  hasStems: boolean;
  stems: PublicTrackStem[];
}

const data = catalog as {
  generatedAt: string;
  source: string;
  licenseFilter: string;
  tracks: PublicTrack[];
};

export const publicTracks = data.tracks;
export const publicCatalogMeta = {
  generatedAt: data.generatedAt,
  source: data.source,
  licenseFilter: data.licenseFilter,
};

/** URL de áudio passa pelo nosso proxy (CORS + Range + allowlist). */
export function audioProxy(url: string) {
  return `/api/public/audio?u=${encodeURIComponent(url)}`;
}

const KIND_RULES: Array<[RegExp, StemKind]> = [
  [/drum|perc|bateria|kick|snare|hat/i, "drums"],
  [/bass|baixo/i, "bass"],
  [/vox|vocal|pell|pella|acap|voice|coro|choir/i, "vocals"],
  [/guitar|violao|violão/i, "guitar"],
  [/piano|keys|keyboard|rhodes|wurli|organ|pad/i, "piano"],
  [/instrumental|playback|karaoke/i, "instrumental"],
  [/click|metronom|count/i, "click"],
];

export function stemKindFromLabel(label: string): StemKind {
  for (const [pattern, kind] of KIND_RULES) {
    if (pattern.test(label)) return kind;
  }
  return "other";
}

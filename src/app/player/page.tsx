"use client";

import { Suspense } from "react";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { AudioLines, SlidersHorizontal, Play, Pause, FastForward, StepForward, Volume2, Speaker } from "lucide-react";

export default function PlayerPage() {
  const [src, setSrc] = useState<string | null>(null);
  const [speed, setSpeed] = useState(1);
  const [volume, setVolume] = useState(1);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  // Mock stem list
  const stems = [
    { kind: "vocals", label: "Vocal", enabled: true },
    { kind: "drums", label: "Bateria", enabled: true },
    { kind: "bass", label: "Baixo", enabled: true },
    { kind: "other", label: "Outros", enabled: true },
  ];

  useEffect(() => {
    if (!src || !audioRef.current) return;
    const audio = audioRef.current;
    audio.src = src;
    audio.playbackRate = speed;
    audio.volume = volume;
    audio.oncanplaythrough = () => {
      audio.play().catch(() => {/* user gesture needed */});
      setIsPlaying(true);
    };
  }, [src, speed, volume]);

  const togglePlay = () => {
    setIsPlaying((p) => {
      const next = !p;
      if (audioRef.current) audioRef.current[next ? "play" : "pause"]();
      return next;
    });
  };

  const setSpeedValue = (v: number) => {
    setSpeed(Math.max(0.5, Math.min(2, v)));
    if (audioRef.current) audioRef.current.playbackRate = speed;
  };

  const setVolumeValue = (v: number) => {
    setVolume(Math.max(0, Math.min(1, v)));
    if (audioRef.current) audioRef.current.volume = volume;
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-5 py-12">
      <Suspense fallback={<div className="h-96 w-full max-w-sm animate-pulse rounded-2xl bg-surface" />}>
        <div className="rounded-2xl border border-border bg-surface p-8 max-w-2xl w-full">
          <AudioLines className="h-6 w-6 text-primary mb-4 block mx-auto" />
          <h2 className="text-2xl font-black tracking-tight mb-6">Player de Stems</h2>

          {/* controles */}
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted">Velocidade</span>
              <input
                type="range"
                min={0.5}
                max={2}
                step={0.1}
                value={speed}
                onChange={(e) => setSpeedNumber(parseFloat(e.target.value))}
                className="w-32 rounded-xl appearance-none bg-primary/20 p-2"
              />
              <span className="text-xs text-muted">{speed.toFixed(1)}×</span>
            </div>
            <div className="flex items-center gap-2">
              {isPlaying ? (
                <Pause className="h-5 w-5 text-primary" onClick={togglePlay} />
              ) : (
                <Play className="h-5 w-5 text-primary" onClick={togglePlay} />
              )}
              <span className="text-xs text-muted">{isPlaying ? "Pause" : "Play"}</span>
            </div>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-semibold text-muted mb-1">Volume</label>
            <input
              type="range"
              min={0}
              max={1}
              step={0.1}
              value={volume}
              onChange={(e) => setVolumeNumber(parseFloat(e.target.value))}
              className="w-full rounded-xl appearance-none bg-primary/20 p-2"
            />
          </div>

          {/* stems list */}
          <div className="mt-8 space-y-2 text-sm">
            {stems.map((s) => (
              <div key={s.kind} className="flex items-center gap-3">
                <span className={s.enabled ? "text-foreground" : "text-muted/50"}>
                  {s.label}
                </span>
                <span className={s.enabled ? "text-primary" : "text-muted/50"}>✓</span>
              </div>
            ))}
          </div>

          {/* audio player */}
          <div className="mt-8 rounded-xl border border-border bg-background p-4">
            <audio
              ref={audioRef}
              className="w-full"
              controls={isPlaying}
              style={{ opacity: isPlaying ? 1 : 0.5 }}
            />
            {!isPlaying && (
              <p className="mt-2 text-xs text-muted">Arraste um stem acima ou carregue uma música para tocar.</p>
            )}
          </div>
        </div>
      </Suspense>
    </main>
  );
}

// helpers outside component to avoid re-render noise
function setSpeedNumber(v: number) {
  // noop; state handled in component
}
function setVolumeNumber(v: number) {
  // noop
}
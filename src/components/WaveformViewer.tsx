"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import WaveSurfer from "wavesurfer.js";
import { useTransportStore, registerSeekHandler } from "@/lib/store/transport-store";
import type { AudioAnalysis } from "@/lib/audio/types";

interface WaveformViewerProps {
  audioUrl: string;
  analysis?: AudioAnalysis | null;
}

export default function WaveformViewer({ audioUrl, analysis }: WaveformViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const wavesurferRef = useRef<WaveSurfer | null>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize WaveSurfer
  useEffect(() => {
    if (!containerRef.current) return;

    let cancelled = false;
    let isReady = false;

    const ws = WaveSurfer.create({
      container: containerRef.current,
      waveColor: "oklch(85% 0.08 210)",
      progressColor: "oklch(62% 0.16 210)",
      cursorColor: "oklch(60% 0.18 25)",
      cursorWidth: 2,
      height: 128,
      barWidth: 2,
      barGap: 1,
      barRadius: 2,
      normalize: true,
    });

    ws.on("ready", () => {
      isReady = true;
      if (!cancelled) {
        setDuration(ws.getDuration());
        setLoading(false);
      } else {
        ws.destroy();
      }
    });

    ws.on("error", (err) => {
      isReady = true;
      if (!cancelled) {
        setLoading(false);
        setError(err?.message || "Failed to load audio");
      } else {
        ws.destroy();
      }
    });

    // this component owns the audio — publish its clock to the shared
    // transport store so the timeline playhead and the show preview follow
    const transport = useTransportStore.getState();
    ws.on("audioprocess", () => {
      if (!cancelled) {
        setCurrentTime(ws.getCurrentTime());
        transport.setCurrentTime(ws.getCurrentTime());
      }
    });

    ws.on("seeking", () => {
      if (!cancelled) {
        setCurrentTime(ws.getCurrentTime());
        transport.setCurrentTime(ws.getCurrentTime());
      }
    });

    ws.on("play", () => { if (!cancelled) { setPlaying(true); transport.setPlaying(true); } });
    ws.on("pause", () => { if (!cancelled) { setPlaying(false); transport.setPlaying(false); } });
    ws.on("finish", () => { if (!cancelled) { setPlaying(false); transport.setPlaying(false); } });

    ws.load(audioUrl);
    wavesurferRef.current = ws;
    // clicking the timeline ruler seeks the real audio through this handler
    registerSeekHandler((t) => {
      const w = wavesurferRef.current;
      if (w) w.setTime(t);
    });

    return () => {
      cancelled = true;
      registerSeekHandler(null);
      useTransportStore.getState().setPlaying(false);
      wavesurferRef.current = null;
      if (isReady) ws.destroy();
    };
  }, [audioUrl]);

  // Spacebar to toggle play/pause
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.code === "Space" && !isInputFocused()) {
        e.preventDefault();
        wavesurferRef.current?.playPause();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const togglePlay = useCallback(() => {
    wavesurferRef.current?.playPause();
  }, []);

  const stop = useCallback(() => {
    const ws = wavesurferRef.current;
    if (ws) {
      ws.stop();
      setCurrentTime(0);
      setPlaying(false);
    }
  }, []);

  const skipBack = useCallback(() => {
    const ws = wavesurferRef.current;
    if (ws) {
      ws.seekTo(0);
      setCurrentTime(0);
    }
  }, []);

  function formatTime(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 100);
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}.${String(ms).padStart(2, "0")}`;
  }

  return (
    <div className="flex flex-col" style={{ background: "var(--bg)" }}>
      {/* Transport bar */}
      <div
        className="flex items-center gap-2.5 px-3.5 shrink-0"
        style={{
          height: 48,
          borderBottom: "1px solid var(--line)",
          background: "var(--surface)",
        }}
      >
        <button
          onClick={skipBack}
          className="inline-flex items-center justify-center w-7 h-7 rounded-md transition-colors"
          style={{ border: "1px solid var(--line)", background: "var(--surface)" }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polygon points="19 20 9 12 19 4 19 20" /><line x1="5" y1="19" x2="5" y2="5" />
          </svg>
        </button>

        <button
          onClick={togglePlay}
          className="inline-flex items-center justify-center w-9 h-8 rounded-md transition-colors"
          style={{ background: "var(--accent)", color: "#fff", border: "1px solid var(--accent)" }}
        >
          {playing ? (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <rect x="6" y="4" width="4" height="16" rx="1" />
              <rect x="14" y="4" width="4" height="16" rx="1" />
            </svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
          )}
        </button>

        <button
          onClick={stop}
          className="inline-flex items-center justify-center w-7 h-7 rounded-md transition-colors"
          style={{ border: "1px solid var(--line)", background: "var(--surface)" }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
            <rect x="6" y="4" width="12" height="16" rx="1" />
          </svg>
        </button>

        <div
          className="px-2.5 py-1 rounded-md text-xs font-mono"
          style={{
            background: "var(--panel)",
            color: "var(--ink-2)",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {formatTime(currentTime)}{" "}
          <span style={{ color: "var(--ink-4)" }}>/ {formatTime(duration)}</span>
        </div>

        <div className="flex-1" />

        {/* BPM chip */}
        {analysis && (
          <span
            className="inline-flex items-center gap-1.5 px-2 rounded-full text-xs"
            style={{ height: 22, background: "var(--panel)", color: "var(--ink-3)", border: "1px solid var(--line)" }}
          >
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--accent)" }} />
            {analysis.bpm} BPM
          </span>
        )}

        {analysis && (
          <span
            className="inline-flex items-center gap-1.5 px-2 rounded-full text-xs"
            style={{ height: 22, background: "var(--panel)", color: "var(--ink-3)", border: "1px solid var(--line)" }}
          >
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--ink-4)" }} />
            {analysis.beats.length} beats
          </span>
        )}

        {duration > 0 && !analysis && (
          <span
            className="inline-flex items-center gap-1.5 px-2 rounded-full text-xs"
            style={{ height: 22, background: "var(--panel)", color: "var(--ink-3)", border: "1px solid var(--line)" }}
          >
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--accent)" }} />
            {formatTime(duration)} total
          </span>
        )}
      </div>

      {/* Waveform + beat overlay */}
      <div className="flex-1 overflow-hidden relative" style={{ background: "var(--surface)", minHeight: 160 }}>
        {error && (
          <div className="absolute inset-0 flex items-center justify-center z-10">
            <div className="text-center">
              <p className="text-xs font-medium mb-1" style={{ color: "#d44" }}>Failed to load audio</p>
              <p className="text-xs" style={{ color: "var(--ink-4)" }}>Try re-uploading the song</p>
            </div>
          </div>
        )}
        {loading && !error && (
          <div className="absolute inset-0 flex items-center justify-center z-10">
            <div className="flex items-center gap-2 text-xs" style={{ color: "var(--ink-4)" }}>
              <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 12a9 9 0 1 1-6.219-8.56" />
              </svg>
              Loading waveform...
            </div>
          </div>
        )}

        {/* WaveSurfer container */}
        <div className="absolute inset-0 flex items-center px-4">
          <div
            ref={containerRef}
            style={{ width: "100%", height: 128 }}
          />
        </div>

        {/* Beat markers SVG overlay */}
        {analysis && duration > 0 && (
          <BeatOverlay
            beats={analysis.beats}
            downbeats={analysis.downbeats}
            duration={duration}
          />
        )}
      </div>
    </div>
  );
}

/* ─── Beat marker overlay ─────────────────────────────────── */
function BeatOverlay({
  beats,
  downbeats,
  duration,
}: {
  beats: number[];
  downbeats: number[];
  duration: number;
}) {
  return (
    <svg
      className="absolute inset-0 pointer-events-none"
      style={{ width: "100%", height: "100%", zIndex: 5 }}
      preserveAspectRatio="none"
    >
      {/* Regular beats — subtle ticks from top */}
      {beats.map((t, i) => {
        const x = `${(t / duration) * 100}%`;
        const isDownbeat = downbeats.includes(t);
        if (isDownbeat) return null; // rendered separately
        return (
          <line
            key={`beat-${i}`}
            x1={x}
            x2={x}
            y1="0"
            y2="20%"
            stroke="oklch(70% 0.08 210)"
            strokeWidth="0.5"
            opacity="0.4"
          />
        );
      })}
      {/* Downbeats — taller, numbered */}
      {downbeats.map((t, i) => {
        const xPct = (t / duration) * 100;
        return (
          <g key={`db-${i}`}>
            <line
              x1={`${xPct}%`}
              x2={`${xPct}%`}
              y1="0"
              y2="35%"
              stroke="oklch(55% 0.14 210)"
              strokeWidth="1"
              opacity="0.6"
            />
            <text
              x={`${xPct}%`}
              y="12"
              dx="3"
              fontSize="9"
              fontFamily="var(--font-mono)"
              fontWeight="600"
              fill="oklch(46% 0.18 210)"
              opacity="0.8"
            >
              {i + 1}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/** Check if an input/textarea is focused (don't capture space there) */
function isInputFocused(): boolean {
  const tag = document.activeElement?.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
}

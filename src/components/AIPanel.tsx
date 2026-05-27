"use client";

import { useState, useCallback, useRef } from "react";
import { useEditorStore } from "@/lib/store/editor-store";
import type { AIEvent } from "@/lib/ai/provider";
import type { EffectBlock } from "@/lib/timeline/types";
import { AI_STYLES, REFINE_PROMPTS } from "@/lib/ai/styles";

type Vibe = "classic" | "jazz" | "edm" | "cinematic" | "whimsical";
type Intensity = "subtle" | "balanced" | "wild";

interface AIPanelProps {
  open: boolean;
  onClose: () => void;
}

export default function AIPanel({ open, onClose }: AIPanelProps) {
  const audio = useEditorStore((s) => s.audio);
  const fixtures = useEditorStore((s) => s.fixtures);
  const sequence = useEditorStore((s) => s.sequence);
  const addBlock = useEditorStore((s) => s.addBlock);
  const deleteBlocks = useEditorStore((s) => s.deleteBlocks);

  const [vibe, setVibe] = useState<Vibe>("classic");
  const [intensity, setIntensity] = useState<Intensity>("balanced");
  const [styleId, setStyleId] = useState("classic");
  const [running, setRunning] = useState(false);
  const [events, setEvents] = useState<AIEvent[]>([]);
  const [generatedBlockIds, setGeneratedBlockIds] = useState<string[]>([]);
  const abortRef = useRef<AbortController | null>(null);

  const runGeneration = useCallback(
    async (refinementPrompt?: string) => {
      if (!audio) return;
      setRunning(true);
      setEvents([]);

      // If refining, keep existing generated block IDs; otherwise reset
      if (!refinementPrompt) {
        setGeneratedBlockIds([]);
      }

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const res = await fetch("/api/ai/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            audio,
            fixtures,
            vibe,
            intensity,
            style: styleId,
            refinementPrompt,
            existingBlocks: refinementPrompt ? sequence?.blocks : undefined,
          }),
          signal: controller.signal,
        });

        if (!res.ok || !res.body) {
          const errorText = await res.text().catch(() => "Unknown error");
          setEvents((prev) => [
            ...prev,
            {
              type: "error",
              message: `Failed to connect (${res.status}): ${errorText.slice(0, 200)}`,
            },
          ]);
          setRunning(false);
          return;
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        const blockIds: string[] = [];

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          const lines = buffer.split("\n\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const json = line.slice(6);
            try {
              const event: AIEvent = JSON.parse(json);
              setEvents((prev) => [...prev, event]);

              // Apply patches immediately
              if (event.type === "patch" && event.patch.addBlocks) {
                for (const block of event.patch.addBlocks) {
                  addBlock(block as EffectBlock);
                  blockIds.push(block.id);
                }
              }
            } catch (e) {
              console.warn("[ai] SSE parse error", e);
            }
          }
        }

        setGeneratedBlockIds((prev) =>
          refinementPrompt ? [...prev, ...blockIds] : blockIds
        );
      } catch (e) {
        if ((e as Error).name !== "AbortError") {
          setEvents((prev) => [
            ...prev,
            { type: "error", message: String(e) },
          ]);
        }
      }
      setRunning(false);
    },
    [audio, fixtures, sequence, vibe, intensity, styleId, addBlock]
  );

  const handleGenerate = useCallback(() => {
    runGeneration();
  }, [runGeneration]);

  const handleRefine = useCallback(
    (prompt: string) => {
      runGeneration(prompt);
    },
    [runGeneration]
  );

  const handleUndo = useCallback(() => {
    if (generatedBlockIds.length > 0) {
      deleteBlocks(generatedBlockIds);
      setGeneratedBlockIds([]);
      setEvents([]);
    }
  }, [generatedBlockIds, deleteBlocks]);

  const handleCancel = useCallback(() => {
    abortRef.current?.abort();
    setRunning(false);
  }, []);

  if (!open) return null;

  const lastProgress = [...events].reverse().find((e) => e.type === "progress");
  const thoughts = events.filter((e) => e.type === "thought");
  const doneEvent = events.find((e) => e.type === "done");
  const errorEvent = events.find((e) => e.type === "error");

  return (
    <div
      className="fixed top-0 right-0 bottom-0 z-40 flex flex-col"
      style={{
        width: 360,
        background: "var(--surface)",
        borderLeft: "1px solid var(--line)",
        boxShadow: "var(--shadow-lg)",
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 shrink-0"
        style={{ height: 52, borderBottom: "1px solid var(--line)" }}
      >
        <div className="flex items-center gap-2">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            style={{ color: "var(--accent)" }}
          >
            <path d="M12 3l1.912 5.813a2 2 0 0 0 1.275 1.275L21 12l-5.813 1.912a2 2 0 0 0-1.275 1.275L12 21l-1.912-5.813a2 2 0 0 0-1.275-1.275L3 12l5.813-1.912a2 2 0 0 0 1.275-1.275L12 3z" />
          </svg>
          <span className="text-sm font-semibold">AI Actions</span>
        </div>
        <button
          onClick={onClose}
          className="w-7 h-7 flex items-center justify-center rounded-md"
          style={{
            color: "var(--ink-3)",
            background: "none",
            border: "none",
            cursor: "pointer",
          }}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {!running && !doneEvent && (
          <>
            {/* Style preset selector */}
            <div className="mb-4">
              <label
                className="text-xs font-medium block mb-2"
                style={{ color: "var(--ink-3)" }}
              >
                Style Preset
              </label>
              <div className="flex flex-col gap-1.5">
                {AI_STYLES.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setStyleId(s.id)}
                    className="text-left px-3 py-2 rounded-md text-xs transition-colors"
                    style={{
                      background:
                        styleId === s.id
                          ? "var(--accent-50)"
                          : "var(--surface)",
                      border:
                        styleId === s.id
                          ? "1px solid var(--accent-200)"
                          : "1px solid var(--line)",
                      color:
                        styleId === s.id
                          ? "var(--accent-ink)"
                          : "var(--ink-2)",
                    }}
                  >
                    <span className="font-medium">{s.name}</span>
                    <span
                      className="block mt-0.5"
                      style={{
                        color:
                          styleId === s.id
                            ? "var(--accent-ink)"
                            : "var(--ink-4)",
                      }}
                    >
                      {s.desc}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Vibe */}
            <div className="mb-4">
              <label
                className="text-xs font-medium block mb-2"
                style={{ color: "var(--ink-3)" }}
              >
                Color Palette
              </label>
              <div className="flex flex-wrap gap-1.5">
                {(
                  [
                    "classic",
                    "jazz",
                    "edm",
                    "cinematic",
                    "whimsical",
                  ] as Vibe[]
                ).map((v) => (
                  <button
                    key={v}
                    onClick={() => setVibe(v)}
                    className="h-7 px-3 rounded-md text-xs font-medium capitalize"
                    style={{
                      background:
                        vibe === v ? "var(--accent-50)" : "var(--surface)",
                      border:
                        vibe === v
                          ? "1px solid var(--accent-200)"
                          : "1px solid var(--line)",
                      color:
                        vibe === v ? "var(--accent-ink)" : "var(--ink-2)",
                    }}
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>

            {/* Intensity */}
            <div className="mb-5">
              <label
                className="text-xs font-medium block mb-2"
                style={{ color: "var(--ink-3)" }}
              >
                Intensity
              </label>
              <div className="flex gap-1.5">
                {(["subtle", "balanced", "wild"] as Intensity[]).map((i) => (
                  <button
                    key={i}
                    onClick={() => setIntensity(i)}
                    className="h-7 px-3 rounded-md text-xs font-medium capitalize flex-1"
                    style={{
                      background:
                        intensity === i
                          ? "var(--accent-50)"
                          : "var(--surface)",
                      border:
                        intensity === i
                          ? "1px solid var(--accent-200)"
                          : "1px solid var(--line)",
                      color:
                        intensity === i
                          ? "var(--accent-ink)"
                          : "var(--ink-2)",
                    }}
                  >
                    {i}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={handleGenerate}
              disabled={!audio}
              className="w-full h-9 rounded-md text-sm font-medium flex items-center justify-center gap-2 transition-colors"
              style={{
                background: audio ? "var(--accent)" : "var(--panel)",
                color: audio ? "#fff" : "var(--ink-4)",
                border: audio
                  ? "1px solid var(--accent)"
                  : "1px solid var(--line)",
                cursor: audio ? "pointer" : "not-allowed",
              }}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M12 3l1.912 5.813a2 2 0 0 0 1.275 1.275L21 12l-5.813 1.912a2 2 0 0 0-1.275 1.275L12 21l-1.912-5.813a2 2 0 0 0-1.275-1.275L3 12l5.813-1.912a2 2 0 0 0 1.275-1.275L12 3z" />
              </svg>
              {audio ? "Generate from Music" : "Upload a song first"}
            </button>

            {!audio && (
              <p
                className="text-xs mt-3 text-center"
                style={{ color: "var(--ink-4)" }}
              >
                Upload a song in the Song section to enable AI generation.
              </p>
            )}
          </>
        )}

        {/* Running state */}
        {running && (
          <div className="flex flex-col gap-3">
            {lastProgress && "pct" in lastProgress && (
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span style={{ color: "var(--ink-2)" }}>
                    {"step" in lastProgress ? lastProgress.step : ""}
                  </span>
                  <span style={{ color: "var(--ink-4)" }}>
                    {lastProgress.pct}%
                  </span>
                </div>
                <div
                  className="h-1.5 rounded-full overflow-hidden"
                  style={{ background: "var(--panel)" }}
                >
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{
                      width: `${lastProgress.pct}%`,
                      background: "var(--accent)",
                    }}
                  />
                </div>
              </div>
            )}

            {thoughts.map((t, i) => (
              <div
                key={i}
                className="text-xs p-2.5 rounded-md"
                style={{
                  background: "var(--panel)",
                  color: "var(--ink-2)",
                }}
              >
                {"text" in t ? t.text : ""}
              </div>
            ))}

            <button
              onClick={handleCancel}
              className="w-full h-8 rounded-md text-xs font-medium"
              style={{
                border: "1px solid var(--line)",
                background: "var(--surface)",
                color: "var(--ink-3)",
              }}
            >
              Cancel
            </button>
          </div>
        )}

        {/* Done state */}
        {doneEvent && (
          <div className="flex flex-col gap-3">
            <div
              className="flex items-center gap-2 text-xs p-3 rounded-md"
              style={{
                background: "var(--accent-50)",
                border: "1px solid var(--accent-200)",
                color: "var(--accent-ink)",
              }}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
              {"summary" in doneEvent ? doneEvent.summary : "Done"}
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleUndo}
                className="flex-1 h-8 rounded-md text-xs font-medium"
                style={{
                  border: "1px solid var(--line)",
                  background: "var(--surface)",
                  color: "var(--ink)",
                }}
              >
                Undo
              </button>
              <button
                onClick={() => {
                  setEvents([]);
                  setGeneratedBlockIds([]);
                }}
                className="flex-1 h-8 rounded-md text-xs font-medium"
                style={{
                  background: "var(--accent)",
                  color: "#fff",
                  border: "1px solid var(--accent)",
                }}
              >
                Keep
              </button>
            </div>

            {/* Refine section */}
            <div
              className="mt-2 pt-3"
              style={{ borderTop: "1px solid var(--line)" }}
            >
              <label
                className="text-xs font-medium block mb-2"
                style={{ color: "var(--ink-3)" }}
              >
                Refine
              </label>
              <div className="flex flex-col gap-1.5">
                {REFINE_PROMPTS.map((r) => (
                  <button
                    key={r.label}
                    onClick={() => handleRefine(r.prompt)}
                    className="text-left px-3 py-2 rounded-md text-xs transition-colors"
                    style={{
                      background: "var(--surface)",
                      border: "1px solid var(--line)",
                      color: "var(--ink-2)",
                      cursor: "pointer",
                    }}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Error state */}
        {errorEvent && !doneEvent && (
          <div className="flex flex-col gap-3">
            <div
              className="text-xs p-3 rounded-md"
              style={{
                background: "#fee2e2",
                border: "1px solid #fca5a5",
                color: "#b91c1c",
              }}
            >
              {"message" in errorEvent
                ? errorEvent.message
                : "An error occurred"}
            </div>
            <button
              onClick={() => {
                setEvents([]);
              }}
              className="w-full h-8 rounded-md text-xs font-medium"
              style={{
                border: "1px solid var(--line)",
                background: "var(--surface)",
                color: "var(--ink-3)",
              }}
            >
              Try Again
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

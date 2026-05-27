"use client";

import type { AIEvent } from "@/lib/ai/provider";
import { REFINE_PROMPTS } from "@/lib/ai/styles";

interface AIGenerationStreamProps {
  events: AIEvent[];
  running: boolean;
  onCancel: () => void;
  onUndo: () => void;
  onKeep: () => void;
  onRefine: (prompt: string) => void;
  onClearError: () => void;
}

export default function AIGenerationStream({
  events,
  running,
  onCancel,
  onUndo,
  onKeep,
  onRefine,
  onClearError,
}: AIGenerationStreamProps) {
  const lastProgress = [...events].reverse().find((e) => e.type === "progress");
  const thoughts = events.filter((e) => e.type === "thought");
  const doneEvent = events.find((e) => e.type === "done");
  const errorEvent = events.find((e) => e.type === "error");

  return (
    <>
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
            onClick={onCancel}
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
              onClick={onUndo}
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
              onClick={onKeep}
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
                  onClick={() => onRefine(r.prompt)}
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
            onClick={onClearError}
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
    </>
  );
}

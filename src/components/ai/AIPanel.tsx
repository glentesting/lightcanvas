"use client";

import { useState } from "react";
import { useAIGeneration, type Vibe, type Intensity } from "./useAIGeneration";
import AIStyleSelector from "./AIStyleSelector";
import AIVibeSelector from "./AIVibeSelector";
import AIIntensitySlider from "./AIIntensitySlider";
import AIGenerationStream from "./AIGenerationStream";

interface AIPanelProps {
  open: boolean;
  onClose: () => void;
}

export default function AIPanel({ open, onClose }: AIPanelProps) {
  const [vibe, setVibe] = useState<Vibe>("classic");
  const [intensity, setIntensity] = useState<Intensity>("balanced");
  const [styleId, setStyleId] = useState("classic");

  const {
    audio,
    running,
    events,
    handleGenerate,
    handleRefine,
    handleUndo,
    handleCancel,
    handleKeep,
    handleClearError,
  } = useAIGeneration({ vibe, intensity, styleId });

  if (!open) return null;

  const doneEvent = events.find((e) => e.type === "done");
  const showSetup = !running && !doneEvent;

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
        {showSetup && (
          <>
            <AIStyleSelector styleId={styleId} setStyleId={setStyleId} />
            <AIVibeSelector vibe={vibe} setVibe={setVibe} />
            <AIIntensitySlider intensity={intensity} setIntensity={setIntensity} />

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

        <AIGenerationStream
          events={events}
          running={running}
          onCancel={handleCancel}
          onUndo={handleUndo}
          onKeep={handleKeep}
          onRefine={handleRefine}
          onClearError={handleClearError}
        />
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { useEditorStore } from "@/lib/store/editor-store";
import { EFFECT_COLORS, EFFECT_NAMES } from "@/lib/timeline/constants";
import { addUserPreset } from "@/components/PresetLibrary";
import { BUILTIN_PRESETS } from "@/lib/presets/builtins";
import type { EffectPreset } from "@/lib/presets/types";

export function TimelineParameterPanel() {
  const selectedBlockIds = useEditorStore((s) => s.selectedBlockIds);
  const blocks = useEditorStore((s) => s.sequence.blocks);
  const updateBlock = useEditorStore((s) => s.updateBlock);
  const [showSavePreset, setShowSavePreset] = useState(false);
  const [presetName, setPresetName] = useState("");

  const selectedBlock = blocks.find((b) => b.id === selectedBlockIds[0]);

  if (!selectedBlock || selectedBlockIds.length !== 1) return null;

  const params = selectedBlock.params;

  // Check if block was created from a preset and has been modified
  const isModifiedFromPreset = (() => {
    if (!selectedBlock.presetId) return false;
    const allPresets = [...BUILTIN_PRESETS];
    // Also check localStorage presets
    try {
      const raw = typeof window !== "undefined" ? localStorage.getItem("lightcanvas-user-presets") : null;
      if (raw) allPresets.push(...JSON.parse(raw));
    } catch { /* ignore */ }
    const original = allPresets.find((p: EffectPreset) => p.id === selectedBlock.presetId);
    if (!original) return true; // preset deleted, still show indicator
    // Compare params
    const origParams = original.parameters as Record<string, unknown>;
    for (const key of Object.keys(origParams)) {
      if ((params as unknown as Record<string, unknown>)[key] !== origParams[key]) return true;
    }
    return false;
  })();

  const handleSavePreset = () => {
    if (!presetName.trim()) return;
    const preset: EffectPreset = {
      id: `user-preset-${crypto.randomUUID()}`,
      name: presetName.trim(),
      effectType: selectedBlock.effectId,
      parameters: { ...params },
      version: 1,
      compatibleFixtureTypes: ["roofline", "mega-tree", "mini-tree", "bush", "arch", "window-outline"],
      tags: [],
      createdAt: new Date().toISOString(),
      isSystem: false,
    };
    addUserPreset(preset);
    setPresetName("");
    setShowSavePreset(false);
  };

  return (
    <div
      className="shrink-0 px-4 py-3 flex flex-col gap-2"
      style={{
        borderTop: "1px solid var(--line)",
        background: "var(--surface)",
        minHeight: 48,
      }}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium" style={{ color: "var(--ink-3)" }}>Color</label>
          <input
            type="color"
            value={params.color1}
            onChange={(e) =>
              updateBlock(selectedBlock.id, {
                params: { ...params, color1: e.target.value },
              })
            }
            className="w-7 h-7 rounded border-none cursor-pointer"
            style={{ background: "none" }}
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium" style={{ color: "var(--ink-3)" }}>Intensity</label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={params.intensity}
            onChange={(e) =>
              updateBlock(selectedBlock.id, {
                params: { ...params, intensity: parseFloat(e.target.value) },
              })
            }
            className="w-20"
          />
          <span className="text-xs font-mono w-8" style={{ color: "var(--ink-4)" }}>
            {Math.round(params.intensity * 100)}%
          </span>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium" style={{ color: "var(--ink-3)" }}>Speed</label>
          <input
            type="range"
            min="0.25"
            max="4"
            step="0.25"
            value={params.speed}
            onChange={(e) =>
              updateBlock(selectedBlock.id, {
                params: { ...params, speed: parseFloat(e.target.value) },
              })
            }
            className="w-20"
          />
          <span className="text-xs font-mono w-8" style={{ color: "var(--ink-4)" }}>
            {params.speed}x
          </span>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium" style={{ color: "var(--ink-3)" }}>Easing</label>
          <select
            value={params.easing}
            onChange={(e) =>
              updateBlock(selectedBlock.id, {
                params: { ...params, easing: e.target.value as typeof params.easing },
              })
            }
            className="h-6 px-2 rounded text-xs"
            style={{ border: "1px solid var(--line)", background: "var(--surface)" }}
          >
            <option value="linear">Linear</option>
            <option value="ease-in">Ease In</option>
            <option value="ease-out">Ease Out</option>
            <option value="ease-in-out">Ease In-Out</option>
          </select>
        </div>
        <span
          className="text-xs px-2 py-0.5 rounded"
          style={{ background: EFFECT_COLORS[selectedBlock.effectId], color: "#fff" }}
        >
          {EFFECT_NAMES[selectedBlock.effectId]}
        </span>
        <div className="flex-1" />
        <button
          onClick={() => { setShowSavePreset(!showSavePreset); setPresetName(selectedBlock.presetName ? `${selectedBlock.presetName} (copy)` : EFFECT_NAMES[selectedBlock.effectId]); }}
          className="inline-flex items-center gap-1 h-6 px-2 rounded text-xs font-medium transition-colors"
          style={{ background: "var(--panel)", border: "1px solid var(--line)", color: "var(--ink-2)" }}
          title="Save as Preset"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
            <polyline points="17 21 17 13 7 13 7 21" />
            <polyline points="7 3 7 8 15 8" />
          </svg>
          Save Preset
        </button>
      </div>

      {/* Modified from preset indicator */}
      {selectedBlock.presetName && (
        <div className="flex items-center gap-1.5">
          <span className="text-xs" style={{ color: "var(--ink-4)" }}>
            {isModifiedFromPreset ? "Modified from:" : "From preset:"}
          </span>
          <span className="text-xs font-medium" style={{ color: "var(--ink-3)" }}>
            {selectedBlock.presetName}
          </span>
          {isModifiedFromPreset && (
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--accent)" }} title="Parameters changed from original preset" />
          )}
        </div>
      )}

      {/* Save as Preset inline form */}
      {showSavePreset && (
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Preset name"
            value={presetName}
            onChange={(e) => setPresetName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleSavePreset(); if (e.key === "Escape") setShowSavePreset(false); }}
            className="h-7 px-2 rounded text-xs flex-1"
            style={{ border: "1px solid var(--line)", background: "var(--panel)", maxWidth: 200 }}
            autoFocus
          />
          <button
            onClick={handleSavePreset}
            disabled={!presetName.trim()}
            className="h-7 px-3 rounded text-xs font-medium transition-colors disabled:opacity-40"
            style={{ background: "var(--accent)", color: "#fff" }}
          >
            Save
          </button>
          <button
            onClick={() => setShowSavePreset(false)}
            className="h-7 px-2 rounded text-xs font-medium transition-colors"
            style={{ background: "var(--surface)", border: "1px solid var(--line)", color: "var(--ink-3)" }}
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}

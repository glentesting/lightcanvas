"use client";

import { useState, useEffect, useCallback } from "react";
import { BUILTIN_PRESETS } from "@/lib/presets/builtins";
import type { EffectPreset } from "@/lib/presets/types";
import type { EffectId, EffectParams } from "@/lib/timeline/types";
import { useEditorStore } from "@/lib/store/editor-store";
import { useSelectionStore } from "@/lib/store/selection-store";
import { EFFECT_COLORS, EFFECT_NAMES } from "@/lib/timeline/constants";

const USER_PRESETS_KEY = "lightcanvas-user-presets";
const TAGS = ["All", "Color", "Motion", "Texture", "Holiday"] as const;

function loadUserPresets(): EffectPreset[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(USER_PRESETS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveUserPresets(presets: EffectPreset[]) {
  localStorage.setItem(USER_PRESETS_KEY, JSON.stringify(presets));
}

export function getUserPresets(): EffectPreset[] {
  return loadUserPresets();
}

export function addUserPreset(preset: EffectPreset) {
  const existing = loadUserPresets();
  existing.push(preset);
  saveUserPresets(existing);
  window.dispatchEvent(new Event("lightcanvas-presets-changed"));
}

export function deleteUserPreset(id: string) {
  const existing = loadUserPresets().filter((p) => p.id !== id);
  saveUserPresets(existing);
  window.dispatchEvent(new Event("lightcanvas-presets-changed"));
}

export default function PresetLibrary() {
  const [activeTag, setActiveTag] = useState<string>("All");
  const [userPresets, setUserPresets] = useState<EffectPreset[]>([]);

  const selectedBlockIds = useSelectionStore((s) => s.selectedBlockIds);
  const blocks = useEditorStore((s) => s.sequence.blocks);
  const updateBlock = useEditorStore((s) => s.updateBlock);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setUserPresets(loadUserPresets());
    const handler = () => setUserPresets(loadUserPresets());
    window.addEventListener("lightcanvas-presets-changed", handler);
    return () => window.removeEventListener("lightcanvas-presets-changed", handler);
  }, []);

  const allPresets = [...BUILTIN_PRESETS, ...userPresets];
  const filtered =
    activeTag === "All"
      ? allPresets
      : allPresets.filter((p) => p.tags.includes(activeTag.toLowerCase()));

  const systemPresets = filtered.filter((p) => p.isSystem);
  const customPresets = filtered.filter((p) => !p.isSystem);

  const handleApply = useCallback(
    (preset: EffectPreset) => {
      if (selectedBlockIds.length !== 1) return;
      const block = blocks.find((b) => b.id === selectedBlockIds[0]);
      if (!block) return;
      updateBlock(block.id, {
        effectId: preset.effectType as EffectId,
        params: { ...block.params, ...preset.parameters } as EffectParams,
        presetId: preset.id,
        presetName: preset.name,
      });
    },
    [selectedBlockIds, blocks, updateBlock]
  );

  const handleDelete = useCallback((id: string) => {
    deleteUserPreset(id);
  }, []);

  return (
    <div className="flex flex-col gap-2">
      {/* Tag filter pills */}
      <div className="flex flex-wrap gap-1">
        {TAGS.map((tag) => (
          <button
            key={tag}
            onClick={() => setActiveTag(tag)}
            className="px-2 py-0.5 rounded-full text-xs font-medium transition-colors"
            style={{
              background: activeTag === tag ? "var(--accent)" : "var(--panel)",
              color: activeTag === tag ? "#fff" : "var(--ink-3)",
              border: `1px solid ${activeTag === tag ? "var(--accent)" : "var(--line)"}`,
            }}
          >
            {tag}
          </button>
        ))}
      </div>

      {/* Hint */}
      {selectedBlockIds.length !== 1 && (
        <p className="text-xs" style={{ color: "var(--ink-4)" }}>
          Select a block to apply a preset
        </p>
      )}

      {/* System presets */}
      {systemPresets.map((preset) => (
        <PresetCard
          key={preset.id}
          preset={preset}
          canApply={selectedBlockIds.length === 1}
          onApply={() => handleApply(preset)}
        />
      ))}

      {/* User presets */}
      {customPresets.length > 0 && (
        <>
          <div
            className="text-xs font-semibold uppercase mt-1"
            style={{ color: "var(--ink-4)", letterSpacing: "0.06em", fontSize: 10 }}
          >
            My Presets
          </div>
          {customPresets.map((preset) => (
            <PresetCard
              key={preset.id}
              preset={preset}
              canApply={selectedBlockIds.length === 1}
              onApply={() => handleApply(preset)}
              onDelete={() => handleDelete(preset.id)}
            />
          ))}
        </>
      )}

      {filtered.length === 0 && (
        <p className="text-xs py-2 text-center" style={{ color: "var(--ink-4)" }}>
          No presets match this filter
        </p>
      )}
    </div>
  );
}

/* ─── Preset Card ──────────────────────────────────────── */
function PresetCard({
  preset,
  canApply,
  onApply,
  onDelete,
}: {
  preset: EffectPreset;
  canApply: boolean;
  onApply: () => void;
  onDelete?: () => void;
}) {
  const effectColor = EFFECT_COLORS[preset.effectType as EffectId] ?? "var(--ink-4)";
  const effectName = EFFECT_NAMES[preset.effectType as EffectId] ?? preset.effectType;

  return (
    <div
      className="flex flex-col gap-1 p-2 rounded-md transition-colors group/preset"
      style={{
        background: "var(--panel)",
        border: "1px solid var(--line)",
        cursor: canApply ? "pointer" : "default",
        opacity: canApply ? 1 : 0.7,
      }}
      onClick={canApply ? onApply : undefined}
    >
      <div className="flex items-center gap-1.5">
        {preset.isSystem && (
          <svg
            width="10"
            height="10"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            style={{ color: "var(--ink-4)", flexShrink: 0 }}
          >
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        )}
        <span className="text-xs font-semibold truncate flex-1" style={{ color: "var(--ink)" }}>
          {preset.name}
        </span>
        {onDelete && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="opacity-0 group-hover/preset:opacity-100 transition-opacity shrink-0"
            style={{ color: "var(--ink-4)" }}
            title="Delete preset"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        )}
      </div>
      <div className="flex items-center gap-1.5">
        <span
          className="text-xs px-1.5 py-0.5 rounded"
          style={{ background: effectColor, color: "#fff", fontSize: 10 }}
        >
          {effectName}
        </span>
        <div className="flex items-center gap-0.5">
          {preset.compatibleFixtureTypes.slice(0, 3).map((kind) => (
            <span
              key={kind}
              className="rounded flex items-center justify-center"
              style={{ width: 16, height: 16, background: "var(--surface)", border: "1px solid var(--line)" }}
              title={kind}
            >
              <FixtureKindMiniIcon kind={kind} />
            </span>
          ))}
          {preset.compatibleFixtureTypes.length > 3 && (
            <span className="text-xs" style={{ color: "var(--ink-4)", fontSize: 9 }}>
              +{preset.compatibleFixtureTypes.length - 3}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Tiny fixture icon for preset cards ──────────────── */
function FixtureKindMiniIcon({ kind }: { kind: string }) {
  return (
    <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--ink-4)" }}>
      {kind === "roofline" && <line x1="2" y1="12" x2="22" y2="12" />}
      {kind === "window-outline" && <rect x="4" y="6" width="16" height="12" rx="1" />}
      {kind === "mega-tree" && <><polygon points="12,2 3,18 21,18" /><line x1="12" y1="18" x2="12" y2="22" /></>}
      {kind === "mini-tree" && <><polygon points="12,4 5,17 19,17" /><line x1="12" y1="17" x2="12" y2="21" /></>}
      {kind === "arch" && <path d="M4 20 Q12 2 20 20" />}
      {kind === "bush" && <ellipse cx="12" cy="13" rx="9" ry="6" />}
    </svg>
  );
}

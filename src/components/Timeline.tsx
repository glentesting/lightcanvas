"use client";

import { useRef, useCallback, useState, useEffect, useMemo } from "react";
import {
  DndContext,
  DragOverlay,
  useDraggable,
  useDroppable,
  type DragEndEvent,
  type DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { useEditorStore } from "@/lib/store/editor-store";
import { useTransportStore } from "@/lib/store/transport-store";
import { EFFECT_COLORS, EFFECT_NAMES, DEFAULT_EFFECT_PARAMS } from "@/lib/timeline/constants";
import { secondsToPx, pxToSeconds, snapToBeat } from "@/lib/timeline/snapping";
import type { EffectId, EffectBlock } from "@/lib/timeline/types";
import type { AudioAnalysis } from "@/lib/audio/types";
import { addUserPreset } from "@/components/PresetLibrary";
import { BUILTIN_PRESETS } from "@/lib/presets/builtins";
import type { EffectPreset } from "@/lib/presets/types";

interface TimelineProps {
  analysis: AudioAnalysis | null;
}

const ROW_HEIGHT = 42;
const LABEL_WIDTH = 160;
const DEFAULT_BLOCK_DURATION = 2;
const HANDLE_WIDTH = 6;

export default function Timeline({ analysis }: TimelineProps) {
  const tracks = useEditorStore((s) => s.sequence.tracks);
  const blocks = useEditorStore((s) => s.sequence.blocks);
  const fixtures = useEditorStore((s) => s.fixtures);
  const groups = useEditorStore((s) => s.groups);
  const selectedBlockIds = useEditorStore((s) => s.selectedBlockIds);
  const clearSelection = useEditorStore((s) => s.clearSelection);

  const zoom = useTransportStore((s) => s.zoom);

  const duration = analysis?.duration ?? 180;
  const totalWidth = secondsToPx(duration, zoom);

  const deleteBlocks = useEditorStore((s) => s.deleteBlocks);
  const duplicateBlocks = useEditorStore((s) => s.duplicateBlocks);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);

  return (
    <div
      className="flex-1 flex flex-col min-h-0"
      style={{ background: "var(--bg)" }}
      onMouseDown={(e) => {
        const target = e.target as HTMLElement;
        if (!target.closest("[data-block]")) {
          clearSelection();
        }
        setContextMenu(null);
      }}
      onContextMenu={(e) => {
        // Show context menu on right-click if blocks are selected
        const target = e.target as HTMLElement;
        if (target.closest("[data-block]")) {
          e.preventDefault();
          setContextMenu({ x: e.clientX, y: e.clientY });
        }
      }}
    >
      {/* Selection toolbar */}
      {selectedBlockIds.length > 0 && (
        <div
          className="flex items-center gap-2 px-3.5 shrink-0"
          style={{ height: 32, background: "var(--accent-50)", borderBottom: "1px solid var(--accent-200)" }}
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
        >
          <span className="text-xs font-medium" style={{ color: "var(--accent-ink)" }}>
            {selectedBlockIds.length} selected
          </span>
          <div className="flex-1" />
          <button
            onClick={() => duplicateBlocks(selectedBlockIds)}
            className="inline-flex items-center gap-1 h-6 px-2 rounded text-xs font-medium transition-colors"
            style={{ background: "var(--surface)", border: "1px solid var(--line)", color: "var(--ink-2)" }}
            title="Duplicate (Ctrl+D)"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
            </svg>
            Duplicate
          </button>
          <button
            onClick={() => deleteBlocks(selectedBlockIds)}
            className="inline-flex items-center gap-1 h-6 px-2 rounded text-xs font-medium transition-colors"
            style={{ background: "#fee2e2", border: "1px solid #fca5a5", color: "#b91c1c" }}
            title="Delete (Del)"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            </svg>
            Delete
          </button>
        </div>
      )}

      <div className="flex-1 overflow-auto">
        <div style={{ minWidth: LABEL_WIDTH + totalWidth + 40, position: "relative" }}>
          {/* Header row */}
          <div className="flex sticky top-0 z-10" style={{ background: "var(--surface)", borderBottom: "1px solid var(--line)" }}>
            <div
              className="shrink-0 flex items-center px-3 sticky left-0 z-20"
              style={{
                width: LABEL_WIDTH,
                height: 32,
                background: "var(--surface)",
                borderRight: "1px solid var(--line)",
                fontSize: 11,
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.04em",
                color: "var(--ink-3)",
              }}
            >
              Tracks
            </div>
            <div className="relative" style={{ width: totalWidth, height: 32 }}>
              {Array.from({ length: Math.ceil(duration / 4) + 1 }).map((_, i) => {
                const t = i * 4;
                const x = secondsToPx(t, zoom);
                return (
                  <div key={i} className="absolute top-0 bottom-0" style={{ left: x, borderLeft: "1px solid var(--line)" }}>
                    <span className="absolute text-xs font-mono" style={{ top: 4, left: 4, color: "var(--ink-4)", fontSize: 10 }}>
                      {Math.floor(t / 60)}:{String(Math.floor(t % 60)).padStart(2, "0")}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Track rows */}
          {tracks.length === 0 ? (
            <div className="flex items-center justify-center py-12" style={{ color: "var(--ink-4)", fontSize: 12 }}>
              No tracks — add fixtures to create tracks
            </div>
          ) : (
            tracks.map((track, trackIndex) => {
              const trackBlocks = blocks.filter((b) => b.trackId === track.id);
              if (track.kind === "group") {
                const group = groups.find((g) => g.id === track.id);
                if (!group) return null;
                return (
                  <TrackRow
                    key={track.id}
                    trackId={track.id}
                    trackIndex={trackIndex}
                    name={`\u2B21 ${group.name}`}
                    pixelCount={undefined}
                    blocks={trackBlocks}
                    selectedBlockIds={selectedBlockIds}
                    zoom={zoom}
                    totalWidth={totalWidth}
                    analysis={analysis}
                    isGroup
                    groupColor={group.color}
                  />
                );
              }
              const fixture = fixtures.find((f) => f.id === track.id);
              return (
                <TrackRow
                  key={track.id}
                  trackId={track.id}
                  trackIndex={trackIndex}
                  name={fixture?.name ?? track.id}
                  pixelCount={fixture?.pixelCount}
                  blocks={trackBlocks}
                  selectedBlockIds={selectedBlockIds}
                  zoom={zoom}
                  totalWidth={totalWidth}
                  analysis={analysis}
                />
              );
            })
          )}
        </div>
      </div>

      {/* Parameter panel */}
      <ParameterPanel />

      {/* Context menu */}
      {contextMenu && (
        <TimelineContextMenu x={contextMenu.x} y={contextMenu.y} onClose={() => setContextMenu(null)} />
      )}
    </div>
  );
}

/* ─── Track Row ──────────────────────────────────────────── */
function TrackRow({
  trackId,
  trackIndex,
  name,
  pixelCount,
  blocks,
  selectedBlockIds,
  zoom,
  totalWidth,
  analysis,
  isGroup,
  groupColor,
}: {
  trackId: string;
  trackIndex: number;
  name: string;
  pixelCount?: number;
  blocks: EffectBlock[];
  selectedBlockIds: string[];
  zoom: number;
  totalWidth: number;
  analysis: AudioAnalysis | null;
  isGroup?: boolean;
  groupColor?: string;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `track:${trackId}`,
    data: { type: "track", trackId },
  });

  const rowHeight = isGroup ? ROW_HEIGHT + 4 : ROW_HEIGHT;

  return (
    <div
      className="flex"
      style={{
        borderBottom: "1px solid var(--line)",
        background: isOver
          ? "var(--accent-50)"
          : trackIndex % 2 === 0
          ? "var(--surface)"
          : "var(--panel)",
      }}
    >
      <div
        className="shrink-0 flex items-center px-3 sticky left-0 z-10"
        style={{
          width: LABEL_WIDTH,
          height: rowHeight,
          borderRight: "1px solid var(--line)",
          borderLeft: isGroup ? `3px solid ${groupColor ?? "#6366f1"}` : undefined,
          background: "inherit",
        }}
      >
        <div className="flex-1 min-w-0">
          <div className="text-xs font-semibold truncate" style={isGroup ? { color: groupColor ?? "#6366f1" } : undefined}>{name}</div>
          {pixelCount != null && (
            <div className="text-xs" style={{ color: "var(--ink-4)", fontSize: 10 }}>
              {pixelCount} px
            </div>
          )}
          {isGroup && (
            <div className="text-xs" style={{ color: "var(--ink-4)", fontSize: 10 }}>
              Group
            </div>
          )}
        </div>
      </div>

      <div
        ref={setNodeRef}
        className="relative"
        style={{ width: totalWidth, height: rowHeight, flexShrink: 0 }}
      >
        {blocks.map((block) => (
          <EffectBlockComponent
            key={block.id}
            block={block}
            selected={selectedBlockIds.includes(block.id)}
            zoom={zoom}
            analysis={analysis}
          />
        ))}
      </div>
    </div>
  );
}

/* ─── Effect Block with drag + resize ────────────────────── */
function EffectBlockComponent({
  block,
  selected,
  zoom,
  analysis,
}: {
  block: EffectBlock;
  selected: boolean;
  zoom: number;
  analysis: AudioAnalysis | null;
}) {
  const setSelection = useEditorStore((s) => s.setSelection);
  const moveBlocks = useEditorStore((s) => s.moveBlocks);
  const resizeBlock = useEditorStore((s) => s.resizeBlock);
  const selectedBlockIds = useEditorStore((s) => s.selectedBlockIds);

  const beats = useMemo(() => analysis?.beats ?? [], [analysis?.beats]);
  const [dragging, setDragging] = useState<"move" | "resize-left" | "resize-right" | null>(null);
  const dragStartRef = useRef<{ x: number; blockStart: number; blockDuration: number } | null>(null);

  const left = secondsToPx(block.start, zoom);
  const width = secondsToPx(block.duration, zoom);
  const color = EFFECT_COLORS[block.effectId];

  const handleMouseDown = (e: React.MouseEvent, action: "move" | "resize-left" | "resize-right") => {
    e.stopPropagation();
    e.preventDefault();

    // Select on mousedown
    if (action === "move") {
      if (e.shiftKey || e.metaKey) {
        setSelection([block.id], "toggle");
      } else if (!selected) {
        setSelection([block.id]);
      }
    }

    setDragging(action);
    dragStartRef.current = {
      x: e.clientX,
      blockStart: block.start,
      blockDuration: block.duration,
    };
  };

  useEffect(() => {
    if (!dragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!dragStartRef.current) return;
      const deltaX = e.clientX - dragStartRef.current.x;
      const deltaSeconds = pxToSeconds(deltaX, zoom);

      if (dragging === "move") {
        const ids = selected ? selectedBlockIds : [block.id];
        const newStart = Math.max(0, dragStartRef.current.blockStart + deltaSeconds);
        const snapped = e.altKey ? newStart : snapToBeat(newStart, beats);
        const actualDelta = snapped - block.start;
        if (Math.abs(actualDelta) > 0.001) {
          moveBlocks(ids, actualDelta, 0);
          dragStartRef.current.x = e.clientX;
          dragStartRef.current.blockStart = snapped;
        }
      } else if (dragging === "resize-left") {
        let newStart = dragStartRef.current.blockStart + deltaSeconds;
        newStart = e.altKey ? newStart : snapToBeat(newStart, beats);
        resizeBlock(block.id, "start", newStart);
      } else if (dragging === "resize-right") {
        let newEnd = dragStartRef.current.blockStart + dragStartRef.current.blockDuration + deltaSeconds;
        newEnd = e.altKey ? newEnd : snapToBeat(newEnd, beats);
        resizeBlock(block.id, "end", newEnd);
      }
    };

    const handleMouseUp = () => {
      setDragging(null);
      dragStartRef.current = null;
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [dragging, block, selected, selectedBlockIds, zoom, beats, moveBlocks, resizeBlock]);

  return (
    <div
      className="absolute flex items-center overflow-hidden group"
      style={{
        left: left + 1,
        top: 4,
        height: ROW_HEIGHT - 8,
        width: Math.max(width - 2, 16),
        borderRadius: 5,
        fontSize: 11,
        fontWeight: 600,
        color: "#fff",
        background: color,
        cursor: dragging === "move" ? "grabbing" : "grab",
        boxShadow: selected
          ? "0 0 0 2px var(--accent), 0 1px 3px rgba(20,22,28,.15)"
          : "0 1px 2px rgba(20,22,28,.12)",
        userSelect: "none",
      }}
      data-block={block.id}
      onMouseDown={(e) => handleMouseDown(e, "move")}
      onClick={(e) => e.stopPropagation()}
      onContextMenu={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!selected) setSelection([block.id]);
      }}
    >
      {/* Left resize handle */}
      <div
        className="absolute left-0 top-0 bottom-0 opacity-0 group-hover:opacity-100 transition-opacity"
        style={{ width: HANDLE_WIDTH, cursor: "ew-resize", background: "rgba(255,255,255,0.3)", borderRadius: "5px 0 0 5px" }}
        onMouseDown={(e) => handleMouseDown(e, "resize-left")}
      />

      {/* Label */}
      <span className="truncate px-1.5 pointer-events-none">
        {EFFECT_NAMES[block.effectId]}
      </span>

      {/* Right resize handle */}
      <div
        className="absolute right-0 top-0 bottom-0 opacity-0 group-hover:opacity-100 transition-opacity"
        style={{ width: HANDLE_WIDTH, cursor: "ew-resize", background: "rgba(255,255,255,0.3)", borderRadius: "0 5px 5px 0" }}
        onMouseDown={(e) => handleMouseDown(e, "resize-right")}
      />
    </div>
  );
}

/* ─── Keyboard shortcuts hook ─────────────────────────────── */
export function useTimelineShortcuts() {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const tag = document.activeElement?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

      const state = useEditorStore.getState();
      const { selectedBlockIds } = state;

      // Delete / Backspace — delete selected blocks
      if ((e.key === "Delete" || e.key === "Backspace") && selectedBlockIds.length > 0) {
        e.preventDefault();
        state.deleteBlocks(selectedBlockIds);
      }

      // Cmd+D — duplicate
      if ((e.metaKey || e.ctrlKey) && e.key === "d" && selectedBlockIds.length > 0) {
        e.preventDefault();
        state.duplicateBlocks(selectedBlockIds);
      }

      // Cmd+A — select all
      if ((e.metaKey || e.ctrlKey) && e.key === "a") {
        e.preventDefault();
        state.setSelection(state.sequence.blocks.map((b) => b.id));
      }

      // Escape — clear selection
      if (e.key === "Escape") {
        state.clearSelection();
      }

      // Cmd+Z — undo
      if ((e.metaKey || e.ctrlKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        useEditorStore.temporal.getState().undo();
      }

      // Cmd+Shift+Z or Cmd+Y — redo
      if (((e.metaKey || e.ctrlKey) && e.key === "z" && e.shiftKey) || ((e.metaKey || e.ctrlKey) && e.key === "y")) {
        e.preventDefault();
        useEditorStore.temporal.getState().redo();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);
}

/* ─── DnD wrapper — wraps the entire editor body ──────────── */
export function TimelineDndProvider({ children }: { children: React.ReactNode }) {
  const addBlock = useEditorStore((s) => s.addBlock);
  const setSelection = useEditorStore((s) => s.setSelection);
  const zoom = useTransportStore((s) => s.zoom);
  const analysis = useEditorStore((s) => s.audio);

  const [draggingEffect, setDraggingEffect] = useState<EffectId | null>(null);
  const beats = useMemo(() => analysis?.beats ?? [], [analysis?.beats]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const data = event.active.data.current;
    if (data?.type === "palette-effect") {
      setDraggingEffect(data.effectId as EffectId);
    }
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setDraggingEffect(null);
      const { over, active } = event;
      if (!over || !active.data.current) return;

      const activeData = active.data.current;
      const overData = over.data.current;

      if (activeData.type === "palette-effect" && overData?.type === "track") {
        const trackId = overData.trackId as string;
        const effectId = activeData.effectId as EffectId;

        const deltaX = event.delta.x;
        let dropTime = pxToSeconds(Math.max(0, deltaX), zoom);
        dropTime = snapToBeat(dropTime, beats);
        dropTime = Math.max(0, dropTime);

        const newBlock: EffectBlock = {
          id: crypto.randomUUID(),
          trackId,
          effectId,
          start: dropTime,
          duration: DEFAULT_BLOCK_DURATION,
          params: { ...DEFAULT_EFFECT_PARAMS },
        };

        addBlock(newBlock);
        setSelection([newBlock.id]);
      }
    },
    [zoom, beats, addBlock, setSelection]
  );

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      {children}
      <DragOverlay>
        {draggingEffect && (
          <div
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold shadow-lg"
            style={{
              background: EFFECT_COLORS[draggingEffect],
              color: "#fff",
              opacity: 0.9,
            }}
          >
            {EFFECT_NAMES[draggingEffect]}
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}

/* ─── Context Menu ─────────────────────────────────────── */
export function TimelineContextMenu({
  x,
  y,
  onClose,
}: {
  x: number;
  y: number;
  onClose: () => void;
}) {
  const state = useEditorStore.getState();
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    window.addEventListener("mousedown", handleClick);
    return () => window.removeEventListener("mousedown", handleClick);
  }, [onClose]);

  const items = [
    { label: "Duplicate", shortcut: "Ctrl+D", action: () => { state.duplicateBlocks(state.selectedBlockIds); onClose(); } },
    { label: "Delete", shortcut: "Del", action: () => { state.deleteBlocks(state.selectedBlockIds); onClose(); }, danger: true },
    { type: "separator" as const },
    { label: "Select All", shortcut: "Ctrl+A", action: () => { state.setSelection(state.sequence.blocks.map(b => b.id)); onClose(); } },
  ];

  return (
    <div
      ref={menuRef}
      className="fixed z-50 py-1 rounded-lg overflow-hidden"
      style={{
        left: x,
        top: y,
        background: "var(--surface)",
        border: "1px solid var(--line)",
        boxShadow: "var(--shadow-lg)",
        minWidth: 160,
      }}
    >
      {items.map((item, i) =>
        "type" in item && item.type === "separator" ? (
          <div key={i} className="my-1" style={{ height: 1, background: "var(--line)" }} />
        ) : (
          <button
            key={i}
            onClick={"action" in item ? item.action : undefined}
            className="w-full flex items-center justify-between px-3 py-1.5 text-xs text-left transition-colors hover:bg-[var(--panel)]"
            style={{ color: "danger" in item && item.danger ? "#b91c1c" : "var(--ink)" }}
          >
            <span>{"label" in item ? item.label : ""}</span>
            {"shortcut" in item && (
              <span className="text-xs font-mono" style={{ color: "var(--ink-4)" }}>
                {"shortcut" in item ? item.shortcut : ""}
              </span>
            )}
          </button>
        )
      )}
    </div>
  );
}

/* ─── Parameter Panel ──────────────────────────────────── */
export function ParameterPanel() {
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

/* ─── Palette draggable chip (used in sidebar) ─────────── */
export function PaletteEffectChip({ effectId, name, color }: { effectId: EffectId; name: string; color: string }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `palette:${effectId}`,
    data: { type: "palette-effect", effectId },
  });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className="flex items-center gap-1.5 px-2 py-1.5 rounded-md text-xs font-medium cursor-grab select-none"
      style={{
        border: "1px solid var(--line)",
        background: "var(--surface)",
        opacity: isDragging ? 0.4 : 1,
      }}
    >
      <span
        className="w-2 h-2 rounded-sm shrink-0"
        style={{ background: color }}
      />
      <span className="truncate">{name}</span>
    </div>
  );
}

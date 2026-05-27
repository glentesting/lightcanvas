"use client";

import { useCallback, useState, useMemo } from "react";
import {
  DndContext,
  DragOverlay,
  type DragEndEvent,
  type DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { useEditorStore } from "@/lib/store/editor-store";
import { useSelectionStore } from "@/lib/store/selection-store";
import { useTransportStore } from "@/lib/store/transport-store";
import { EFFECT_COLORS, EFFECT_NAMES, DEFAULT_EFFECT_PARAMS } from "@/lib/timeline/constants";
import { secondsToPx, pxToSeconds, snapToBeat } from "@/lib/timeline/snapping";
import type { EffectId, EffectBlock } from "@/lib/timeline/types";
import type { AudioAnalysis } from "@/lib/audio/types";
import { LABEL_WIDTH } from "@/lib/timeline/ui-constants";
import { TimelineTrackRow } from "./TimelineTrackRow";
import { TimelineParameterPanel } from "./TimelineParameterPanel";
import { TimelineContextMenu } from "./TimelineContextMenu";

interface TimelineProps {
  analysis: AudioAnalysis | null;
}

const DEFAULT_BLOCK_DURATION = 2;

export default function Timeline({ analysis }: TimelineProps) {
  const tracks = useEditorStore((s) => s.sequence.tracks);
  const blocks = useEditorStore((s) => s.sequence.blocks);
  const fixtures = useEditorStore((s) => s.fixtures);
  const groups = useEditorStore((s) => s.groups);
  const selectedBlockIds = useSelectionStore((s) => s.selectedBlockIds);
  const clearSelection = useSelectionStore((s) => s.clearSelection);

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
                  <TimelineTrackRow
                    key={track.id}
                    trackId={track.id}
                    trackIndex={trackIndex}
                    name={`⬡ ${group.name}`}
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
                <TimelineTrackRow
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
      <TimelineParameterPanel />

      {/* Context menu */}
      {contextMenu && (
        <TimelineContextMenu x={contextMenu.x} y={contextMenu.y} onClose={() => setContextMenu(null)} />
      )}
    </div>
  );
}

/* ─── DnD wrapper — wraps the entire editor body ──────────── */
export function TimelineDndProvider({ children }: { children: React.ReactNode }) {
  const addBlock = useEditorStore((s) => s.addBlock);
  const setSelection = useSelectionStore((s) => s.setSelection);
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

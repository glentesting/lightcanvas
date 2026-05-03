"use client";

import { useRef, useCallback, useState } from "react";
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

interface TimelineProps {
  analysis: AudioAnalysis | null;
}

const ROW_HEIGHT = 42;
const LABEL_WIDTH = 160;
const DEFAULT_BLOCK_DURATION = 2;

export default function Timeline({ analysis }: TimelineProps) {
  const tracks = useEditorStore((s) => s.sequence.tracks);
  const blocks = useEditorStore((s) => s.sequence.blocks);
  const fixtures = useEditorStore((s) => s.fixtures);
  const selectedBlockIds = useEditorStore((s) => s.selectedBlockIds);
  const setSelection = useEditorStore((s) => s.setSelection);

  const zoom = useTransportStore((s) => s.zoom);

  const trackAreaRef = useRef<HTMLDivElement>(null);

  const duration = analysis?.duration ?? 180;
  const totalWidth = secondsToPx(duration, zoom);

  return (
    <div className="flex-1 flex flex-col min-h-0" style={{ background: "var(--bg)" }}>
      <div ref={trackAreaRef} className="flex-1 overflow-auto">
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
              const fixture = fixtures.find((f) => f.id === track.id);
              const trackBlocks = blocks.filter((b) => b.trackId === track.id);
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
                  onSelectBlock={(id, e) => {
                    if (e.shiftKey || e.metaKey) {
                      setSelection([id], "toggle");
                    } else {
                      setSelection([id]);
                    }
                  }}
                />
              );
            })
          )}
        </div>
      </div>
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
  onSelectBlock,
}: {
  trackId: string;
  trackIndex: number;
  name: string;
  pixelCount?: number;
  blocks: EffectBlock[];
  selectedBlockIds: string[];
  zoom: number;
  totalWidth: number;
  onSelectBlock: (id: string, e: React.MouseEvent) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `track:${trackId}`,
    data: { type: "track", trackId },
  });

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
          height: ROW_HEIGHT,
          borderRight: "1px solid var(--line)",
          background: "inherit",
        }}
      >
        <div className="flex-1 min-w-0">
          <div className="text-xs font-semibold truncate">{name}</div>
          {pixelCount && (
            <div className="text-xs" style={{ color: "var(--ink-4)", fontSize: 10 }}>
              {pixelCount} px
            </div>
          )}
        </div>
      </div>

      <div
        ref={setNodeRef}
        className="relative"
        style={{ width: totalWidth, height: ROW_HEIGHT, flexShrink: 0 }}
      >
        {blocks.map((block) => {
          const left = secondsToPx(block.start, zoom);
          const width = secondsToPx(block.duration, zoom);
          const selected = selectedBlockIds.includes(block.id);
          const color = EFFECT_COLORS[block.effectId];

          return (
            <div
              key={block.id}
              className="absolute flex items-center overflow-hidden cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                onSelectBlock(block.id, e);
              }}
              style={{
                left: left + 1,
                top: 4,
                height: ROW_HEIGHT - 8,
                width: Math.max(width - 2, 8),
                borderRadius: 5,
                padding: "0 6px",
                fontSize: 11,
                fontWeight: 600,
                color: "#fff",
                background: color,
                boxShadow: selected
                  ? "0 0 0 2px var(--accent), 0 1px 3px rgba(20,22,28,.15)"
                  : "0 1px 2px rgba(20,22,28,.12)",
              }}
            >
              <span className="truncate">{EFFECT_NAMES[block.effectId]}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─── DnD wrapper — wraps the entire editor body ──────────── */
export function TimelineDndProvider({ children }: { children: React.ReactNode }) {
  const addBlock = useEditorStore((s) => s.addBlock);
  const setSelection = useEditorStore((s) => s.setSelection);
  const zoom = useTransportStore((s) => s.zoom);
  const analysis = useEditorStore((s) => s.audio);

  const [draggingEffect, setDraggingEffect] = useState<EffectId | null>(null);
  const beats = analysis?.beats ?? [];

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

        // Calculate drop time from the delta
        const deltaX = event.delta.x;
        let dropTime = pxToSeconds(Math.max(0, deltaX), zoom);
        dropTime = snapToBeat(dropTime, beats);
        // Ensure non-negative
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

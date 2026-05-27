"use client";

import { useDroppable } from "@dnd-kit/core";
import type { EffectBlock } from "@/lib/timeline/types";
import type { AudioAnalysis } from "@/lib/audio/types";
import { ROW_HEIGHT, LABEL_WIDTH } from "@/lib/timeline/ui-constants";
import { TimelineEffectBlock } from "./TimelineEffectBlock";

export function TimelineTrackRow({
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
          <TimelineEffectBlock
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

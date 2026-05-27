"use client";

import { useRef, useState, useEffect, useMemo } from "react";
import { useEditorStore } from "@/lib/store/editor-store";
import { useSelectionStore } from "@/lib/store/selection-store";
import { EFFECT_COLORS, EFFECT_NAMES } from "@/lib/timeline/constants";
import { secondsToPx, pxToSeconds, snapToBeat } from "@/lib/timeline/snapping";
import type { EffectBlock } from "@/lib/timeline/types";
import type { AudioAnalysis } from "@/lib/audio/types";
import { ROW_HEIGHT, HANDLE_WIDTH } from "@/lib/timeline/ui-constants";

export function TimelineEffectBlock({
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
  const setSelection = useSelectionStore((s) => s.setSelection);
  const moveBlocks = useEditorStore((s) => s.moveBlocks);
  const resizeBlock = useEditorStore((s) => s.resizeBlock);
  const selectedBlockIds = useSelectionStore((s) => s.selectedBlockIds);

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

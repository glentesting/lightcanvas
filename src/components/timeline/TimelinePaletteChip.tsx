"use client";

import { useDraggable } from "@dnd-kit/core";
import type { EffectId } from "@/lib/timeline/types";

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

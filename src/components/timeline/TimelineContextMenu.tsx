"use client";

import { useEffect, useRef } from "react";
import { useEditorStore } from "@/lib/store/editor-store";

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

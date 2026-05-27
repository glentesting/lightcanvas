"use client";

import { useEffect } from "react";
import { useLayout3DStore, type Layout3DTool } from "@/lib/store/layout3d-slice";

interface ToolDef {
  id: Layout3DTool;
  label: string;
  shortcut: string;
  hint: string;
}

const TOOLS: ToolDef[] = [
  { id: "select", label: "Select", shortcut: "V", hint: "Click fixtures to select" },
  { id: "pen", label: "Draw", shortcut: "P", hint: "Click to place waypoints, double-click to finish" },
];

export function Toolstrip3D() {
  const activeTool = useLayout3DStore((s) => s.activeTool);
  const setTool = useLayout3DStore((s) => s.setTool);
  const snapEnabled = useLayout3DStore((s) => s.snapEnabled);
  const showGrid = useLayout3DStore((s) => s.showGrid);
  const showAnchors = useLayout3DStore((s) => s.showAnchors);
  const toggleSnap = useLayout3DStore((s) => s.toggleSnap);
  const toggleGrid = useLayout3DStore((s) => s.toggleGrid);
  const toggleAnchors = useLayout3DStore((s) => s.toggleAnchors);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === "v" || e.key === "V") setTool("select");
      else if (e.key === "p" || e.key === "P") setTool("pen");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setTool]);

  return (
    <div
      className="absolute top-3 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1 px-1.5 py-1 rounded-full shadow-sm border"
      style={{ background: "#FAFAF8", borderColor: "#E5E0D5" }}
    >
      {TOOLS.map((t) => {
        const active = activeTool === t.id;
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => setTool(t.id)}
            title={`${t.label} (${t.shortcut}) — ${t.hint}`}
            className="px-3 py-1.5 text-sm rounded-full transition-colors"
            style={{
              background: active ? "#FFB347" : "transparent",
              color: active ? "#2A1A00" : "#5B5347",
              fontWeight: active ? 600 : 500,
            }}
          >
            {t.label} <span className="text-xs opacity-60">{t.shortcut}</span>
          </button>
        );
      })}
      <div className="w-px h-5 mx-1" style={{ background: "#E5E0D5" }} />
      <ToggleChip on={snapEnabled} onClick={toggleSnap} label="Snap" />
      <ToggleChip on={showGrid} onClick={toggleGrid} label="Grid" />
      <ToggleChip on={showAnchors} onClick={toggleAnchors} label="Anchors" />
    </div>
  );
}

function ToggleChip({ on, onClick, label }: { on: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="px-2.5 py-1 text-xs rounded-full transition-colors"
      style={{
        background: on ? "#F5F0E8" : "transparent",
        color: on ? "#2A1A00" : "#8B8378",
        fontWeight: on ? 600 : 500,
      }}
    >
      {label}: {on ? "on" : "off"}
    </button>
  );
}

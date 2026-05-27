"use client";

import { useEditorStore } from "@/lib/store/editor-store";
import { useLayout3DStore } from "@/lib/store/layout3d-slice";
import type { Fixture, FixtureKind } from "@/lib/fixtures/types";

const KIND_LABEL: Record<FixtureKind, string> = {
  roofline: "Roofline",
  "mega-tree": "Mega Tree",
  "mini-tree": "Mini Tree",
  arch: "Arch",
  bush: "Bush",
  "window-outline": "Window",
  matrix: "Matrix",
  custom: "Custom",
};

const KIND_DOT: Record<FixtureKind, string> = {
  roofline: "#FFB347",
  "mega-tree": "#2D5016",
  "mini-tree": "#4F7B2A",
  arch: "#7E5BEF",
  bush: "#2D5016",
  "window-outline": "#D6E8F0",
  matrix: "#8B7355",
  custom: "#888",
};

export function FixtureLibrarySidebar() {
  const fixtures = useEditorStore((s) => s.fixtures);
  const layouts = useLayout3DStore((s) => s.fixtures3d);
  const selectedIds = useLayout3DStore((s) => s.selectedIds);
  const setSelected = useLayout3DStore((s) => s.setSelected);
  const setTool = useLayout3DStore((s) => s.setTool);

  return (
    <div
      className="h-full flex flex-col border-r"
      style={{ background: "#FAFAF8", borderColor: "#E5E0D5", width: 280 }}
    >
      <div className="px-4 py-3 border-b" style={{ borderColor: "#E5E0D5" }}>
        <h2 className="text-sm font-semibold" style={{ color: "#2A1A00" }}>Fixtures</h2>
        <p className="text-xs mt-0.5" style={{ color: "#8B8378" }}>
          {fixtures.length} total · {Object.keys(layouts).length} placed
        </p>
      </div>

      <div className="flex-1 overflow-y-auto">
        {fixtures.length === 0 ? (
          <div className="p-6 text-sm" style={{ color: "#8B8378" }}>
            No fixtures yet. Add some from the main editor to start placing them in 3D.
          </div>
        ) : (
          <ul>
            {fixtures.map((f: Fixture) => {
              const selected = selectedIds.includes(f.id);
              const placed = layouts[f.id] !== undefined;
              return (
                <li key={f.id}>
                  <button
                    type="button"
                    onClick={(e) => {
                      const additive = e.shiftKey || e.metaKey;
                      if (additive) {
                        setSelected(Array.from(new Set([...selectedIds, f.id])));
                      } else {
                        setSelected([f.id]);
                      }
                      if (!placed) setTool("pen");
                    }}
                    className="w-full text-left px-4 py-2 flex items-center gap-3 text-sm transition-colors"
                    style={{
                      background: selected ? "#F5F0E8" : "transparent",
                      borderLeft: selected ? "3px solid #FFB347" : "3px solid transparent",
                    }}
                  >
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ background: KIND_DOT[f.kind] }}
                    />
                    <span className="flex-1 truncate" style={{ color: "#2A1A00" }}>{f.name}</span>
                    <span className="text-xs" style={{ color: placed ? "#4F7B2A" : "#B0A89A" }}>
                      {placed ? "placed" : "needs placement"}
                    </span>
                  </button>
                  <div className="px-4 pb-1.5 text-xs" style={{ color: "#8B8378" }}>
                    {KIND_LABEL[f.kind]} · {f.pixelCount}px · ch {f.startChannel}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="px-4 py-2 text-xs border-t" style={{ color: "#8B8378", borderColor: "#E5E0D5" }}>
        Select a fixture, then switch to <span style={{ fontWeight: 600 }}>Draw</span> and click in the
        scene to place its waypoints.
      </div>
    </div>
  );
}

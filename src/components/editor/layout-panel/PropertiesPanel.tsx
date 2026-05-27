"use client";

import { useMemo } from "react";
import { useEditorStore } from "@/lib/store/editor-store";
import { useLayout3DStore } from "@/lib/store/layout3d-slice";
import type { Fixture } from "@/lib/fixtures/types";

export function PropertiesPanel() {
  const fixtures = useEditorStore((s) => s.fixtures);
  const updateFixture = useEditorStore((s) => s.updateFixture);
  const selectedIds = useLayout3DStore((s) => s.selectedIds);
  const layouts = useLayout3DStore((s) => s.fixtures3d);
  const removeFixtureLayout = useLayout3DStore((s) => s.removeFixtureLayout);
  const clearSelection = useLayout3DStore((s) => s.clearSelection);

  const selected: Fixture[] = useMemo(
    () => fixtures.filter((f) => selectedIds.includes(f.id)),
    [fixtures, selectedIds],
  );

  return (
    <div
      className="h-full flex flex-col border-l"
      style={{ background: "#FAFAF8", borderColor: "#E5E0D5", width: 280 }}
    >
      <div className="px-4 py-3 border-b" style={{ borderColor: "#E5E0D5" }}>
        <h2 className="text-sm font-semibold" style={{ color: "#2A1A00" }}>Properties</h2>
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        {selected.length === 0 && (
          <p className="text-sm" style={{ color: "#8B8378" }}>
            Select a fixture to edit its details.
          </p>
        )}
        {selected.length === 1 && (
          <SingleEditor
            fixture={selected[0]}
            placed={layouts[selected[0].id] !== undefined}
            anchorId={layouts[selected[0].id]?.anchorSurfaceId}
            onUpdate={(patch) => updateFixture(selected[0].id, patch)}
            onClearPlacement={() => {
              const id = selected[0].id;
              removeFixtureLayout(id);
              updateFixture(id, { layout3d: undefined });
            }}
          />
        )}
        {selected.length > 1 && (
          <div className="space-y-3">
            <p className="text-sm" style={{ color: "#2A1A00" }}>
              {selected.length} fixtures selected
            </p>
            <button
              type="button"
              onClick={() => {
                for (const f of selected) {
                  removeFixtureLayout(f.id);
                  updateFixture(f.id, { layout3d: undefined });
                }
                clearSelection();
              }}
              className="w-full px-3 py-2 text-sm rounded border"
              style={{ borderColor: "#E5E0D5", color: "#2A1A00", background: "#FFF" }}
            >
              Clear all placements
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function SingleEditor({
  fixture,
  placed,
  anchorId,
  onUpdate,
  onClearPlacement,
}: {
  fixture: Fixture;
  placed: boolean;
  anchorId: string | undefined;
  onUpdate: (patch: Partial<Fixture>) => void;
  onClearPlacement: () => void;
}) {
  return (
    <div className="space-y-4">
      <Field label="Name">
        <input
          type="text"
          value={fixture.name}
          onChange={(e) => onUpdate({ name: e.target.value })}
          className="w-full px-2 py-1 text-sm rounded border bg-white outline-none"
          style={{ borderColor: "#E5E0D5", color: "#2A1A00" }}
        />
      </Field>
      <Field label="Type">
        <div className="text-sm py-1" style={{ color: "#5B5347" }}>{fixture.kind}</div>
      </Field>
      <Field label="Pixel count">
        <input
          type="number"
          min={1}
          value={fixture.pixelCount}
          onChange={(e) => onUpdate({ pixelCount: Math.max(1, parseInt(e.target.value) || 1) })}
          className="w-full px-2 py-1 text-sm rounded border bg-white outline-none"
          style={{ borderColor: "#E5E0D5", color: "#2A1A00" }}
        />
      </Field>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Universe">
          <input
            type="number"
            min={1}
            value={fixture.universe ?? 1}
            onChange={(e) => onUpdate({ universe: parseInt(e.target.value) || 1 })}
            className="w-full px-2 py-1 text-sm rounded border bg-white outline-none"
            style={{ borderColor: "#E5E0D5", color: "#2A1A00" }}
          />
        </Field>
        <Field label="Start channel">
          <input
            type="number"
            min={1}
            value={fixture.startChannel}
            onChange={(e) => onUpdate({ startChannel: Math.max(1, parseInt(e.target.value) || 1) })}
            className="w-full px-2 py-1 text-sm rounded border bg-white outline-none"
            style={{ borderColor: "#E5E0D5", color: "#2A1A00" }}
          />
        </Field>
      </div>
      <Field label="Direction">
        <div className="flex gap-1">
          {(["ltr", "rtl"] as const).map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => onUpdate({ direction: d })}
              className="flex-1 px-2 py-1 text-xs rounded border"
              style={{
                background: (fixture.direction ?? "ltr") === d ? "#FFB347" : "#FFF",
                color: (fixture.direction ?? "ltr") === d ? "#2A1A00" : "#5B5347",
                borderColor: "#E5E0D5",
                fontWeight: (fixture.direction ?? "ltr") === d ? 600 : 500,
              }}
            >
              {d === "ltr" ? "Forward" : "Reverse"}
            </button>
          ))}
        </div>
      </Field>
      <Field label="Anchor surface">
        <div className="text-xs py-1" style={{ color: anchorId ? "#2A1A00" : "#8B8378" }}>
          {anchorId ?? "Not snapped"}
        </div>
      </Field>
      {placed && (
        <button
          type="button"
          onClick={onClearPlacement}
          className="w-full px-3 py-2 text-sm rounded border"
          style={{ borderColor: "#E5E0D5", color: "#7A1F1F", background: "#FFF" }}
        >
          Clear placement
        </button>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide mb-1" style={{ color: "#8B8378" }}>
        {label}
      </div>
      {children}
    </div>
  );
}

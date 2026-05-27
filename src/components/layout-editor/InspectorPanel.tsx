"use client";

import type { Fixture } from "@/lib/fixtures/types";
import { KIND_COLORS } from "@/lib/fixtures/layout-constants";
import { InspectorField, SummaryStatCard } from "./components";

export function InspectorPanel({
  selected,
  fixtures,
  totalChannels,
  issuesList,
  layoutReadiness,
  inspectorTab,
  setInspectorTab,
  updateFixture,
  deleteFixture,
  setSelectedId,
}: {
  selected: Fixture | null;
  fixtures: Fixture[];
  totalChannels: number;
  issuesList: string[];
  layoutReadiness: number;
  inspectorTab: "properties" | "mapping" | "channels" | "preview";
  setInspectorTab: (v: "properties" | "mapping" | "channels" | "preview") => void;
  updateFixture: (id: string, patch: Partial<Fixture>) => void;
  deleteFixture: (id: string) => void;
  setSelectedId: (id: string | null) => void;
}) {
  return (
    <div
      className="shrink-0 flex flex-col overflow-y-auto"
      style={{ width: 290, background: "#FFFFFF", borderLeft: "1px solid var(--line)" }}
    >
      {selected ? (
        <div className="flex flex-col">
          {/* Header with name + enabled */}
          <div className="p-4 pb-3" style={{ borderBottom: "1px solid var(--line)" }}>
            <div className="flex items-center justify-between mb-2.5">
              <div
                className="text-xs font-semibold uppercase tracking-wide"
                style={{ color: "var(--ink-3)", letterSpacing: "0.06em", fontSize: 11 }}
              >
                Selected Prop
              </div>
              <label className="flex items-center gap-1.5 text-xs cursor-pointer" style={{ color: "var(--ink-3)" }}>
                Enabled
                <input type="checkbox" defaultChecked className="accent-[#3b82f6]" />
              </label>
            </div>
            <div className="flex items-center gap-2">
              <span className="shrink-0 w-3 h-3 rounded-full" style={{ background: KIND_COLORS[selected.kind] ?? "#94a3b8" }} />
              <input
                type="text"
                value={selected.name}
                onChange={(e) => updateFixture(selected.id, { name: e.target.value })}
                className="flex-1 h-8 px-2 rounded-md text-sm font-medium"
                style={{ border: "1px solid var(--line)", background: "#fafafa" }}
              />
            </div>
          </div>

          {/* Tab bar */}
          <div className="flex shrink-0" style={{ borderBottom: "1px solid var(--line)" }}>
            {(["properties", "mapping", "channels", "preview"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setInspectorTab(tab)}
                className="flex-1 py-2 text-xs font-medium capitalize transition-colors"
                style={{
                  color: inspectorTab === tab ? "#1e3a5f" : "var(--ink-4)",
                  borderBottom: inspectorTab === tab ? "2px solid #1e3a5f" : "2px solid transparent",
                  background: "transparent",
                }}
              >
                {tab === "properties" ? "Props" : tab === "mapping" ? "Map" : tab === "channels" ? "Ch" : "Preview"}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="flex-1 overflow-y-auto">
            {inspectorTab === "properties" && (
              <div className="p-4 flex flex-col gap-4">
                <div className="grid grid-cols-2 gap-2.5">
                  <InspectorField label="Pixel Count">
                    <input type="number" value={selected.pixelCount}
                      onChange={(e) => updateFixture(selected.id, { pixelCount: parseInt(e.target.value) || 1 })}
                      className="w-full h-7 px-2 rounded-md text-xs"
                      style={{ border: "1px solid var(--line)", background: "#fafafa", fontVariantNumeric: "tabular-nums" }} />
                  </InspectorField>
                  <InspectorField label="Universe">
                    <input type="number" value={selected.universe ?? 1}
                      onChange={(e) => updateFixture(selected.id, { universe: parseInt(e.target.value) || 1 })}
                      className="w-full h-7 px-2 rounded-md text-xs"
                      style={{ border: "1px solid var(--line)", background: "#fafafa", fontVariantNumeric: "tabular-nums" }} />
                  </InspectorField>
                  <InspectorField label="Start Channel">
                    <input type="number" value={selected.startChannel}
                      onChange={(e) => updateFixture(selected.id, { startChannel: parseInt(e.target.value) || 1 })}
                      className="w-full h-7 px-2 rounded-md text-xs"
                      style={{ border: "1px solid var(--line)", background: "#fafafa", fontVariantNumeric: "tabular-nums" }} />
                  </InspectorField>
                  <InspectorField label="Direction">
                    <select value={selected.direction ?? "ltr"}
                      onChange={(e) => updateFixture(selected.id, { direction: e.target.value as "ltr" | "rtl" })}
                      className="w-full h-7 px-1.5 rounded-md text-xs"
                      style={{ border: "1px solid var(--line)", background: "#fafafa" }}>
                      <option value="ltr">L → R</option>
                      <option value="rtl">R → L</option>
                    </select>
                  </InspectorField>
                </div>

                {/* Brightness limit */}
                <InspectorField label="Brightness Limit">
                  <div className="flex items-center gap-2">
                    <input type="range" min={0} max={100} defaultValue={100}
                      className="flex-1 h-1 accent-[#3b82f6]" />
                    <span className="text-xs w-8 text-right" style={{ color: "var(--ink-2)", fontVariantNumeric: "tabular-nums" }}>100%</span>
                  </div>
                </InspectorField>

                {/* Geometry (kind-specific) */}
                {selected.kind === "mega-tree" && (
                  <div style={{ borderTop: "1px solid var(--line)", paddingTop: 12 }}>
                    <div className="text-xs font-semibold uppercase tracking-wide mb-2.5" style={{ color: "var(--ink-3)", letterSpacing: "0.06em", fontSize: 11 }}>Tree Geometry</div>
                    <div className="grid grid-cols-2 gap-2.5">
                      <InspectorField label="Strands">
                        <input type="number" value={selected.geometry?.strandCount ?? 16}
                          onChange={(e) => updateFixture(selected.id, { geometry: { ...selected.geometry, strandCount: parseInt(e.target.value) || 1 } })}
                          className="w-full h-7 px-2 rounded-md text-xs"
                          style={{ border: "1px solid var(--line)", background: "#fafafa", fontVariantNumeric: "tabular-nums" }} />
                      </InspectorField>
                      <InspectorField label="Px/strand">
                        <input type="number" value={selected.geometry?.pixelsPerStrand ?? 100}
                          onChange={(e) => updateFixture(selected.id, { geometry: { ...selected.geometry, pixelsPerStrand: parseInt(e.target.value) || 1 } })}
                          className="w-full h-7 px-2 rounded-md text-xs"
                          style={{ border: "1px solid var(--line)", background: "#fafafa", fontVariantNumeric: "tabular-nums" }} />
                      </InspectorField>
                      <InspectorField label="Strand dir.">
                        <select value={selected.geometry?.strandDirection ?? "topDown"}
                          onChange={(e) => updateFixture(selected.id, { geometry: { ...selected.geometry, strandDirection: e.target.value as "topDown" | "bottomUp" } })}
                          className="w-full h-7 px-1.5 rounded-md text-xs"
                          style={{ border: "1px solid var(--line)", background: "#fafafa" }}>
                          <option value="topDown">Top-down</option>
                          <option value="bottomUp">Bottom-up</option>
                        </select>
                      </InspectorField>
                      <InspectorField label="Rotation">
                        <select value={selected.geometry?.rotationDirection ?? "clockwise"}
                          onChange={(e) => updateFixture(selected.id, { geometry: { ...selected.geometry, rotationDirection: e.target.value as "clockwise" | "counterClockwise" } })}
                          className="w-full h-7 px-1.5 rounded-md text-xs"
                          style={{ border: "1px solid var(--line)", background: "#fafafa" }}>
                          <option value="clockwise">Clockwise</option>
                          <option value="counterClockwise">Counter-CW</option>
                        </select>
                      </InspectorField>
                    </div>
                  </div>
                )}
                {selected.kind === "arch" && (
                  <div style={{ borderTop: "1px solid var(--line)", paddingTop: 12 }}>
                    <div className="text-xs font-semibold uppercase tracking-wide mb-2.5" style={{ color: "var(--ink-3)", letterSpacing: "0.06em", fontSize: 11 }}>Arch Geometry</div>
                    <div className="grid grid-cols-2 gap-2.5">
                      <InspectorField label="Orientation">
                        <select value={selected.geometry?.curveOrientation ?? "leftArch"}
                          onChange={(e) => updateFixture(selected.id, { geometry: { ...selected.geometry, curveOrientation: e.target.value as "leftArch" | "rightArch" | "mirrored" } })}
                          className="w-full h-7 px-1.5 rounded-md text-xs"
                          style={{ border: "1px solid var(--line)", background: "#fafafa" }}>
                          <option value="leftArch">Left arch</option>
                          <option value="rightArch">Right arch</option>
                          <option value="mirrored">Mirrored</option>
                        </select>
                      </InspectorField>
                      <InspectorField label="Start end">
                        <select value={selected.geometry?.startEnd ?? "left"}
                          onChange={(e) => updateFixture(selected.id, { geometry: { ...selected.geometry, startEnd: e.target.value as "left" | "right" } })}
                          className="w-full h-7 px-1.5 rounded-md text-xs"
                          style={{ border: "1px solid var(--line)", background: "#fafafa" }}>
                          <option value="left">Left</option>
                          <option value="right">Right</option>
                        </select>
                      </InspectorField>
                    </div>
                  </div>
                )}
                {selected.kind === "matrix" && (
                  <div style={{ borderTop: "1px solid var(--line)", paddingTop: 12 }}>
                    <div className="text-xs font-semibold uppercase tracking-wide mb-2.5" style={{ color: "var(--ink-3)", letterSpacing: "0.06em", fontSize: 11 }}>Matrix Geometry</div>
                    <div className="grid grid-cols-2 gap-2.5">
                      <InspectorField label="Rows">
                        <input type="number" value={selected.geometry?.rows ?? 16}
                          onChange={(e) => updateFixture(selected.id, { geometry: { ...selected.geometry, rows: parseInt(e.target.value) || 1 } })}
                          className="w-full h-7 px-2 rounded-md text-xs"
                          style={{ border: "1px solid var(--line)", background: "#fafafa", fontVariantNumeric: "tabular-nums" }} />
                      </InspectorField>
                      <InspectorField label="Columns">
                        <input type="number" value={selected.geometry?.cols ?? 32}
                          onChange={(e) => updateFixture(selected.id, { geometry: { ...selected.geometry, cols: parseInt(e.target.value) || 1 } })}
                          className="w-full h-7 px-2 rounded-md text-xs"
                          style={{ border: "1px solid var(--line)", background: "#fafafa", fontVariantNumeric: "tabular-nums" }} />
                      </InspectorField>
                      <InspectorField label="Wiring dir.">
                        <select value={selected.geometry?.wiringDirection ?? "horizontal"}
                          onChange={(e) => updateFixture(selected.id, { geometry: { ...selected.geometry, wiringDirection: e.target.value as "horizontal" | "vertical" } })}
                          className="w-full h-7 px-1.5 rounded-md text-xs"
                          style={{ border: "1px solid var(--line)", background: "#fafafa" }}>
                          <option value="horizontal">Horizontal</option>
                          <option value="vertical">Vertical</option>
                        </select>
                      </InspectorField>
                      <InspectorField label="Wiring pat.">
                        <select value={selected.geometry?.wiringPattern ?? "linear"}
                          onChange={(e) => updateFixture(selected.id, { geometry: { ...selected.geometry, wiringPattern: e.target.value as "linear" | "alternating" } })}
                          className="w-full h-7 px-1.5 rounded-md text-xs"
                          style={{ border: "1px solid var(--line)", background: "#fafafa" }}>
                          <option value="linear">Linear</option>
                          <option value="alternating">Alternating</option>
                        </select>
                      </InspectorField>
                      <InspectorField label="Start corner" span2>
                        <select value={selected.geometry?.startCorner ?? "topLeft"}
                          onChange={(e) => updateFixture(selected.id, { geometry: { ...selected.geometry, startCorner: e.target.value as "topLeft" | "topRight" | "bottomLeft" | "bottomRight" } })}
                          className="w-full h-7 px-1.5 rounded-md text-xs"
                          style={{ border: "1px solid var(--line)", background: "#fafafa" }}>
                          <option value="topLeft">Top-left</option>
                          <option value="topRight">Top-right</option>
                          <option value="bottomLeft">Bottom-left</option>
                          <option value="bottomRight">Bottom-right</option>
                        </select>
                      </InspectorField>
                    </div>
                  </div>
                )}
              </div>
            )}

            {inspectorTab === "mapping" && (
              <div className="p-4 flex flex-col gap-3">
                {/* Mapping status */}
                <div className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-md"
                  style={{
                    background: selected.layout?.points.length ? "#f0fdf4" : "#fffbeb",
                    color: selected.layout?.points.length ? "#15803d" : "#b45309",
                  }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    {selected.layout?.points.length
                      ? <polyline points="20 6 9 17 4 12" />
                      : <><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></>}
                  </svg>
                  {selected.layout?.points.length ? "Mapping valid" : "Needs placement"}
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <InspectorField label="Controller">
                    <input type="text" defaultValue="Controller 1" readOnly
                      className="w-full h-7 px-2 rounded-md text-xs"
                      style={{ border: "1px solid var(--line)", background: "#fafafa", color: "var(--ink-2)" }} />
                  </InspectorField>
                  <InspectorField label="Port / Output">
                    <input type="text" defaultValue="Port 1"
                      className="w-full h-7 px-2 rounded-md text-xs"
                      style={{ border: "1px solid var(--line)", background: "#fafafa" }} />
                  </InspectorField>
                  <InspectorField label="Pixel Start">
                    <input type="number" value={selected.startChannel} readOnly
                      className="w-full h-7 px-2 rounded-md text-xs"
                      style={{ border: "1px solid var(--line)", background: "#fafafa", fontVariantNumeric: "tabular-nums", color: "var(--ink-2)" }} />
                  </InspectorField>
                  <InspectorField label="Channel Count">
                    <input type="number" value={selected.pixelCount * 3} readOnly
                      className="w-full h-7 px-2 rounded-md text-xs"
                      style={{ border: "1px solid var(--line)", background: "#fafafa", fontVariantNumeric: "tabular-nums", color: "var(--ink-2)" }} />
                  </InspectorField>
                </div>
              </div>
            )}

            {inspectorTab === "channels" && (
              <div className="p-4 flex flex-col gap-3">
                <div className="text-xs" style={{ color: "var(--ink-3)" }}>
                  Channels: {selected.startChannel} – {selected.startChannel + selected.pixelCount * 3 - 1}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs" style={{ color: "var(--ink-3)" }}>{selected.pixelCount * 3} ch</span>
                  <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: "#f0f0f0" }}>
                    <div className="h-full rounded-full"
                      style={{ width: `${Math.min(100, ((selected.pixelCount * 3) / 512) * 100)}%`, background: "linear-gradient(90deg, #3b82f6, #6366f1)" }} />
                  </div>
                  <span className="text-xs" style={{ color: "var(--ink-4)", fontVariantNumeric: "tabular-nums" }}>/ 512</span>
                </div>
                {/* Per-channel overlap check */}
                {issuesList.filter((i) => i.includes(selected.name)).length > 0 ? (
                  <div className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-md" style={{ background: "#fef2f2", color: "#b91c1c" }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                    Channel overlap detected
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-md" style={{ background: "#f0fdf4", color: "#15803d" }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    No channel conflicts
                  </div>
                )}
              </div>
            )}

            {inspectorTab === "preview" && (
              <div className="p-4 flex flex-col gap-3">
                <InspectorField label="Visual Preview">
                  <div className="flex h-8 rounded-lg overflow-hidden" style={{ border: "1px solid var(--line)" }}>
                    {(["Off", "On", "Test"] as const).map((mode) => (
                      <button key={mode}
                        className="flex-1 text-xs font-medium transition-colors"
                        style={{ background: mode === "Off" ? "#1e3a5f" : "#FFFFFF", color: mode === "Off" ? "#FFFFFF" : "var(--ink-3)", borderLeft: mode !== "Off" ? "1px solid var(--line)" : "none" }}>
                        {mode}
                      </button>
                    ))}
                  </div>
                </InspectorField>
                <button className="text-xs font-medium text-left flex items-center gap-1.5" style={{ color: "#3b82f6" }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="2" y="3" width="20" height="14" rx="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" />
                  </svg>
                  Show in Controller View
                </button>
              </div>
            )}
          </div>

          {/* Delete button */}
          <div className="px-4 py-3 shrink-0" style={{ borderTop: "1px solid var(--line)" }}>
            <button
              onClick={() => { deleteFixture(selected.id); setSelectedId(null); }}
              className="text-xs"
              style={{ color: "#b91c1c", opacity: 0.7, background: "none", border: "none", cursor: "pointer" }}
            >
              Delete prop
            </button>
          </div>
        </div>
      ) : (
        /* Layout summary — nothing selected */
        <div className="flex flex-col">
          <div className="p-4" style={{ borderBottom: "1px solid var(--line)" }}>
            <div className="text-xs font-semibold uppercase tracking-wide"
              style={{ color: "var(--ink-3)", letterSpacing: "0.06em", fontSize: 11 }}>
              Layout Summary
            </div>
          </div>

          <div className="p-4 flex flex-col gap-4">
            {/* Stat cards */}
            <div className="grid grid-cols-2 gap-2.5">
              <SummaryStatCard icon="props" label="Props Mapped" value={String(fixtures.filter((f) => f.layout?.points.length).length)} />
              <SummaryStatCard icon="channels" label="Channels" value={totalChannels.toLocaleString()} />
              <SummaryStatCard icon="controller" label="Controllers" value="1" />
              <SummaryStatCard icon="ready" label="Layout Ready" value={`${layoutReadiness}%`} />
            </div>

            {/* Readiness bar */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs" style={{ color: "var(--ink-3)" }}>Layout Readiness</span>
                <span className="text-xs font-semibold" style={{ color: "var(--ink)" }}>{layoutReadiness}%</span>
              </div>
              <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: "#f0f0f0" }}>
                <div className="h-full rounded-full transition-all"
                  style={{
                    width: `${layoutReadiness}%`,
                    background: layoutReadiness === 100 ? "#16a34a" : layoutReadiness > 60 ? "#3b82f6" : "#d97706",
                  }} />
              </div>
            </div>

            {/* Issues */}
            {(() => {
              const needsPlacement = fixtures.filter((f) => !f.layout?.points.length).length;
              const overlapCount = issuesList.filter((i) => i.startsWith("Channel overlap")).length;
              return (needsPlacement > 0 || overlapCount > 0) ? (
                <div className="flex flex-col gap-2">
                  <div className="text-xs font-semibold uppercase tracking-wide"
                    style={{ color: "var(--ink-3)", letterSpacing: "0.06em", fontSize: 10 }}>
                    Needs Attention
                  </div>
                  {needsPlacement > 0 && (
                    <div className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-md"
                      style={{ background: "#fffbeb", color: "#b45309" }}>
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                      </svg>
                      {needsPlacement} prop{needsPlacement > 1 ? "s" : ""} need{needsPlacement === 1 ? "s" : ""} mapping
                    </div>
                  )}
                  {overlapCount > 0 && (
                    <div className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-md"
                      style={{ background: "#fef2f2", color: "#b91c1c" }}>
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                      </svg>
                      {overlapCount} channel overlap{overlapCount > 1 ? "s" : ""}
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-xs px-2.5 py-2 rounded-md"
                  style={{ background: "#f0fdf4", color: "#15803d" }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  All props mapped — layout ready
                </div>
              );
            })()}

            {/* Prompt */}
            <div className="text-xs text-center py-3 rounded-md"
              style={{ color: "var(--ink-4)", background: "#fafafa" }}>
              Select a prop to edit details
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

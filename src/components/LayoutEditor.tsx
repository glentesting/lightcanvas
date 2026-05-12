"use client";

import { useState, useCallback, useRef, useMemo } from "react";
import { useEditorStore } from "@/lib/store/editor-store";
import type { Fixture, FixtureKind } from "@/lib/fixtures/types";
import { FIXTURE_TEMPLATES, nextStartChannel, autoName } from "@/lib/fixtures/library";
import House from "@/components/editor/house";

// Each prop kind has a default size (in SVG viewBox units out of 720x420)
const PROP_DEFAULTS: Record<string, { w: number; h: number; cx: number; cy: number }> = {
  roofline:         { w: 380, h: 20, cx: 360, cy: 155 },
  "window-outline": { w: 44, h: 54, cx: 240, cy: 255 },
  bush:             { w: 56, h: 28, cx: 260, cy: 320 },
  "mega-tree":      { w: 64, h: 160, cx: 690, cy: 240 },
  "mini-tree":      { w: 36, h: 55, cx: 310, cy: 295 },
  arch:             { w: 80, h: 50, cx: 360, cy: 295 },
  matrix:           { w: 80, h: 50, cx: 500, cy: 240 },
};

// Category grouping for the props list
const KIND_CATEGORIES: { label: string; kinds: FixtureKind[] }[] = [
  { label: "Rooflines", kinds: ["roofline"] },
  { label: "Windows", kinds: ["window-outline"] },
  { label: "Trees", kinds: ["mega-tree", "mini-tree"] },
  { label: "Landscape", kinds: ["bush", "arch"] },
  { label: "Other", kinds: ["matrix", "custom"] },
];

// Color dot per kind
const KIND_COLORS: Record<string, string> = {
  roofline: "#f59e0b",
  "window-outline": "#3b82f6",
  "mega-tree": "#22c55e",
  "mini-tree": "#86efac",
  bush: "#a78bfa",
  arch: "#f97316",
  matrix: "#ec4899",
  custom: "#94a3b8",
};

export default function LayoutEditor() {
  const fixtures = useEditorStore((s) => s.fixtures);
  const addFixture = useEditorStore((s) => s.addFixture);
  const updateFixture = useEditorStore((s) => s.updateFixture);
  const deleteFixture = useEditorStore((s) => s.deleteFixture);
  const houseCustomSvg = useEditorStore((s) => s.houseCustomSvg);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dragging, setDragging] = useState<{ id: string; startMX: number; startMY: number; origX: number; origY: number } | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const svgRef = useRef<SVGSVGElement>(null);

  const selected = fixtures.find((f) => f.id === selectedId) ?? null;

  // Filter fixtures by search
  const filteredFixtures = useMemo(() => {
    if (!searchQuery.trim()) return fixtures;
    const q = searchQuery.toLowerCase();
    return fixtures.filter((f) => f.name.toLowerCase().includes(q) || f.kind.toLowerCase().includes(q));
  }, [fixtures, searchQuery]);

  // Convert mouse event to SVG coords (0-720, 0-420)
  const toSvg = useCallback((e: React.MouseEvent | MouseEvent): { x: number; y: number } | null => {
    if (!svgRef.current) return null;
    const rect = svgRef.current.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * 720,
      y: ((e.clientY - rect.top) / rect.height) * 420,
    };
  }, []);

  const handlePropMouseDown = useCallback((e: React.MouseEvent, fixtureId: string) => {
    e.stopPropagation();
    e.preventDefault();
    setSelectedId(fixtureId);
    const fixture = fixtures.find((f) => f.id === fixtureId);
    if (!fixture?.layout?.points[0]) return;
    const pt = toSvg(e);
    if (!pt) return;
    setDragging({
      id: fixtureId,
      startMX: pt.x,
      startMY: pt.y,
      origX: fixture.layout.points[0].x,
      origY: fixture.layout.points[0].y,
    });
  }, [fixtures, toSvg]);

  const handleMouseMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (!dragging) return;
    const pt = toSvg(e);
    if (!pt) return;
    const dx = pt.x - dragging.startMX;
    const dy = pt.y - dragging.startMY;
    updateFixture(dragging.id, {
      layout: { points: [{ x: dragging.origX + dx, y: dragging.origY + dy }], closed: false },
    });
  }, [dragging, toSvg, updateFixture]);

  const handleMouseUp = useCallback(() => setDragging(null), []);

  const handleCanvasClick = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    const target = e.target as SVGElement;
    if (!target.closest("[data-prop]")) {
      setSelectedId(null);
    }
  }, []);

  // Layout summary calculations
  const totalChannels = useMemo(() => {
    return fixtures.reduce((sum, f) => sum + f.pixelCount * 3, 0);
  }, [fixtures]);

  const issuesList = useMemo(() => {
    const issues: string[] = [];
    const fixturesWithoutLayout = fixtures.filter((f) => !f.layout?.points.length);
    if (fixturesWithoutLayout.length > 0) {
      issues.push(`${fixturesWithoutLayout.length} prop${fixturesWithoutLayout.length > 1 ? "s" : ""} need${fixturesWithoutLayout.length === 1 ? "s" : ""} placement`);
    }
    // Check for channel overlaps
    for (let i = 0; i < fixtures.length; i++) {
      for (let j = i + 1; j < fixtures.length; j++) {
        const a = fixtures[i];
        const b = fixtures[j];
        if ((a.universe ?? 1) === (b.universe ?? 1)) {
          const aEnd = a.startChannel + a.pixelCount * 3 - 1;
          const bEnd = b.startChannel + b.pixelCount * 3 - 1;
          if (a.startChannel <= bEnd && b.startChannel <= aEnd) {
            issues.push(`Channel overlap: ${a.name} / ${b.name}`);
          }
        }
      }
    }
    return issues;
  }, [fixtures]);

  const layoutReadiness = useMemo(() => {
    if (fixtures.length === 0) return 0;
    const placed = fixtures.filter((f) => f.layout?.points.length).length;
    const noOverlap = issuesList.filter((i) => i.startsWith("Channel overlap")).length === 0;
    const placedPct = (placed / fixtures.length) * 70;
    const overlapPct = noOverlap ? 30 : 0;
    return Math.round(placedPct + overlapPct);
  }, [fixtures, issuesList]);

  return (
    <div className="flex-1 flex min-h-0">
      {/* Left panel — Props list */}
      <div
        className="shrink-0 flex flex-col overflow-hidden"
        style={{ width: 220, background: "#FFFFFF", borderRight: "1px solid var(--line)" }}
      >
        <div className="p-3 pb-2" style={{ borderBottom: "1px solid var(--line)" }}>
          <div
            className="text-xs font-semibold uppercase tracking-wide mb-2"
            style={{ color: "var(--ink-3)", letterSpacing: "0.06em", fontSize: 11 }}
          >
            Props
          </div>
          <input
            type="text"
            placeholder="Search props..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-7 px-2.5 rounded-md text-xs"
            style={{ border: "1px solid var(--line)", background: "#fafafa", color: "var(--ink)" }}
          />
        </div>

        <div className="flex-1 overflow-y-auto">
          {KIND_CATEGORIES.map((cat) => {
            const catFixtures = filteredFixtures.filter((f) => (cat.kinds as string[]).includes(f.kind));
            if (catFixtures.length === 0 && searchQuery.trim()) return null;
            return (
              <div key={cat.label}>
                <div
                  className="flex items-center justify-between px-3 py-1.5"
                  style={{ background: "#fafafa", borderBottom: "1px solid var(--line)" }}
                >
                  <span
                    className="text-xs font-semibold uppercase tracking-wide"
                    style={{ color: "var(--ink-3)", letterSpacing: "0.06em", fontSize: 10 }}
                  >
                    {cat.label}
                  </span>
                  <span className="text-xs" style={{ color: "var(--ink-4)", fontSize: 10 }}>
                    {catFixtures.length}
                  </span>
                </div>
                {catFixtures.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setSelectedId(f.id)}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-left text-xs transition-colors"
                    style={{
                      background: f.id === selectedId ? "#f0f4ff" : "transparent",
                      borderBottom: "1px solid #f5f5f5",
                    }}
                    onMouseEnter={(e) => {
                      if (f.id !== selectedId) (e.currentTarget.style.background = "#f8f8f8");
                    }}
                    onMouseLeave={(e) => {
                      if (f.id !== selectedId) (e.currentTarget.style.background = "transparent");
                    }}
                  >
                    {/* Colored kind dot */}
                    <span
                      className="shrink-0 w-2 h-2 rounded-full"
                      style={{ background: KIND_COLORS[f.kind] ?? "#94a3b8" }}
                    />
                    <span
                      className="flex-1 truncate font-medium"
                      style={{ color: f.id === selectedId ? "var(--ink)" : "var(--ink-2)" }}
                    >
                      {f.name}
                    </span>
                    <span style={{ color: "var(--ink-4)", fontSize: 10, fontVariantNumeric: "tabular-nums" }}>
                      {f.pixelCount}px
                    </span>
                  </button>
                ))}
              </div>
            );
          })}
        </div>

        {/* Add prop button at bottom */}
        <div className="p-3 shrink-0" style={{ borderTop: "1px solid var(--line)" }}>
          <button
            onClick={() => setShowAddDialog(true)}
            className="w-full flex items-center justify-center gap-1 h-7 rounded-md text-xs font-semibold"
            style={{ background: "#1e3a5f", color: "#fff" }}
          >
            + Add Prop
          </button>
        </div>
      </div>

      {/* Center — Canvas */}
      <div className="flex-1 relative overflow-hidden" style={{ background: "#f5f4f0" }}>
        {/* House + interactive prop overlay */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div
            style={{
              position: "relative",
              borderRadius: 6,
              overflow: "hidden",
              boxShadow: "0 8px 40px rgba(20,22,28,.15)",
            }}
          >
            {houseCustomSvg ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={houseCustomSvg}
                alt="Custom house"
                width={720}
                height={420}
                style={{ width: 720, height: 420, objectFit: "cover" }}
              />
            ) : (
              <House width={720} height={420} id="layout-house" />
            )}
            {/* Interactive prop overlay */}
            <svg
              ref={svgRef}
              width="720"
              height="420"
              viewBox="0 0 720 420"
              style={{ position: "absolute", inset: 0, cursor: dragging ? "grabbing" : "default" }}
              onClick={handleCanvasClick}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            >
              {fixtures.map((f) => (
                <PropShape
                  key={f.id}
                  fixture={f}
                  isSelected={f.id === selectedId}
                  onMouseDown={(e) => handlePropMouseDown(e, f.id)}
                />
              ))}
            </svg>
          </div>
        </div>
      </div>

      {/* Right panel — Inspector */}
      <div
        className="shrink-0 flex flex-col overflow-y-auto"
        style={{ width: 280, background: "#FFFFFF", borderLeft: "1px solid var(--line)" }}
      >
        {selected ? (
          /* Selected prop inspector */
          <div className="flex flex-col">
            {/* Header */}
            <div className="p-4 pb-3" style={{ borderBottom: "1px solid var(--line)" }}>
              <div
                className="text-xs font-semibold uppercase tracking-wide mb-3"
                style={{ color: "var(--ink-3)", letterSpacing: "0.06em", fontSize: 11 }}
              >
                Selected Prop
              </div>
              <div className="flex items-center gap-2">
                <span
                  className="shrink-0 w-3 h-3 rounded-full"
                  style={{ background: KIND_COLORS[selected.kind] ?? "#94a3b8" }}
                />
                <input
                  type="text"
                  value={selected.name}
                  onChange={(e) => updateFixture(selected.id, { name: e.target.value })}
                  className="flex-1 h-8 px-2 rounded-md text-sm font-medium"
                  style={{ border: "1px solid var(--line)", background: "#fafafa" }}
                />
              </div>
            </div>

            {/* Properties section */}
            <div className="p-4">
              <div
                className="text-xs font-semibold uppercase tracking-wide mb-2.5"
                style={{ color: "var(--ink-3)", letterSpacing: "0.06em", fontSize: 11 }}
              >
                Properties
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-xs mb-1 block" style={{ color: "var(--ink-3)" }}>Pixel Count</label>
                  <input
                    type="number"
                    value={selected.pixelCount}
                    onChange={(e) => updateFixture(selected.id, { pixelCount: parseInt(e.target.value) || 1 })}
                    className="w-full h-7 px-2 rounded-md text-xs"
                    style={{ border: "1px solid var(--line)", background: "#fafafa", fontVariantNumeric: "tabular-nums" }}
                  />
                </div>
                <div>
                  <label className="text-xs mb-1 block" style={{ color: "var(--ink-3)" }}>Universe</label>
                  <input
                    type="number"
                    value={selected.universe ?? 1}
                    onChange={(e) => updateFixture(selected.id, { universe: parseInt(e.target.value) || 1 })}
                    className="w-full h-7 px-2 rounded-md text-xs"
                    style={{ border: "1px solid var(--line)", background: "#fafafa", fontVariantNumeric: "tabular-nums" }}
                  />
                </div>
                <div>
                  <label className="text-xs mb-1 block" style={{ color: "var(--ink-3)" }}>Start Channel</label>
                  <input
                    type="number"
                    value={selected.startChannel}
                    onChange={(e) => updateFixture(selected.id, { startChannel: parseInt(e.target.value) || 1 })}
                    className="w-full h-7 px-2 rounded-md text-xs"
                    style={{ border: "1px solid var(--line)", background: "#fafafa", fontVariantNumeric: "tabular-nums" }}
                  />
                </div>
                <div>
                  <label className="text-xs mb-1 block" style={{ color: "var(--ink-3)" }}>Direction</label>
                  <select
                    value={selected.direction ?? "ltr"}
                    onChange={(e) => updateFixture(selected.id, { direction: e.target.value as "ltr" | "rtl" })}
                    className="w-full h-7 px-1.5 rounded-md text-xs"
                    style={{ border: "1px solid var(--line)", background: "#fafafa" }}
                  >
                    <option value="ltr">L &rarr; R</option>
                    <option value="rtl">R &rarr; L</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Geometry fields — conditional on fixture kind */}
            {selected.kind === "mega-tree" && (
              <div className="px-4 pb-4">
                <div style={{ borderTop: "1px solid var(--line)", paddingTop: 12 }}>
                  <div
                    className="text-xs font-semibold uppercase tracking-wide mb-2.5"
                    style={{ color: "var(--ink-3)", letterSpacing: "0.06em", fontSize: 11 }}
                  >
                    Tree Geometry
                  </div>
                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="text-xs mb-1 block" style={{ color: "var(--ink-3)" }}>Strands</label>
                      <input
                        type="number"
                        value={selected.geometry?.strandCount ?? 16}
                        onChange={(e) => updateFixture(selected.id, { geometry: { ...selected.geometry, strandCount: parseInt(e.target.value) || 1 } })}
                        className="w-full h-7 px-2 rounded-md text-xs"
                        style={{ border: "1px solid var(--line)", background: "#fafafa", fontVariantNumeric: "tabular-nums" }}
                      />
                    </div>
                    <div>
                      <label className="text-xs mb-1 block" style={{ color: "var(--ink-3)" }}>Px/strand</label>
                      <input
                        type="number"
                        value={selected.geometry?.pixelsPerStrand ?? 100}
                        onChange={(e) => updateFixture(selected.id, { geometry: { ...selected.geometry, pixelsPerStrand: parseInt(e.target.value) || 1 } })}
                        className="w-full h-7 px-2 rounded-md text-xs"
                        style={{ border: "1px solid var(--line)", background: "#fafafa", fontVariantNumeric: "tabular-nums" }}
                      />
                    </div>
                    <div>
                      <label className="text-xs mb-1 block" style={{ color: "var(--ink-3)" }}>Strand dir.</label>
                      <select
                        value={selected.geometry?.strandDirection ?? "topDown"}
                        onChange={(e) => updateFixture(selected.id, { geometry: { ...selected.geometry, strandDirection: e.target.value as "topDown" | "bottomUp" } })}
                        className="w-full h-7 px-1.5 rounded-md text-xs"
                        style={{ border: "1px solid var(--line)", background: "#fafafa" }}
                      >
                        <option value="topDown">Top-down</option>
                        <option value="bottomUp">Bottom-up</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs mb-1 block" style={{ color: "var(--ink-3)" }}>Rotation</label>
                      <select
                        value={selected.geometry?.rotationDirection ?? "clockwise"}
                        onChange={(e) => updateFixture(selected.id, { geometry: { ...selected.geometry, rotationDirection: e.target.value as "clockwise" | "counterClockwise" } })}
                        className="w-full h-7 px-1.5 rounded-md text-xs"
                        style={{ border: "1px solid var(--line)", background: "#fafafa" }}
                      >
                        <option value="clockwise">Clockwise</option>
                        <option value="counterClockwise">Counter-CW</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {selected.kind === "arch" && (
              <div className="px-4 pb-4">
                <div style={{ borderTop: "1px solid var(--line)", paddingTop: 12 }}>
                  <div
                    className="text-xs font-semibold uppercase tracking-wide mb-2.5"
                    style={{ color: "var(--ink-3)", letterSpacing: "0.06em", fontSize: 11 }}
                  >
                    Arch Geometry
                  </div>
                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="text-xs mb-1 block" style={{ color: "var(--ink-3)" }}>Orientation</label>
                      <select
                        value={selected.geometry?.curveOrientation ?? "leftArch"}
                        onChange={(e) => updateFixture(selected.id, { geometry: { ...selected.geometry, curveOrientation: e.target.value as "leftArch" | "rightArch" | "mirrored" } })}
                        className="w-full h-7 px-1.5 rounded-md text-xs"
                        style={{ border: "1px solid var(--line)", background: "#fafafa" }}
                      >
                        <option value="leftArch">Left arch</option>
                        <option value="rightArch">Right arch</option>
                        <option value="mirrored">Mirrored</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs mb-1 block" style={{ color: "var(--ink-3)" }}>Start end</label>
                      <select
                        value={selected.geometry?.startEnd ?? "left"}
                        onChange={(e) => updateFixture(selected.id, { geometry: { ...selected.geometry, startEnd: e.target.value as "left" | "right" } })}
                        className="w-full h-7 px-1.5 rounded-md text-xs"
                        style={{ border: "1px solid var(--line)", background: "#fafafa" }}
                      >
                        <option value="left">Left</option>
                        <option value="right">Right</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {selected.kind === "matrix" && (
              <div className="px-4 pb-4">
                <div style={{ borderTop: "1px solid var(--line)", paddingTop: 12 }}>
                  <div
                    className="text-xs font-semibold uppercase tracking-wide mb-2.5"
                    style={{ color: "var(--ink-3)", letterSpacing: "0.06em", fontSize: 11 }}
                  >
                    Matrix Geometry
                  </div>
                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="text-xs mb-1 block" style={{ color: "var(--ink-3)" }}>Rows</label>
                      <input
                        type="number"
                        value={selected.geometry?.rows ?? 16}
                        onChange={(e) => updateFixture(selected.id, { geometry: { ...selected.geometry, rows: parseInt(e.target.value) || 1 } })}
                        className="w-full h-7 px-2 rounded-md text-xs"
                        style={{ border: "1px solid var(--line)", background: "#fafafa", fontVariantNumeric: "tabular-nums" }}
                      />
                    </div>
                    <div>
                      <label className="text-xs mb-1 block" style={{ color: "var(--ink-3)" }}>Columns</label>
                      <input
                        type="number"
                        value={selected.geometry?.cols ?? 32}
                        onChange={(e) => updateFixture(selected.id, { geometry: { ...selected.geometry, cols: parseInt(e.target.value) || 1 } })}
                        className="w-full h-7 px-2 rounded-md text-xs"
                        style={{ border: "1px solid var(--line)", background: "#fafafa", fontVariantNumeric: "tabular-nums" }}
                      />
                    </div>
                    <div>
                      <label className="text-xs mb-1 block" style={{ color: "var(--ink-3)" }}>Wiring dir.</label>
                      <select
                        value={selected.geometry?.wiringDirection ?? "horizontal"}
                        onChange={(e) => updateFixture(selected.id, { geometry: { ...selected.geometry, wiringDirection: e.target.value as "horizontal" | "vertical" } })}
                        className="w-full h-7 px-1.5 rounded-md text-xs"
                        style={{ border: "1px solid var(--line)", background: "#fafafa" }}
                      >
                        <option value="horizontal">Horizontal</option>
                        <option value="vertical">Vertical</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs mb-1 block" style={{ color: "var(--ink-3)" }}>Wiring pat.</label>
                      <select
                        value={selected.geometry?.wiringPattern ?? "linear"}
                        onChange={(e) => updateFixture(selected.id, { geometry: { ...selected.geometry, wiringPattern: e.target.value as "linear" | "alternating" } })}
                        className="w-full h-7 px-1.5 rounded-md text-xs"
                        style={{ border: "1px solid var(--line)", background: "#fafafa" }}
                      >
                        <option value="linear">Linear</option>
                        <option value="alternating">Alternating</option>
                      </select>
                    </div>
                    <div className="col-span-2">
                      <label className="text-xs mb-1 block" style={{ color: "var(--ink-3)" }}>Start corner</label>
                      <select
                        value={selected.geometry?.startCorner ?? "topLeft"}
                        onChange={(e) => updateFixture(selected.id, { geometry: { ...selected.geometry, startCorner: e.target.value as "topLeft" | "topRight" | "bottomLeft" | "bottomRight" } })}
                        className="w-full h-7 px-1.5 rounded-md text-xs"
                        style={{ border: "1px solid var(--line)", background: "#fafafa" }}
                      >
                        <option value="topLeft">Top-left</option>
                        <option value="topRight">Top-right</option>
                        <option value="bottomLeft">Bottom-left</option>
                        <option value="bottomRight">Bottom-right</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Mapping status */}
            <div className="px-4 pb-3">
              <div style={{ borderTop: "1px solid var(--line)", paddingTop: 12 }}>
                <div
                  className="text-xs font-semibold uppercase tracking-wide mb-2"
                  style={{ color: "var(--ink-3)", letterSpacing: "0.06em", fontSize: 11 }}
                >
                  Mapping Status
                </div>
                {selected.layout?.points.length ? (
                  <div className="flex items-center gap-1.5 text-xs" style={{ color: "#16a34a" }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    Mapping valid
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 text-xs" style={{ color: "#d97706" }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="8" x2="12" y2="12" />
                      <line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                    Needs placement on canvas
                  </div>
                )}
              </div>
            </div>

            {/* Channel usage bar */}
            <div className="px-4 pb-4">
              <div
                className="text-xs mb-1.5"
                style={{ color: "var(--ink-3)", fontSize: 10 }}
              >
                Channels: {selected.startChannel} &ndash; {selected.startChannel + selected.pixelCount * 3 - 1} ({selected.pixelCount * 3} ch)
              </div>
              <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: "#f0f0f0" }}>
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${Math.min(100, ((selected.pixelCount * 3) / 512) * 100)}%`,
                    background: "linear-gradient(90deg, #3b82f6, #6366f1)",
                  }}
                />
              </div>
            </div>

            {/* Delete button */}
            <div className="px-4 pb-4">
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
              <div
                className="text-xs font-semibold uppercase tracking-wide"
                style={{ color: "var(--ink-3)", letterSpacing: "0.06em", fontSize: 11 }}
              >
                Layout Summary
              </div>
            </div>

            <div className="p-4 flex flex-col gap-4">
              {/* Stats */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col">
                  <span className="text-xs" style={{ color: "var(--ink-3)" }}>Total Props</span>
                  <span className="text-lg font-semibold" style={{ color: "var(--ink)" }}>{fixtures.length}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-xs" style={{ color: "var(--ink-3)" }}>Channels Used</span>
                  <span className="text-lg font-semibold" style={{ color: "var(--ink)" }}>{totalChannels.toLocaleString()}</span>
                </div>
              </div>

              {/* Readiness */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs" style={{ color: "var(--ink-3)" }}>Layout Readiness</span>
                  <span className="text-xs font-semibold" style={{ color: "var(--ink)" }}>{layoutReadiness}%</span>
                </div>
                <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: "#f0f0f0" }}>
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${layoutReadiness}%`,
                      background: layoutReadiness === 100 ? "#16a34a" : layoutReadiness > 60 ? "#3b82f6" : "#d97706",
                    }}
                  />
                </div>
              </div>

              {/* Issues */}
              {issuesList.length > 0 && (
                <div>
                  <div
                    className="text-xs font-semibold uppercase tracking-wide mb-2"
                    style={{ color: "var(--ink-3)", letterSpacing: "0.06em", fontSize: 10 }}
                  >
                    Issues
                  </div>
                  <div className="flex flex-col gap-1.5">
                    {issuesList.map((issue, i) => (
                      <div
                        key={i}
                        className="flex items-start gap-1.5 text-xs"
                        style={{ color: "#d97706" }}
                      >
                        <svg className="shrink-0 mt-0.5" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <circle cx="12" cy="12" r="10" />
                          <line x1="12" y1="8" x2="12" y2="12" />
                          <line x1="12" y1="16" x2="12.01" y2="16" />
                        </svg>
                        {issue}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Prompt */}
              <div
                className="text-xs text-center py-3 rounded-md"
                style={{ color: "var(--ink-4)", background: "#fafafa" }}
              >
                Select a prop to edit details
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Add Prop Dialog */}
      {showAddDialog && (
        <AddPropDialog
          fixtures={fixtures}
          onAdd={(fixture) => {
            addFixture(fixture);
            setShowAddDialog(false);
            setSelectedId(fixture.id);
          }}
          onClose={() => setShowAddDialog(false)}
        />
      )}
    </div>
  );
}

/* --- Prop shape on the canvas --- */
function PropShape({
  fixture,
  isSelected,
  onMouseDown,
}: {
  fixture: Fixture;
  isSelected: boolean;
  onMouseDown: (e: React.MouseEvent) => void;
}) {
  const defaults = PROP_DEFAULTS[fixture.kind] || { w: 40, h: 40, cx: 360, cy: 210 };
  const cx = fixture.layout?.points[0]?.x ?? defaults.cx;
  const cy = fixture.layout?.points[0]?.y ?? defaults.cy;
  const w = defaults.w;
  const h = defaults.h;

  const color = isSelected ? "oklch(62% 0.16 210)" : "oklch(55% 0.14 210)";
  const fillOpacity = isSelected ? 0.2 : 0.08;

  return (
    <g data-prop={fixture.id} onMouseDown={onMouseDown} style={{ cursor: "grab" }}>
      {/* Hit area */}
      <rect x={cx - w / 2 - 6} y={cy - h / 2 - 6} width={w + 12} height={h + 12} fill="transparent" />

      {/* Shape */}
      {fixture.kind === "roofline" && (
        <>
          <line x1={cx - w / 2} y1={cy} x2={cx + w / 2} y2={cy}
            stroke={color} strokeWidth={isSelected ? 4 : 3} strokeLinecap="round" />
          {Array.from({ length: 12 }).map((_, i) => (
            <circle key={i} cx={cx - w / 2 + (w / 11) * i} cy={cy} r={2.5} fill={color} opacity={0.6} />
          ))}
        </>
      )}
      {fixture.kind === "window-outline" && (
        <rect x={cx - w / 2} y={cy - h / 2} width={w} height={h} rx={3}
          fill={color} fillOpacity={fillOpacity} stroke={color} strokeWidth={isSelected ? 2.5 : 1.5} />
      )}
      {fixture.kind === "mega-tree" && (
        <>
          <polygon points={`${cx},${cy - h / 2} ${cx - w / 2},${cy + h * 0.35} ${cx + w / 2},${cy + h * 0.35}`}
            fill={color} fillOpacity={fillOpacity} stroke={color} strokeWidth={isSelected ? 2.5 : 1.5} strokeLinejoin="round" />
          <rect x={cx - 5} y={cy + h * 0.35} width={10} height={h * 0.15} fill={color} fillOpacity={0.2} stroke={color} strokeWidth={1} />
        </>
      )}
      {fixture.kind === "mini-tree" && (
        <>
          <polygon points={`${cx},${cy - h / 2} ${cx - w / 2},${cy + h * 0.35} ${cx + w / 2},${cy + h * 0.35}`}
            fill={color} fillOpacity={fillOpacity} stroke={color} strokeWidth={isSelected ? 2.5 : 1.5} strokeLinejoin="round" />
          <rect x={cx - 4} y={cy + h * 0.35} width={8} height={h * 0.15} fill={color} fillOpacity={0.2} stroke={color} strokeWidth={1} />
        </>
      )}
      {fixture.kind === "arch" && (
        <path d={`M ${cx - w / 2} ${cy + h / 2} Q ${cx} ${cy - h / 2} ${cx + w / 2} ${cy + h / 2}`}
          fill={color} fillOpacity={fillOpacity} stroke={color} strokeWidth={isSelected ? 2.5 : 1.5} />
      )}
      {fixture.kind === "bush" && (
        <ellipse cx={cx} cy={cy} rx={w / 2} ry={h / 2}
          fill={color} fillOpacity={fillOpacity} stroke={color} strokeWidth={isSelected ? 2.5 : 1.5} />
      )}
      {fixture.kind === "matrix" && (
        <>
          <rect x={cx - w / 2} y={cy - h / 2} width={w} height={h} rx={2}
            fill={color} fillOpacity={fillOpacity} stroke={color} strokeWidth={isSelected ? 2.5 : 1.5} />
          {Array.from({ length: 3 }).map((_, r) =>
            Array.from({ length: 5 }).map((_, c) => (
              <circle key={`${r}-${c}`} cx={cx - w / 2 + w * (c + 0.5) / 5} cy={cy - h / 2 + h * (r + 0.5) / 3} r={1.5} fill={color} opacity={0.5} />
            ))
          )}
        </>
      )}

      {/* Selection ring */}
      {isSelected && (
        <rect x={cx - w / 2 - 4} y={cy - h / 2 - 4} width={w + 8} height={h + 8} rx={6}
          fill="none" stroke={color} strokeWidth={1} strokeDasharray="4 3" opacity={0.5} />
      )}

      {/* Label */}
      <text x={cx} y={cy - h / 2 - 8} textAnchor="middle" fontSize="10" fontWeight="600"
        fill={color} style={{ pointerEvents: "none" }}>
        {fixture.name}
      </text>
    </g>
  );
}

/* --- Add Prop Dialog --- */
function AddPropDialog({
  fixtures,
  onAdd,
  onClose,
}: {
  fixtures: Fixture[];
  onAdd: (fixture: Fixture) => void;
  onClose: () => void;
}) {
  const [selectedKind, setSelectedKind] = useState<FixtureKind>("roofline");
  const [name, setName] = useState(() => autoName("roofline", fixtures));
  const [pixelCount, setPixelCount] = useState(FIXTURE_TEMPLATES[0].pixelCount);

  const handleKindChange = (kind: FixtureKind) => {
    setSelectedKind(kind);
    const tmpl = FIXTURE_TEMPLATES.find((t) => t.kind === kind)!;
    setName(autoName(kind, fixtures));
    setPixelCount(tmpl.pixelCount);
  };

  const handleSubmit = () => {
    const defaults = PROP_DEFAULTS[selectedKind] || { cx: 360, cy: 210 };
    const fixture: Fixture = {
      id: crypto.randomUUID(),
      kind: selectedKind,
      name,
      pixelCount,
      startChannel: nextStartChannel(fixtures),
      layout: { points: [{ x: defaults.cx, y: defaults.cy }], closed: false },
    };
    onAdd(fixture);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(248, 247, 244, 0.72)", backdropFilter: "blur(8px)" }}
      onClick={onClose}
    >
      <div
        className="rounded-xl overflow-hidden w-full max-w-sm"
        style={{ background: "#FFFFFF", border: "1px solid var(--line)", boxShadow: "var(--shadow-lg)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 pt-5 pb-3">
          <h3 className="text-sm font-semibold mb-3">Add Prop</h3>
          <div className="grid grid-cols-3 gap-1.5 mb-4">
            {FIXTURE_TEMPLATES.map((tmpl) => (
              <button
                key={tmpl.kind}
                onClick={() => handleKindChange(tmpl.kind)}
                className="flex flex-col items-center gap-1.5 p-3 rounded-lg text-xs transition-colors"
                style={{
                  border: selectedKind === tmpl.kind ? "1.5px solid var(--accent)" : "1px solid var(--line)",
                  background: selectedKind === tmpl.kind ? "var(--accent-50)" : "#FFFFFF",
                }}
              >
                <PropTypeIcon kind={tmpl.kind} selected={selectedKind === tmpl.kind} />
                <span className="font-medium truncate w-full text-center" style={{ fontSize: 10 }}>{tmpl.name}</span>
              </button>
            ))}
          </div>
          <div className="flex flex-col gap-2.5">
            <div>
              <label className="text-xs mb-1 block" style={{ color: "var(--ink-3)" }}>Name</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)}
                className="w-full h-8 px-3 rounded-md text-sm"
                style={{ border: "1px solid var(--line)", background: "#fafafa" }} />
            </div>
            <div>
              <label className="text-xs mb-1 block" style={{ color: "var(--ink-3)" }}>Pixel count</label>
              <input type="number" value={pixelCount} onChange={(e) => setPixelCount(parseInt(e.target.value) || 1)}
                className="w-full h-8 px-3 rounded-md text-sm"
                style={{ border: "1px solid var(--line)", background: "#fafafa" }} />
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2 px-5 py-3" style={{ borderTop: "1px solid var(--line)", background: "#fafafa" }}>
          <button onClick={onClose} className="h-8 px-4 rounded-md text-xs font-medium"
            style={{ border: "1px solid var(--line)", background: "#FFFFFF", color: "var(--ink)" }}>
            Cancel
          </button>
          <button onClick={handleSubmit} className="h-8 px-4 rounded-md text-xs font-medium"
            style={{ background: "var(--accent)", color: "#fff", border: "1px solid var(--accent)" }}>
            Add Prop
          </button>
        </div>
      </div>
    </div>
  );
}

function PropTypeIcon({ kind, selected }: { kind: string; selected: boolean }) {
  const color = selected ? "#fff" : "var(--accent-ink)";
  const bg = selected ? "var(--accent)" : "var(--accent-50)";
  return (
    <div className="w-7 h-7 rounded-md flex items-center justify-center shrink-0" style={{ background: bg }}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        {kind === "roofline" && <line x1="2" y1="12" x2="22" y2="12" />}
        {kind === "window-outline" && <rect x="4" y="6" width="16" height="12" rx="1" />}
        {kind === "mega-tree" && <><polygon points="12,2 3,18 21,18" /><line x1="12" y1="18" x2="12" y2="22" /></>}
        {kind === "mini-tree" && <><polygon points="12,4 5,17 19,17" /><line x1="12" y1="17" x2="12" y2="21" /></>}
        {kind === "arch" && <path d="M4 20 Q12 2 20 20" />}
        {kind === "bush" && <ellipse cx="12" cy="13" rx="9" ry="6" />}
        {kind === "matrix" && <><rect x="3" y="5" width="18" height="14" rx="1" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="12" y1="5" x2="12" y2="19" /></>}
      </svg>
    </div>
  );
}

"use client";

import { useState, useCallback, useRef, useMemo } from "react";
import { useEditorStore } from "@/lib/store/editor-store";
import type { Fixture, FixtureKind } from "@/lib/fixtures/types";
import { FIXTURE_TEMPLATES, nextStartChannel, autoName } from "@/lib/fixtures/library";
import { PROP_SIZES } from "@/lib/fixtures/prop-sizes";
import House from "@/components/editor/house";

// Each prop kind has a default size (in SVG viewBox units out of 720x420)
const PROP_DEFAULTS = PROP_SIZES;

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

export default function LayoutEditor({
  nightPreview = false,
  showAddDialogExternal = false,
  onCloseAddDialog,
}: {
  nightPreview?: boolean;
  showAddDialogExternal?: boolean;
  onCloseAddDialog?: () => void;
}) {
  const fixtures = useEditorStore((s) => s.fixtures);
  const addFixture = useEditorStore((s) => s.addFixture);
  const updateFixture = useEditorStore((s) => s.updateFixture);
  const deleteFixture = useEditorStore((s) => s.deleteFixture);
  const houseCustomSvg = useEditorStore((s) => s.houseCustomSvg);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dragging, setDragging] = useState<{ id: string; startMX: number; startMY: number; origX: number; origY: number } | null>(null);
  const [showAddDialogInternal, setShowAddDialogInternal] = useState(false);
  const showAddDialog = showAddDialogInternal || showAddDialogExternal;
  const [searchQuery, setSearchQuery] = useState("");
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set());
  const [leftTab, setLeftTab] = useState<"props" | "layers">("props");
  const [inspectorTab, setInspectorTab] = useState<"properties" | "mapping" | "channels" | "preview">("properties");
  const svgRef = useRef<SVGSVGElement>(null);

  const toggleVisibility = useCallback((id: string) => {
    setHiddenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

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
      {/* Left panel — Props / Layers */}
      <div
        className="shrink-0 flex flex-col overflow-hidden"
        style={{ width: 260, background: "#FFFFFF", borderRight: "1px solid var(--line)" }}
      >
        {/* Header with tabs */}
        <div className="px-3 pt-3 pb-0" style={{ borderBottom: "1px solid var(--line)" }}>
          <div className="flex items-center gap-0 mb-2">
            <button
              onClick={() => setLeftTab("props")}
              className="px-3 py-1 text-xs font-semibold uppercase tracking-wide rounded-md transition-colors"
              style={{
                letterSpacing: "0.06em",
                fontSize: 11,
                color: leftTab === "props" ? "var(--ink)" : "var(--ink-4)",
                background: leftTab === "props" ? "var(--panel)" : "transparent",
              }}
            >
              Props
            </button>
            <button
              onClick={() => setLeftTab("layers")}
              className="px-3 py-1 text-xs font-semibold uppercase tracking-wide rounded-md transition-colors"
              style={{
                letterSpacing: "0.06em",
                fontSize: 11,
                color: leftTab === "layers" ? "var(--ink)" : "var(--ink-4)",
                background: leftTab === "layers" ? "var(--panel)" : "transparent",
              }}
            >
              Layers
            </button>
          </div>
          <input
            type="text"
            placeholder="Search props..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-7 px-2.5 rounded-md text-xs mb-2.5"
            style={{ border: "1px solid var(--line)", background: "#fafafa", color: "var(--ink)" }}
          />
        </div>

        <div className="flex-1 overflow-y-auto">
          {KIND_CATEGORIES.map((cat) => {
            const catFixtures = filteredFixtures.filter((f) => (cat.kinds as string[]).includes(f.kind));
            if (catFixtures.length === 0 && searchQuery.trim()) return null;
            return (
              <div key={cat.label}>
                {/* Category header */}
                <div
                  className="flex items-center justify-between px-3 py-1.5"
                  style={{ background: "#fafafa", borderBottom: "1px solid var(--line)" }}
                >
                  <div className="flex items-center gap-1.5">
                    <CategoryIcon label={cat.label} />
                    <span
                      className="text-xs font-semibold uppercase tracking-wide"
                      style={{ color: "var(--ink-3)", letterSpacing: "0.06em", fontSize: 10 }}
                    >
                      {cat.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs" style={{ color: "var(--ink-4)", fontSize: 10 }}>
                      {catFixtures.length}
                    </span>
                  </div>
                </div>

                {/* Prop rows */}
                {catFixtures.map((f) => {
                  const isPlaced = !!(f.layout?.points.length);
                  const isHidden = hiddenIds.has(f.id);
                  return (
                    <button
                      key={f.id}
                      onClick={() => setSelectedId(f.id)}
                      className="w-full flex items-center gap-2 px-3 py-1.5 text-left text-xs transition-colors group"
                      style={{
                        background: f.id === selectedId ? "#f0f4ff" : "transparent",
                        borderBottom: "1px solid #f5f5f5",
                        opacity: isHidden ? 0.45 : 1,
                      }}
                      onMouseEnter={(e) => {
                        if (f.id !== selectedId) (e.currentTarget.style.background = "#f8f8f8");
                      }}
                      onMouseLeave={(e) => {
                        if (f.id !== selectedId) (e.currentTarget.style.background = "transparent");
                      }}
                    >
                      {/* Status dot */}
                      <span
                        className="shrink-0 w-2 h-2 rounded-full"
                        title={isPlaced ? "Placed" : "Needs placement"}
                        style={{ background: isPlaced ? "#16a34a" : "#d97706" }}
                      />
                      {/* Name */}
                      <span
                        className="flex-1 truncate font-medium"
                        style={{ color: f.id === selectedId ? "var(--ink)" : "var(--ink-2)" }}
                      >
                        {f.name}
                      </span>
                      {/* Pixel count */}
                      <span className="shrink-0" style={{ color: "var(--ink-4)", fontSize: 10, fontVariantNumeric: "tabular-nums" }}>
                        {f.pixelCount}px
                      </span>
                      {/* Visibility toggle */}
                      <span
                        role="button"
                        tabIndex={-1}
                        className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                        style={{ color: isHidden ? "var(--ink-4)" : "var(--ink-3)" }}
                        onClick={(e) => { e.stopPropagation(); toggleVisibility(f.id); }}
                        onKeyDown={(e) => { if (e.key === "Enter") { e.stopPropagation(); toggleVisibility(f.id); } }}
                      >
                        {isHidden ? (
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="1" y1="1" x2="23" y2="23" />
                            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                            <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                          </svg>
                        ) : (
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                            <circle cx="12" cy="12" r="3" />
                          </svg>
                        )}
                      </span>
                    </button>
                  );
                })}

                {/* Per-group Add Prop */}
                <button
                  onClick={() => setShowAddDialogInternal(true)}
                  className="w-full flex items-center gap-1.5 px-3 py-1 text-left text-xs transition-colors hover:bg-[#f8f8f8]"
                  style={{ color: "var(--ink-4)", borderBottom: "1px solid #f0f0f0" }}
                >
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                  Add {cat.label === "Other" ? "Prop" : cat.label.replace(/s$/, "")}
                </button>
              </div>
            );
          })}
        </div>

        {/* Add prop button at bottom */}
        <div className="p-3 shrink-0" style={{ borderTop: "1px solid var(--line)" }}>
          <button
            onClick={() => setShowAddDialogInternal(true)}
            className="w-full flex items-center justify-center gap-1 h-7 rounded-md text-xs font-semibold"
            style={{ background: "#1e3a5f", color: "#fff" }}
          >
            + Add Prop
          </button>
        </div>
      </div>

      {/* Center — Canvas */}
      <div className="flex-1 relative overflow-hidden" style={{ background: nightPreview ? "#0c1222" : "#f5f4f0" }}>
        {/* House + interactive prop overlay */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div
            style={{
              position: "relative",
              borderRadius: 8,
              overflow: "hidden",
              boxShadow: nightPreview ? "0 8px 60px rgba(0,0,0,.5)" : "0 8px 40px rgba(20,22,28,.15)",
              border: nightPreview ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(0,0,0,0.06)",
            }}
          >
            {houseCustomSvg ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={houseCustomSvg}
                alt="Custom house"
                width={720}
                height={420}
                style={{
                  width: 720, height: 420, objectFit: "cover",
                  filter: nightPreview ? "brightness(0.25) saturate(0.4)" : "none",
                  transition: "filter 0.4s ease",
                }}
              />
            ) : (
              <div style={{ position: "relative" }}>
                <House width={720} height={420} id="layout-house" />
                {nightPreview && (
                  <div style={{
                    position: "absolute", inset: 0,
                    background: "rgba(8, 12, 30, 0.7)",
                    transition: "opacity 0.4s ease",
                  }} />
                )}
              </div>
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
              {/* Glow filter for night preview */}
              {nightPreview && (
                <defs>
                  <filter id="glow">
                    <feGaussianBlur stdDeviation="4" result="coloredBlur" />
                    <feMerge>
                      <feMergeNode in="coloredBlur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>
              )}
              {fixtures.filter((f) => !hiddenIds.has(f.id)).map((f) => (
                <PropShape
                  key={f.id}
                  fixture={f}
                  isSelected={f.id === selectedId}
                  nightMode={nightPreview}
                  onMouseDown={(e) => handlePropMouseDown(e, f.id)}
                />
              ))}
            </svg>
          </div>
        </div>

        {/* Floating canvas toolbar */}
        <div
          className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-px rounded-xl px-1 py-1"
          style={{
            background: "rgba(255,255,255,0.88)",
            backdropFilter: "blur(12px)",
            border: "1px solid rgba(0,0,0,0.08)",
            boxShadow: "0 4px 20px rgba(0,0,0,0.10)",
          }}
        >
          <CanvasToolBtn icon="select" label="Select" active />
          <CanvasToolBtn icon="draw" label="Draw" />
          <CanvasToolBtn icon="move" label="Move" />
          <CanvasToolBtn icon="resize" label="Resize" />
          <ToolbarDivider />
          <CanvasToolBtn icon="snap" label="Snap" />
          <CanvasToolBtn icon="fit" label="Fit" />
          <ToolbarDivider />
          <CanvasToolBtn icon="zoomOut" label="Zoom Out" />
          <span className="px-2 text-xs font-medium" style={{ color: "var(--ink-2)", fontVariantNumeric: "tabular-nums", minWidth: 36, textAlign: "center" }}>100%</span>
          <CanvasToolBtn icon="zoomIn" label="Zoom In" />
          <ToolbarDivider />
          <CanvasToolBtn icon="fullscreen" label="Fullscreen" />
        </div>
      </div>

      {/* Right panel — Inspector */}
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

      {/* Add Prop Dialog */}
      {showAddDialog && (
        <AddPropDialog
          fixtures={fixtures}
          onAdd={(fixture) => {
            addFixture(fixture);
            setShowAddDialogInternal(false);
            onCloseAddDialog?.();
            setSelectedId(fixture.id);
          }}
          onClose={() => { setShowAddDialogInternal(false); onCloseAddDialog?.(); }}
        />
      )}
    </div>
  );
}

/* --- Prop shape on the canvas --- */
function PropShape({
  fixture,
  isSelected,
  nightMode,
  onMouseDown,
}: {
  fixture: Fixture;
  isSelected: boolean;
  nightMode?: boolean;
  onMouseDown: (e: React.MouseEvent) => void;
}) {
  const defaults = PROP_DEFAULTS[fixture.kind] || { w: 40, h: 40, cx: 360, cy: 210 };
  const cx = fixture.layout?.points[0]?.x ?? defaults.cx;
  const cy = fixture.layout?.points[0]?.y ?? defaults.cy;
  const w = defaults.w;
  const h = defaults.h;

  // Night mode: warm white / colored glow; Day mode: blue outlines
  const nightColors: Record<string, string> = {
    roofline: "#fbbf24", "window-outline": "#fde68a", bush: "#86efac",
    "mega-tree": "#f87171", "mini-tree": "#34d399", arch: "#60a5fa",
    matrix: "#c084fc", custom: "#fbbf24",
  };
  const glowColor = nightColors[fixture.kind] || "#fbbf24";

  const stroke = nightMode ? glowColor : isSelected ? "#3b82f6" : "#64748b";
  const fill = nightMode ? glowColor : isSelected ? "#3b82f6" : "#94a3b8";
  const fillOpacity = nightMode ? 0.35 : isSelected ? 0.15 : 0.06;
  const strokeW = nightMode ? 3 : isSelected ? 2.5 : 1.5;
  const groupOpacity = nightMode ? 1 : isSelected ? 1 : 0.55;

  // Anchor node positions (corners of bounding box)
  const anchors = isSelected
    ? [
        { x: cx - w / 2, y: cy - h / 2 },
        { x: cx + w / 2, y: cy - h / 2 },
        { x: cx + w / 2, y: cy + h / 2 },
        { x: cx - w / 2, y: cy + h / 2 },
      ]
    : [];

  // Label pill dimensions
  const labelText = fixture.name;
  const labelW = labelText.length * 5.5 + 14;
  const labelH = 16;
  const labelX = cx - labelW / 2;
  const labelY = cy - h / 2 - 22;

  return (
    <g data-prop={fixture.id} onMouseDown={onMouseDown}
      style={{ cursor: "grab", opacity: groupOpacity, filter: nightMode ? "url(#glow)" : "none" }}>
      {/* Hit area */}
      <rect x={cx - w / 2 - 6} y={cy - h / 2 - 6} width={w + 12} height={h + 12} fill="transparent" />

      {/* Shape */}
      {fixture.kind === "roofline" && (
        <>
          <line x1={cx - w / 2} y1={cy} x2={cx + w / 2} y2={cy}
            stroke={stroke} strokeWidth={strokeW + 1} strokeLinecap="round" />
          {Array.from({ length: 12 }).map((_, i) => (
            <circle key={i} cx={cx - w / 2 + (w / 11) * i} cy={cy} r={isSelected ? 3 : 2} fill={fill} opacity={0.7} />
          ))}
        </>
      )}
      {fixture.kind === "window-outline" && (
        <rect x={cx - w / 2} y={cy - h / 2} width={w} height={h} rx={3}
          fill={fill} fillOpacity={fillOpacity} stroke={stroke} strokeWidth={strokeW} />
      )}
      {fixture.kind === "mega-tree" && (
        <>
          <polygon points={`${cx},${cy - h / 2} ${cx - w / 2},${cy + h * 0.35} ${cx + w / 2},${cy + h * 0.35}`}
            fill={fill} fillOpacity={fillOpacity} stroke={stroke} strokeWidth={strokeW} strokeLinejoin="round" />
          <rect x={cx - 5} y={cy + h * 0.35} width={10} height={h * 0.15} fill={fill} fillOpacity={0.15} stroke={stroke} strokeWidth={1} />
        </>
      )}
      {fixture.kind === "mini-tree" && (
        <>
          <polygon points={`${cx},${cy - h / 2} ${cx - w / 2},${cy + h * 0.35} ${cx + w / 2},${cy + h * 0.35}`}
            fill={fill} fillOpacity={fillOpacity} stroke={stroke} strokeWidth={strokeW} strokeLinejoin="round" />
          <rect x={cx - 4} y={cy + h * 0.35} width={8} height={h * 0.15} fill={fill} fillOpacity={0.15} stroke={stroke} strokeWidth={1} />
        </>
      )}
      {fixture.kind === "arch" && (
        <path d={`M ${cx - w / 2} ${cy + h / 2} Q ${cx} ${cy - h / 2} ${cx + w / 2} ${cy + h / 2}`}
          fill={fill} fillOpacity={fillOpacity} stroke={stroke} strokeWidth={strokeW} />
      )}
      {fixture.kind === "bush" && (
        <ellipse cx={cx} cy={cy} rx={w / 2} ry={h / 2}
          fill={fill} fillOpacity={fillOpacity} stroke={stroke} strokeWidth={strokeW} />
      )}
      {fixture.kind === "matrix" && (
        <>
          <rect x={cx - w / 2} y={cy - h / 2} width={w} height={h} rx={2}
            fill={fill} fillOpacity={fillOpacity} stroke={stroke} strokeWidth={strokeW} />
          {Array.from({ length: 3 }).map((_, r) =>
            Array.from({ length: 5 }).map((_, c) => (
              <circle key={`${r}-${c}`} cx={cx - w / 2 + w * (c + 0.5) / 5} cy={cy - h / 2 + h * (r + 0.5) / 3} r={1.5} fill={fill} opacity={0.4} />
            ))
          )}
        </>
      )}

      {/* Anchor nodes (selected only) */}
      {anchors.map((a, i) => (
        <g key={i}>
          <circle cx={a.x} cy={a.y} r={5} fill="#FFFFFF" stroke="#3b82f6" strokeWidth={2} />
        </g>
      ))}

      {/* Label pill */}
      <rect x={labelX} y={labelY} width={labelW} height={labelH} rx={8}
        fill={nightMode ? "rgba(0,0,0,0.6)" : isSelected ? "#3b82f6" : "#FFFFFF"}
        fillOpacity={nightMode ? 0.7 : isSelected ? 1 : 0.92}
        stroke={nightMode ? glowColor : isSelected ? "#3b82f6" : "#cbd5e1"}
        strokeWidth={nightMode ? 0.5 : isSelected ? 0 : 0.5} />
      <text x={cx} y={labelY + labelH / 2 + 3.5} textAnchor="middle" fontSize="9" fontWeight="600"
        fill={nightMode ? glowColor : isSelected ? "#FFFFFF" : "#475569"}
        style={{ pointerEvents: "none" }}>
        {labelText}
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
  const [step, setStep] = useState(1);
  const [selectedKind, setSelectedKind] = useState<FixtureKind>("roofline");
  const [name, setName] = useState(() => autoName("roofline", fixtures));
  const [pixelCount, setPixelCount] = useState(FIXTURE_TEMPLATES[0].pixelCount);
  const [group, setGroup] = useState("Rooflines");
  const [placement, setPlacement] = useState<"draw" | "ai" | "copy">("draw");

  const handleKindChange = (kind: FixtureKind) => {
    setSelectedKind(kind);
    const tmpl = FIXTURE_TEMPLATES.find((t) => t.kind === kind)!;
    setName(autoName(kind, fixtures));
    setPixelCount(tmpl.pixelCount);
    const cat = KIND_CATEGORIES.find((c) => (c.kinds as string[]).includes(kind));
    if (cat) setGroup(cat.label);
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
        className="rounded-xl overflow-hidden w-full max-w-md"
        style={{ background: "#FFFFFF", border: "1px solid var(--line)", boxShadow: "var(--shadow-lg)" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 pt-5 pb-3">
          <h3 className="text-sm font-semibold" style={{ color: "var(--ink)" }}>Add Prop</h3>
          <p className="text-xs mt-0.5" style={{ color: "var(--ink-3)" }}>
            {step === 1 ? "Choose the type of prop to add." : step === 2 ? "Set the basic details." : "How would you like to place it?"}
          </p>
          {/* Step indicator */}
          <div className="flex items-center gap-1.5 mt-3">
            {[1, 2, 3].map((s) => (
              <div key={s} className="h-1 flex-1 rounded-full transition-all"
                style={{ background: s <= step ? "#1e3a5f" : "#e5e7eb" }} />
            ))}
          </div>
        </div>

        {/* Step content */}
        <div className="px-6 pb-4">
          {step === 1 && (
            <div className="grid grid-cols-3 gap-2 mt-2">
              {FIXTURE_TEMPLATES.map((tmpl) => (
                <button
                  key={tmpl.kind}
                  onClick={() => handleKindChange(tmpl.kind)}
                  className="flex flex-col items-center gap-2 p-3 rounded-xl text-xs transition-all"
                  style={{
                    border: selectedKind === tmpl.kind ? "2px solid #1e3a5f" : "1px solid var(--line)",
                    background: selectedKind === tmpl.kind ? "#f0f4f8" : "#FFFFFF",
                  }}
                >
                  <PropTypeIcon kind={tmpl.kind} selected={selectedKind === tmpl.kind} />
                  <span className="font-medium truncate w-full text-center" style={{ fontSize: 10 }}>{tmpl.name}</span>
                </button>
              ))}
            </div>
          )}

          {step === 2 && (
            <div className="flex flex-col gap-3 mt-2">
              <div>
                <label className="text-xs mb-1 block font-medium" style={{ color: "var(--ink-2)" }}>Name</label>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg text-sm"
                  style={{ border: "1px solid var(--line)", background: "#fafafa" }} />
              </div>
              <div>
                <label className="text-xs mb-1 block font-medium" style={{ color: "var(--ink-2)" }}>Pixel Count</label>
                <input type="number" value={pixelCount} onChange={(e) => setPixelCount(parseInt(e.target.value) || 1)}
                  className="w-full h-9 px-3 rounded-lg text-sm"
                  style={{ border: "1px solid var(--line)", background: "#fafafa", fontVariantNumeric: "tabular-nums" }} />
              </div>
              <div>
                <label className="text-xs mb-1 block font-medium" style={{ color: "var(--ink-2)" }}>Group</label>
                <select value={group} onChange={(e) => setGroup(e.target.value)}
                  className="w-full h-9 px-2 rounded-lg text-sm"
                  style={{ border: "1px solid var(--line)", background: "#fafafa" }}>
                  {KIND_CATEGORIES.map((cat) => (
                    <option key={cat.label} value={cat.label}>{cat.label}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="flex flex-col gap-2 mt-2">
              {([
                { id: "draw" as const, label: "Draw manually", desc: "Place the prop on your house photo and draw its shape.", icon: <><path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5z" /></> },
                { id: "ai" as const, label: "Use AI detection", desc: "Let AI detect and place this prop type automatically.", icon: <><path d="M12 2a4 4 0 0 1 4 4c0 1.95-2 3-2 5h-4c0-2-2-3.05-2-5a4 4 0 0 1 4-4z" /><line x1="10" y1="14" x2="14" y2="14" /></>, coming: true },
                { id: "copy" as const, label: "Copy from existing", desc: "Duplicate an existing prop and adjust it.", icon: <><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></>, coming: true },
              ]).map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => !opt.coming && setPlacement(opt.id)}
                  className="flex items-start gap-3 p-3 rounded-xl text-left transition-all"
                  style={{
                    border: placement === opt.id && !opt.coming ? "2px solid #1e3a5f" : "1px solid var(--line)",
                    background: placement === opt.id && !opt.coming ? "#f0f4f8" : "#FFFFFF",
                    opacity: opt.coming ? 0.5 : 1,
                    cursor: opt.coming ? "default" : "pointer",
                  }}
                >
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: "#f0f4f8" }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#1e3a5f" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      {opt.icon}
                    </svg>
                  </div>
                  <div>
                    <div className="text-xs font-medium flex items-center gap-1.5" style={{ color: "var(--ink)" }}>
                      {opt.label}
                      {opt.coming && <span className="text-xs px-1.5 py-0.5 rounded-full" style={{ background: "#f0f0f0", color: "var(--ink-4)", fontSize: 9 }}>Coming soon</span>}
                    </div>
                    <div className="text-xs mt-0.5" style={{ color: "var(--ink-3)" }}>{opt.desc}</div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3" style={{ borderTop: "1px solid var(--line)", background: "#fafafa" }}>
          <div className="text-xs" style={{ color: "var(--ink-4)" }}>Step {step} of 3</div>
          <div className="flex gap-2">
            {step > 1 && (
              <button onClick={() => setStep(step - 1)} className="h-8 px-4 rounded-lg text-xs font-medium"
                style={{ border: "1px solid var(--line)", background: "#FFFFFF", color: "var(--ink)" }}>
                Back
              </button>
            )}
            {step === 1 && (
              <button onClick={onClose} className="h-8 px-4 rounded-lg text-xs font-medium"
                style={{ border: "1px solid var(--line)", background: "#FFFFFF", color: "var(--ink)" }}>
                Cancel
              </button>
            )}
            {step < 3 ? (
              <button onClick={() => setStep(step + 1)} className="h-8 px-4 rounded-lg text-xs font-semibold"
                style={{ background: "#1e3a5f", color: "#FFFFFF" }}>
                Next
              </button>
            ) : (
              <button onClick={handleSubmit} className="h-8 px-4 rounded-lg text-xs font-semibold"
                style={{ background: "#1e3a5f", color: "#FFFFFF" }}>
                Add Prop
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function InspectorField({ label, children, span2 }: { label: string; children: React.ReactNode; span2?: boolean }) {
  return (
    <div className={span2 ? "col-span-2" : ""}>
      <label className="text-xs mb-1 block" style={{ color: "var(--ink-3)" }}>{label}</label>
      {children}
    </div>
  );
}

const SUMMARY_ICONS: Record<string, React.ReactNode> = {
  props: <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /></>,
  channels: <><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></>,
  controller: <><rect x="2" y="2" width="20" height="8" rx="2" /><rect x="2" y="14" width="20" height="8" rx="2" /><line x1="6" y1="6" x2="6.01" y2="6" /><line x1="6" y1="18" x2="6.01" y2="18" /></>,
  ready: <><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></>,
};

function SummaryStatCard({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 p-2.5 rounded-lg" style={{ background: "#fafafa", border: "1px solid #f0f0f0" }}>
      <div className="flex items-center gap-1.5">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--ink-4)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          {SUMMARY_ICONS[icon]}
        </svg>
        <span className="text-xs" style={{ color: "var(--ink-3)" }}>{label}</span>
      </div>
      <span className="text-lg font-semibold" style={{ color: "var(--ink)", fontVariantNumeric: "tabular-nums" }}>{value}</span>
    </div>
  );
}

function CategoryIcon({ label }: { label: string }) {
  const c = "var(--ink-4)";
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {label === "Rooflines" && <><polyline points="3 17 12 8 21 17" /></>}
      {label === "Windows" && <rect x="4" y="6" width="16" height="12" rx="1" />}
      {label === "Trees" && <><polygon points="12,3 5,16 19,16" /><line x1="12" y1="16" x2="12" y2="21" /></>}
      {label === "Landscape" && <><ellipse cx="8" cy="15" rx="6" ry="4" /><ellipse cx="17" cy="14" rx="5" ry="3" /></>}
      {label === "Other" && <><circle cx="12" cy="12" r="3" /><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" /></>}
    </svg>
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

/* --- Canvas toolbar button --- */
const TOOLBAR_ICONS: Record<string, React.ReactNode> = {
  select: <><path d="M4 4l7 17 2.5-6.5L20 12z" /><line x1="15" y1="15" x2="20" y2="20" /></>,
  draw: <><path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5z" /></>,
  move: <><polyline points="5 9 2 12 5 15" /><polyline points="9 5 12 2 15 5" /><polyline points="15 19 12 22 9 19" /><polyline points="19 9 22 12 19 15" /><line x1="2" y1="12" x2="22" y2="12" /><line x1="12" y1="2" x2="12" y2="22" /></>,
  resize: <><polyline points="15 3 21 3 21 9" /><polyline points="9 21 3 21 3 15" /><line x1="21" y1="3" x2="14" y2="10" /><line x1="3" y1="21" x2="10" y2="14" /></>,
  snap: <><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /></>,
  fit: <><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" /></>,
  zoomIn: <><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /><line x1="11" y1="8" x2="11" y2="14" /><line x1="8" y1="11" x2="14" y2="11" /></>,
  zoomOut: <><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /><line x1="8" y1="11" x2="14" y2="11" /></>,
  fullscreen: <><polyline points="15 3 21 3 21 9" /><polyline points="9 21 3 21 3 15" /><polyline points="21 3 14 10" /><polyline points="3 21 10 14" /></>,
};

function CanvasToolBtn({ icon, label, active }: { icon: string; label: string; active?: boolean }) {
  return (
    <button
      title={label}
      className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors"
      style={{
        background: active ? "#1e3a5f" : "transparent",
        color: active ? "#FFFFFF" : "var(--ink-3)",
      }}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        {TOOLBAR_ICONS[icon]}
      </svg>
    </button>
  );
}

function ToolbarDivider() {
  return <div className="w-px h-5 mx-0.5" style={{ background: "rgba(0,0,0,0.08)" }} />;
}

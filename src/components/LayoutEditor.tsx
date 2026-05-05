"use client";

import { useState, useCallback, useRef } from "react";
import { useEditorStore } from "@/lib/store/editor-store";
import type { Fixture, FixtureKind } from "@/lib/fixtures/types";
import { FIXTURE_TEMPLATES, nextStartChannel, autoName } from "@/lib/fixtures/library";
import House from "@/components/editor/house";

// Each prop kind has a default size (in SVG viewBox units out of 720×420)
const PROP_DEFAULTS: Record<string, { w: number; h: number; cx: number; cy: number }> = {
  roofline:        { w: 380, h: 20, cx: 360, cy: 155 },
  "window-outline": { w: 44, h: 54, cx: 240, cy: 255 },
  bush:            { w: 56, h: 28, cx: 260, cy: 320 },
  "mega-tree":     { w: 64, h: 160, cx: 690, cy: 240 },
  "mini-tree":     { w: 36, h: 55, cx: 310, cy: 295 },
  arch:            { w: 80, h: 50, cx: 360, cy: 295 },
};

export default function LayoutEditor() {
  const fixtures = useEditorStore((s) => s.fixtures);
  const addFixture = useEditorStore((s) => s.addFixture);
  const updateFixture = useEditorStore((s) => s.updateFixture);
  const deleteFixture = useEditorStore((s) => s.deleteFixture);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dragging, setDragging] = useState<{ id: string; startMX: number; startMY: number; origX: number; origY: number } | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);

  const selected = fixtures.find((f) => f.id === selectedId) ?? null;

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

  return (
    <div className="flex-1 flex min-h-0">
      {/* Canvas */}
      <div className="flex-1 relative overflow-hidden" style={{ background: "linear-gradient(135deg, #f7f6f2, #ecebe6)" }}>
        {/* House + interactive prop overlay */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div style={{ position: "relative", borderRadius: 6, overflow: "hidden", boxShadow: "0 8px 40px rgba(20,22,28,.15)" }}>
            <House width={720} height={420} id="layout-house" />
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

      {/* Right panel — Properties */}
      <div
        className="flex flex-col shrink-0"
        style={{ width: 260, borderLeft: "1px solid var(--line)", background: "var(--surface)" }}
      >
        <div className="p-3.5 flex justify-between items-center" style={{ borderBottom: "1px solid var(--line)" }}>
          <div className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--ink-3)", letterSpacing: "0.06em" }}>
            Properties
          </div>
          <button
            onClick={() => setShowAddDialog(true)}
            className="inline-flex items-center gap-1 h-6 px-2 rounded text-xs font-medium"
            style={{ background: "var(--accent)", color: "#fff", border: "1px solid var(--accent)" }}
          >
            + Add Prop
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-3.5">
          {selected ? (
            <div className="flex flex-col gap-3">
              <input
                type="text"
                value={selected.name}
                onChange={(e) => updateFixture(selected.id, { name: e.target.value })}
                className="w-full h-8 px-2 rounded text-sm font-medium"
                style={{ border: "1px solid var(--line)", background: "var(--surface)" }}
              />
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs mb-1 block" style={{ color: "var(--ink-3)" }}>Pixels</label>
                  <input
                    type="number"
                    value={selected.pixelCount}
                    onChange={(e) => updateFixture(selected.id, { pixelCount: parseInt(e.target.value) || 1 })}
                    className="w-full h-7 px-2 rounded text-xs"
                    style={{ border: "1px solid var(--line)", background: "var(--surface)", fontVariantNumeric: "tabular-nums" }}
                  />
                </div>
                <div>
                  <label className="text-xs mb-1 block" style={{ color: "var(--ink-3)" }}>Universe</label>
                  <input
                    type="number"
                    value={selected.universe ?? 1}
                    onChange={(e) => updateFixture(selected.id, { universe: parseInt(e.target.value) || 1 })}
                    className="w-full h-7 px-2 rounded text-xs"
                    style={{ border: "1px solid var(--line)", background: "var(--surface)", fontVariantNumeric: "tabular-nums" }}
                  />
                </div>
                <div>
                  <label className="text-xs mb-1 block" style={{ color: "var(--ink-3)" }}>Start ch.</label>
                  <input
                    type="number"
                    value={selected.startChannel}
                    onChange={(e) => updateFixture(selected.id, { startChannel: parseInt(e.target.value) || 1 })}
                    className="w-full h-7 px-2 rounded text-xs"
                    style={{ border: "1px solid var(--line)", background: "var(--surface)", fontVariantNumeric: "tabular-nums" }}
                  />
                </div>
                <div>
                  <label className="text-xs mb-1 block" style={{ color: "var(--ink-3)" }}>Direction</label>
                  <select
                    value={selected.direction ?? "ltr"}
                    onChange={(e) => updateFixture(selected.id, { direction: e.target.value as "ltr" | "rtl" })}
                    className="w-full h-7 px-1.5 rounded text-xs"
                    style={{ border: "1px solid var(--line)", background: "var(--surface)" }}
                  >
                    <option value="ltr">L → R</option>
                    <option value="rtl">R → L</option>
                  </select>
                </div>
              </div>
              <button
                onClick={() => { deleteFixture(selected.id); setSelectedId(null); }}
                className="text-xs mt-2 text-left"
                style={{ color: "#b91c1c", opacity: 0.7, background: "none", border: "none", cursor: "pointer" }}
              >
                Delete prop
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="text-xs text-center" style={{ color: "var(--ink-4)" }}>
                Click a prop on the canvas to edit its properties
              </p>
            </div>
          )}
        </div>
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

/* ─── Prop shape on the canvas ────────────────────────────── */
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
  // Use stored position if available, otherwise use kind defaults
  const cx = fixture.layout?.points[0]?.x ?? defaults.cx;
  const cy = fixture.layout?.points[0]?.y ?? defaults.cy;
  const w = defaults.w;
  const h = defaults.h;

  const color = isSelected ? "oklch(62% 0.16 210)" : "oklch(55% 0.14 210)";
  const fillOpacity = isSelected ? 0.2 : 0.08;

  return (
    <g data-prop={fixture.id} onMouseDown={onMouseDown} style={{ cursor: "grab" }}>
      {/* Hit area (invisible wider target) */}
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

/* ─── Add Prop Dialog ────────────────────────────────────── */
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
        style={{ background: "var(--surface)", border: "1px solid var(--line)", boxShadow: "var(--shadow-lg)" }}
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
                  background: selectedKind === tmpl.kind ? "var(--accent-50)" : "var(--surface)",
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
                style={{ border: "1px solid var(--line)", background: "var(--surface)" }} />
            </div>
            <div>
              <label className="text-xs mb-1 block" style={{ color: "var(--ink-3)" }}>Pixel count</label>
              <input type="number" value={pixelCount} onChange={(e) => setPixelCount(parseInt(e.target.value) || 1)}
                className="w-full h-8 px-3 rounded-md text-sm"
                style={{ border: "1px solid var(--line)", background: "var(--surface)" }} />
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2 px-5 py-3" style={{ borderTop: "1px solid var(--line)", background: "var(--panel)" }}>
          <button onClick={onClose} className="h-8 px-4 rounded-md text-xs font-medium"
            style={{ border: "1px solid var(--line)", background: "var(--surface)", color: "var(--ink)" }}>
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
      </svg>
    </div>
  );
}

"use client";

import type { Fixture } from "@/lib/fixtures/types";
import { PROP_DEFAULTS } from "@/lib/fixtures/layout-constants";

/* --- Prop shape on the canvas --- */
export function PropShape({
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

export function InspectorField({ label, children, span2 }: { label: string; children: React.ReactNode; span2?: boolean }) {
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

export function SummaryStatCard({ icon, label, value }: { icon: string; label: string; value: string }) {
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

export function CategoryIcon({ label }: { label: string }) {
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

export function PropTypeIcon({ kind, selected }: { kind: string; selected: boolean }) {
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

export function CanvasToolBtn({ icon, label, active }: { icon: string; label: string; active?: boolean }) {
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

export function ToolbarDivider() {
  return <div className="w-px h-5 mx-0.5" style={{ background: "rgba(0,0,0,0.08)" }} />;
}

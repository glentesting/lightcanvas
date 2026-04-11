import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  getTemplate,
  GroundPlane,
  globalXFromHouseLocal,
  HouseTemplateDefs,
  HouseTemplateRenderer,
  HOUSE_TEMPLATES,
  HOUSE_TRANSFORM,
  NightSkyBackground,
  VB_H,
  VB_W,
  VB_X,
  VB_Y,
  type HouseTemplateId,
} from './HouseTemplates'

export type DisplayPropLike = {
  id: string | number
  name: string
  type?: string
  priority?: string
  notes?: string
  canvasX?: number
  canvasY?: number
  color?: string
  angle?: number
  length?: number
  houseType?: string
}

export type SequencePreviewOverlay = {
  currentTimeSec: number
  durationSec: number
  events: Array<{ propId: string; start: number; end: number; intensity: number }>
}

type HousePreviewSceneProps = {
  props: DisplayPropLike[]
  selectedPropId: string | number | null
  onSelectProp: (id: string | number) => void
  onPlaceProp?: (type: string, x: number, y: number, houseType: string, opts?: { angle?: number; length?: number }) => void
  onRemoveProp?: (id: string | number) => void
  onUpdatePropColor?: (id: string | number, color: string) => void
  onMoveProp?: (id: string | number, x: number, y: number) => void
  /** Read-only: hide placement toolbar and disable canvas interaction */
  previewOnly?: boolean
  /** Live sequence playback — boosts prop glow when events are active at currentTimeSec */
  sequencePreview?: SequencePreviewOverlay | null
  /** Controlled from app so Display Setup and Sequencing preview stay in sync */
  houseType?: HouseTemplateId
  onHouseTypeChange?: (id: HouseTemplateId) => void
}

// ---------------------------------------------------------------------------
// Color presets
// ---------------------------------------------------------------------------

export const COLOR_PRESETS = [
  { label: 'Warm White', color: '#ffe8c0' },
  { label: 'Cool White', color: '#e8f4ff' },
  { label: 'Red', color: '#ff2020' },
  { label: 'Green', color: '#20ff40' },
  { label: 'Blue', color: '#4080ff' },
  { label: 'Amber', color: '#ffaa00' },
  { label: 'Purple', color: '#aa40ff' },
  { label: 'Pink', color: '#ff40aa' },
  { label: 'Multi', color: 'linear-gradient(90deg,#ff0000,#ff8800,#ffff00,#00ff00,#0088ff,#8800ff)' },
]

// ---------------------------------------------------------------------------
// Zone helpers
// ---------------------------------------------------------------------------

function inferZone(prop: DisplayPropLike): string {
  const source = `${prop.name} ${prop.type || ''} ${prop.priority || ''}`.toLowerCase()
  if (source.includes('roof')) return 'roofline'
  if (source.includes('garage')) return 'garage'
  if (source.includes('matrix')) return 'upper-windows'
  if (source.includes('face') || source.includes('window')) return 'lower-windows'
  if (source.includes('tree')) return 'yard-right'
  if (source.includes('stake')) return 'yard-center'
  if (source.includes('arch')) return 'yard-left'
  return 'yard-center'
}

export function getPlacementZoneLabel(prop: DisplayPropLike): string {
  const key = inferZone(prop)
  const template = getTemplate('two-story')
  return template.zones.find((z) => z.key === key)?.label || 'Yard center'
}

// ---------------------------------------------------------------------------
// Placement tools
// ---------------------------------------------------------------------------

type PlacementToolId = 'roofline' | 'arch' | 'mini-tree' | 'mega-tree' | 'face' | 'stake' | 'matrix' | 'custom' | 'eraser'
interface PlacementToolDef { id: PlacementToolId; label: string; propType: string }

const PLACEMENT_TOOLS: PlacementToolDef[] = [
  { id: 'roofline', label: 'Roofline', propType: 'Roofline' },
  { id: 'arch', label: 'Arch', propType: 'Arches' },
  { id: 'mini-tree', label: 'Mini Tree', propType: 'Mini Tree' },
  { id: 'mega-tree', label: 'Mega Tree', propType: 'Mega Tree' },
  { id: 'face', label: 'Face', propType: 'Talking Face' },
  { id: 'stake', label: 'Stake', propType: 'Ground Stakes' },
  { id: 'matrix', label: 'Matrix', propType: 'Matrix' },
  { id: 'custom', label: '+ Custom', propType: 'Smart Pixel' },
  { id: 'eraser', label: 'Eraser', propType: '' },
]

function ToolIcon({ id }: { id: PlacementToolId }) {
  const s = '#a1a1aa'
  switch (id) {
    case 'roofline': return <svg viewBox="0 0 20 20" className="h-3.5 w-3.5"><line x1="2" y1="10" x2="18" y2="10" stroke={s} strokeWidth="1"/>{[4,8,12,16].map(cx=><circle key={cx} cx={cx} cy="10" r="1.8" fill={s}/>)}</svg>
    case 'arch': return <svg viewBox="0 0 20 20" className="h-3.5 w-3.5"><path d="M4 16 Q10 2 16 16" fill="none" stroke={s} strokeWidth="1.5"/></svg>
    case 'mini-tree': return <svg viewBox="0 0 20 20" className="h-3.5 w-3.5"><polygon points="10,4 6,14 14,14" fill="none" stroke={s} strokeWidth="1.2"/><line x1="10" y1="14" x2="10" y2="17" stroke={s} strokeWidth="1.2"/></svg>
    case 'mega-tree': return <svg viewBox="0 0 20 20" className="h-3.5 w-3.5"><polygon points="10,1 3,16 17,16" fill="none" stroke={s} strokeWidth="1.4"/><line x1="10" y1="16" x2="10" y2="19" stroke={s} strokeWidth="1.4"/></svg>
    case 'face': return <svg viewBox="0 0 20 20" className="h-3.5 w-3.5"><circle cx="10" cy="10" r="7" fill="none" stroke={s} strokeWidth="1.2"/><circle cx="7.5" cy="8" r="1" fill={s}/><circle cx="12.5" cy="8" r="1" fill={s}/><path d="M7 13 Q10 15.5 13 13" fill="none" stroke={s} strokeWidth="1"/></svg>
    case 'stake': return <svg viewBox="0 0 20 20" className="h-3.5 w-3.5"><line x1="10" y1="6" x2="10" y2="18" stroke={s} strokeWidth="1.5"/><circle cx="10" cy="5" r="2.5" fill={s}/></svg>
    case 'matrix': return <svg viewBox="0 0 20 20" className="h-3.5 w-3.5"><rect x="3" y="3" width="14" height="14" fill="none" stroke={s} strokeWidth="1"/>{[7,10,13].map(cy=>[7,10,13].map(cx=><circle key={`${cx}${cy}`} cx={cx} cy={cy} r="1" fill={s}/>))}</svg>
    case 'custom': return <svg viewBox="0 0 20 20" className="h-3.5 w-3.5"><line x1="10" y1="4" x2="10" y2="16" stroke={s} strokeWidth="1.5"/><line x1="4" y1="10" x2="16" y2="10" stroke={s} strokeWidth="1.5"/></svg>
    case 'eraser': return <svg viewBox="0 0 20 20" className="h-3.5 w-3.5"><rect x="4" y="8" width="12" height="8" rx="2" fill="none" stroke={s} strokeWidth="1.2"/><line x1="4" y1="12" x2="16" y2="12" stroke={s} strokeWidth="0.8"/></svg>
  }
}

// ---------------------------------------------------------------------------
// Glyph system
// ---------------------------------------------------------------------------

type GlyphKind = 'roofString' | 'window' | 'matrix' | 'megaTree' | 'miniTree' | 'stake' | 'arch' | 'face' | 'default'

function glyphKind(prop: DisplayPropLike): GlyphKind {
  const s = `${prop.name} ${prop.type || ''}`.toLowerCase()
  if (s.includes('roof')) return 'roofString'
  if (s.includes('matrix')) return 'matrix'
  if (s.includes('mega') && s.includes('tree')) return 'megaTree'
  if (s.includes('mini') || s.includes('ac traditional')) return 'miniTree'
  if (s.includes('tree')) return 'megaTree'
  if (s.includes('stake')) return 'stake'
  if (s.includes('arch')) return 'arch'
  if (s.includes('face')) return 'face'
  if (s.includes('window')) return 'window'
  return 'default'
}

type NodeState = 'idle' | 'hover' | 'selected'

/** Derive glow colors. When propColor is set, ALL states use it. */
function glowColor(state: NodeState, propColor?: string) {
  if (propColor) {
    // Always use the prop's own color — brightness varies via opacity
    return { core: '#ffffff', mid: propColor, outer: propColor }
  }
  // Fallback for legacy props without a color
  if (state === 'selected') return { core: '#ffffff', mid: '#fbbf24', outer: '#d97706' }
  if (state === 'hover') return { core: '#f0f9ff', mid: '#7dd3fc', outer: '#0ea5e9' }
  return { core: '#e0e8f0', mid: '#3b82f6', outer: '#1d4ed8' }
}

type GI = { coreOpacity: number; midOpacity: number; outerOpacity: number }

function glowIntensity(state: NodeState): GI {
  if (state === 'selected') return { coreOpacity: 1, midOpacity: 0.9, outerOpacity: 0.5 }
  if (state === 'hover') return { coreOpacity: 0.95, midOpacity: 0.75, outerOpacity: 0.4 }
  return { coreOpacity: 0.8, midOpacity: 0.6, outerOpacity: 0.25 }
}

function scaleGi(gi: GI, liveBoost: number): GI {
  const b = Math.min(1, Math.max(0, liveBoost))
  const f = 1 + b * 0.95
  return {
    coreOpacity: Math.min(1, gi.coreOpacity * f),
    midOpacity: Math.min(1, gi.midOpacity * f),
    outerOpacity: Math.min(1, gi.outerOpacity * (1 + b * 0.55)),
  }
}

function liveBoostForProp(
  propId: string | number,
  preview: SequencePreviewOverlay | null | undefined,
): number {
  if (!preview?.events?.length) return 0
  const t = preview.currentTimeSec
  let max = 0
  for (const ev of preview.events) {
    if (String(ev.propId) !== String(propId)) continue
    if (t >= ev.start && t < ev.end) max = Math.max(max, ev.intensity)
  }
  return max / 100
}

// No SVG glow filters — lights render as clean dots

// --- Glyph helpers ---
type GC = { core: string; mid: string; outer: string }
function dot(x: number, y: number, gc: GC, gi: GI, r = 3) {
  return <g><circle cx={x} cy={y} r={r} fill={gc.mid} opacity={gi.midOpacity}/><circle cx={x} cy={y} r={r * 0.4} fill={gc.core} opacity={gi.coreOpacity}/></g>
}

// --- Glyphs ---

function RoofStringGlyph({ state, color, length: len, gi: giProp }: { state: NodeState; color?: string; length?: number; gi?: GI }) {
  const gc = glowColor(state, color), gi = giProp ?? glowIntensity(state)
  const half = len ? len / 2 : 56
  const count = Math.max(5, Math.round(half / 10))
  const bulbs: number[] = []
  for (let i = 0; i < count; i++) bulbs.push(-half + (i / (count - 1)) * half * 2)
  return (
    <g>
      <line x1={-half} y1="0" x2={half} y2="0" stroke={gc.mid} strokeWidth="0.5" opacity={gi.midOpacity * 0.25}/>
      {bulbs.map((bx, i) => <g key={i}>{dot(bx, 0, gc, gi, 2.5)}</g>)}
    </g>
  )
}

function StakeGlyph({ state, color, gi: giProp }: { state: NodeState; color?: string; gi?: GI }) {
  const gc = glowColor(state, color), gi = giProp ?? glowIntensity(state)
  return (
    <g>
      <line x1="0" y1="-16" x2="0" y2="16" stroke={gc.mid} strokeWidth="3" opacity={gi.midOpacity} strokeLinecap="round"/>
      <line x1="0" y1="-16" x2="0" y2="16" stroke={gc.core} strokeWidth="1.5" opacity={gi.coreOpacity} strokeLinecap="round"/>
    </g>
  )
}

function MegaTreeGlyph({ state, color, gi: giProp }: { state: NodeState; color?: string; gi?: GI }) {
  const gc = glowColor(state, color), gi = giProp ?? glowIntensity(state)
  const left: [number, number][] = [[-5,-42],[-12,-30],[-19,-18],[-26,-6],[-33,6]]
  const right: [number, number][] = [[5,-42],[12,-30],[19,-18],[26,-6],[33,6]]
  const rows: [number, number][] = [[-8,-18],[8,-18],[-14,-6],[0,-6],[14,-6],[-20,6],[0,6],[20,6]]
  return (
    <g>
      <polygon points="0,-48 -35,16 35,16" fill="none" stroke={gc.mid} strokeWidth="0.4" opacity={gi.midOpacity * 0.15}/>
      <line x1="0" y1="16" x2="0" y2="32" stroke={gc.mid} strokeWidth="1.5" opacity={gi.midOpacity * 0.2}/>
      {dot(0, -48, gc, gi, 5)}
      {left.map(([x, y], i) => <g key={`l${i}`}>{dot(x, y, gc, gi, 3)}</g>)}
      {right.map(([x, y], i) => <g key={`r${i}`}>{dot(x, y, gc, gi, 3)}</g>)}
      {rows.map(([x, y], i) => <g key={`m${i}`}>{dot(x, y, gc, gi, 2.5)}</g>)}
    </g>
  )
}

function MiniTreeGlyph({ state, color, gi: giProp }: { state: NodeState; color?: string; gi?: GI }) {
  const gc = glowColor(state, color), gi = giProp ?? glowIntensity(state)
  const left: [number, number][] = [[-4,-22],[-9,-12],[-16,-2]]
  const right: [number, number][] = [[4,-22],[9,-12],[16,-2]]
  const rows: [number, number][] = [[-5,-12],[5,-12],[0,-2]]
  return (
    <g>
      <polygon points="0,-28 -19,8 19,8" fill="none" stroke={gc.mid} strokeWidth="0.4" opacity={gi.midOpacity * 0.15}/>
      <line x1="0" y1="8" x2="0" y2="20" stroke={gc.mid} strokeWidth="1" opacity={gi.midOpacity * 0.2}/>
      {dot(0, -28, gc, gi, 3.5)}
      {left.map(([x, y], i) => <g key={`l${i}`}>{dot(x, y, gc, gi, 2.5)}</g>)}
      {right.map(([x, y], i) => <g key={`r${i}`}>{dot(x, y, gc, gi, 2.5)}</g>)}
      {rows.map(([x, y], i) => <g key={`m${i}`}>{dot(x, y, gc, gi, 2)}</g>)}
    </g>
  )
}

function FaceGlyph({ state, color, gi: giProp }: { state: NodeState; color?: string; gi?: GI }) {
  const gc = glowColor(state, color), gi = giProp ?? glowIntensity(state)
  const ring: [number, number][] = [[0,-14],[-7,-12],[-12,-6],[-12,2],[-9,9],[-4,13],[0,14],[4,13],[9,9],[12,2],[12,-6],[7,-12]]
  return (
    <g>
      {ring.map(([fx, fy], i) => <g key={i}>{dot(fx, fy, gc, gi, 2.5)}</g>)}
      {dot(-5, -4, gc, gi, 2)}
      {dot(5, -4, gc, gi, 2)}
      {[[-5, 5], [-2.5, 7], [0, 7.5], [2.5, 7], [5, 5]].map(([mx, my], i) => (
        <circle key={`m${i}`} cx={mx} cy={my} r="1" fill={gc.mid} opacity={gi.midOpacity * 0.8}/>
      ))}
    </g>
  )
}

function WindowGlyph({ state, color, gi: giProp }: { state: NodeState; color?: string; gi?: GI }) {
  const gc = glowColor(state, color), gi = giProp ?? glowIntensity(state)
  return (
    <g>
      <rect x="-14" y="-18" width="28" height="36" rx="1" fill={gc.mid} opacity={gi.midOpacity * 0.4}/>
      <rect x="-10" y="-14" width="20" height="28" rx="1" fill={gc.core} opacity={gi.coreOpacity * 0.25}/>
      <line x1="0" y1="-18" x2="0" y2="18" stroke={gc.core} strokeWidth="1" opacity={gi.coreOpacity * 0.5}/>
      <line x1="-14" y1="0" x2="14" y2="0" stroke={gc.core} strokeWidth="1" opacity={gi.coreOpacity * 0.5}/>
    </g>
  )
}

function MatrixGlyph({ state, color, gi: giProp }: { state: NodeState; color?: string; gi?: GI }) {
  const gc = glowColor(state, color), gi = giProp ?? glowIntensity(state)
  const dots2: [number, number][] = []
  for (let r = -2; r <= 2; r++) for (let c = -2; c <= 2; c++) dots2.push([c * 7, r * 7])
  return (
    <g>
      <rect x="-19" y="-19" width="38" height="38" rx="1" fill={gc.mid} opacity={gi.midOpacity * 0.08}/>
      {dots2.map(([dx, dy], i) => <g key={i}>{dot(dx, dy, gc, gi, 2)}</g>)}
    </g>
  )
}

function ArchGlyph({ state, color, gi: giProp }: { state: NodeState; color?: string; gi?: GI }) {
  const gc = glowColor(state, color), gi = giProp ?? glowIntensity(state)
  const pts: [number, number][] = [[-14,14],[-13,6],[-10,-1],[-5,-6],[0,-8],[5,-6],[10,-1],[13,6],[14,14]]
  return (
    <g>
      {pts.map(([ax, ay], i) => <g key={i}>{dot(ax, ay, gc, gi, 3)}</g>)}
    </g>
  )
}

function DefaultGlyph({ state, color, gi: giProp }: { state: NodeState; color?: string; gi?: GI }) {
  const gc = glowColor(state, color), gi = giProp ?? glowIntensity(state)
  return (
    <g>
      {dot(0, 0, gc, gi, 6)}
    </g>
  )
}

function PropGlyph({
  kind, state, color, length, liveBoost = 0,
}: { kind: GlyphKind; state: NodeState; color?: string; length?: number; liveBoost?: number }) {
  const gi = scaleGi(glowIntensity(state), liveBoost)
  switch (kind) {
    case 'roofString': return <RoofStringGlyph state={state} color={color} length={length} gi={gi}/>
    case 'window': return <WindowGlyph state={state} color={color} gi={gi}/>
    case 'matrix': return <MatrixGlyph state={state} color={color} gi={gi}/>
    case 'megaTree': return <MegaTreeGlyph state={state} color={color} gi={gi}/>
    case 'miniTree': return <MiniTreeGlyph state={state} color={color} gi={gi}/>
    case 'stake': return <StakeGlyph state={state} color={color} gi={gi}/>
    case 'arch': return <ArchGlyph state={state} color={color} gi={gi}/>
    case 'face': return <FaceGlyph state={state} color={color} gi={gi}/>
    default: return <DefaultGlyph state={state} color={color} gi={gi}/>
  }
}

// ---------------------------------------------------------------------------
// SVG coordinate conversion
// ---------------------------------------------------------------------------

function clientToSvg(svg: SVGSVGElement, clientX: number, clientY: number): { x: number; y: number } | null {
  const ctm = svg.getScreenCTM()
  if (!ctm) return null
  const inv = ctm.inverse()
  return { x: clientX * inv.a + clientY * inv.c + inv.e, y: clientX * inv.b + clientY * inv.d + inv.f }
}

// ---------------------------------------------------------------------------
// Toolbar
// ---------------------------------------------------------------------------

function hslToHex(h: number): string {
  const s = 1, l = 0.6
  const a = s * Math.min(l, 1 - l)
  const f = (n: number) => { const k = (n + h / 30) % 12; return Math.round(255 * (l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)))) }
  return `#${[f(0), f(8), f(4)].map(v => v.toString(16).padStart(2, '0')).join('')}`
}

function SceneToolbar({ houseType, setHouseType, activeTool, setActiveTool, selectedProp, onUpdateColor }: {
  houseType: HouseTemplateId; setHouseType: (id: HouseTemplateId) => void
  activeTool: PlacementToolId | null; setActiveTool: (id: PlacementToolId | null) => void
  selectedProp: DisplayPropLike | null
  onUpdateColor?: (id: string | number, color: string) => void
}) {
  const [showComingSoon, setShowComingSoon] = useState(false)
  const [hue, setHue] = useState(30)

  return (
    <div className="px-4 py-3">
      {/* Row 1: House style + color picker */}
      <div className="flex flex-wrap items-center gap-2 py-1.5">
        <span className="mr-1 text-xs font-medium uppercase tracking-wider text-zinc-400">House</span>
        {HOUSE_TEMPLATES.map((t) => (
          <button key={t.id} type="button" onClick={() => setHouseType(t.id)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${houseType === t.id ? 'bg-zinc-700 text-zinc-100' : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'}`}>{t.label}</button>
        ))}
        <button type="button" onClick={() => setShowComingSoon(true)} onMouseLeave={() => setShowComingSoon(false)}
          className="rounded-lg px-3 py-1.5 text-sm font-medium text-zinc-300 transition hover:bg-zinc-800 hover:text-zinc-100">
          {showComingSoon ? 'Coming soon' : 'Upload Photo'}</button>

        {/* Inline color picker — right of Upload Photo, only when prop selected */}
        {selectedProp && onUpdateColor && (
          <div className="ml-2 flex items-center gap-2 border-l border-zinc-700 pl-3">
            <span className="text-xs font-medium text-zinc-400">Color:</span>
            {COLOR_PRESETS.map((preset) => (
              <button key={preset.label} type="button" title={preset.label}
                onClick={() => onUpdateColor(selectedProp.id, preset.color.startsWith('#') ? preset.color : '#ff3388')}
                className={`h-4 w-4 shrink-0 rounded-full border transition ${
                  selectedProp.color === preset.color || (preset.label === 'Multi' && selectedProp.color === '#ff3388')
                    ? 'border-white' : 'border-zinc-500 hover:border-zinc-300'}`}
                style={preset.color.startsWith('#') ? { backgroundColor: preset.color } : { background: preset.color }} />
            ))}
            <input type="range" min="0" max="360" step="1" value={hue}
              onChange={(e) => { const h = Number(e.target.value); setHue(h); onUpdateColor(selectedProp.id, hslToHex(h)) }}
              className="h-1.5 w-16 cursor-pointer appearance-none rounded-full xl:w-24"
              style={{ background: 'linear-gradient(to right,#ff0000,#ffff00,#00ff00,#00ffff,#0000ff,#ff00ff,#ff0000)' }} />
          </div>
        )}
      </div>

      {/* Row 2: Prop tools */}
      <div className="mt-1 flex flex-wrap items-center gap-2 border-t border-zinc-800/70 pt-2">
        <span className="mr-1 text-xs font-medium uppercase tracking-wider text-zinc-400">Tools</span>
        {PLACEMENT_TOOLS.map((tool) => (
          <button key={tool.id} type="button" title={tool.label}
            onClick={() => setActiveTool(activeTool === tool.id ? null : tool.id)}
            className={`flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-sm font-medium transition ${
              activeTool === tool.id ? (tool.id === 'eraser' ? 'bg-brand-red text-white' : 'bg-brand-green text-white') : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'}`}>
            <ToolIcon id={tool.id}/><span className="hidden xl:inline">{tool.label}</span>
          </button>
        ))}
      </div>

      {/* Status bar */}
      {(selectedProp || activeTool) && (
        <div className="flex items-center gap-2 border-t border-zinc-700 pt-2 text-xs text-zinc-400">
          {activeTool && <span>Tool: <strong className="text-zinc-100">{PLACEMENT_TOOLS.find(t => t.id === activeTool)?.label}</strong>{activeTool === 'roofline' ? ' — drag to set direction' : activeTool === 'eraser' ? ' — click prop to remove' : ' — click to place'}</span>}
          {selectedProp && !activeTool && (
            <span className="flex items-center gap-1.5">
              Selected: <strong className="text-zinc-100">{selectedProp.name}</strong>
              {selectedProp.color && <span className="inline-block h-2.5 w-2.5 rounded-full border border-zinc-500" style={{ backgroundColor: selectedProp.color }}/>}
              <span className="text-zinc-500">Drag to move · Delete to remove</span>
            </span>
          )}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function HousePreviewScene({
  props,
  selectedPropId,
  onSelectProp,
  onPlaceProp,
  onRemoveProp,
  onUpdatePropColor,
  onMoveProp,
  previewOnly = false,
  sequencePreview = null,
  houseType: houseTypeProp,
  onHouseTypeChange,
}: HousePreviewSceneProps) {
  const [hoveredId, setHoveredId] = useState<string | number | null>(null)
  const [houseTypeLocal, setHouseTypeLocal] = useState<HouseTemplateId>('two-story')
  const houseType = houseTypeProp ?? houseTypeLocal
  const setHouseType = useCallback(
    (id: HouseTemplateId) => {
      onHouseTypeChange?.(id)
      if (houseTypeProp == null) setHouseTypeLocal(id)
    },
    [houseTypeProp, onHouseTypeChange],
  )
  const [activeTool, setActiveTool] = useState<PlacementToolId | null>(null)
  const [roofDrag, setRoofDrag] = useState<{ sx: number; sy: number; ex: number; ey: number } | null>(null)
  const [propDrag, setPropDrag] = useState<{ id: string | number; x: number; y: number } | null>(null)
  const roofDragRef = useRef(roofDrag)
  roofDragRef.current = roofDrag
  const propDragRef = useRef(propDrag)
  propDragRef.current = propDrag
  const svgRef = useRef<SVGSVGElement>(null)

  const template = getTemplate(houseType)
  const visibleProps = useMemo(
    () => props.filter((p) => !p.houseType || p.houseType === houseType),
    [props, houseType],
  )

  const selectedProp = visibleProps.find((p) => String(p.id) === String(selectedPropId)) ?? null

  const placed = useMemo(() => {
    // Only show props that have been explicitly placed on the canvas
    return visibleProps
      .filter((p) => p.canvasX != null && p.canvasY != null)
      .map((prop) => ({ prop, x: prop.canvasX!, y: prop.canvasY! }))
  }, [visibleProps])

  // Keyboard
  useEffect(() => {
    if (previewOnly) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        const tag = (e.target as HTMLElement)?.tagName?.toLowerCase()
        if (tag === 'input' || tag === 'textarea' || tag === 'select') return
        if (selectedPropId != null && onRemoveProp) {
          e.preventDefault()
          onRemoveProp(selectedPropId)
        }
      } else if (e.key === 'Escape') {
        setActiveTool(null)
        setRoofDrag(null)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [selectedPropId, onRemoveProp, previewOnly])

  // --- Pointer handlers ---

  const handlePointerDown = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
    if (!svgRef.current) return
    if (activeTool === 'roofline' && onPlaceProp) {
      const pt = clientToSvg(svgRef.current, e.clientX, e.clientY)
      if (!pt) return
      setRoofDrag({ sx: pt.x, sy: pt.y, ex: pt.x, ey: pt.y })
      svgRef.current.setPointerCapture(e.pointerId)
    }
  }, [activeTool, onPlaceProp])

  const handlePointerMove = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
    const rd = roofDragRef.current
    if (!rd || !svgRef.current) return
    const pt = clientToSvg(svgRef.current, e.clientX, e.clientY)
    if (!pt) return
    setRoofDrag((d) => d ? { ...d, ex: pt.x, ey: pt.y } : null)
  }, [])

  const handlePointerUp = useCallback(() => {
    const rd = roofDragRef.current
    if (rd && onPlaceProp) {
      const dx = rd.ex - rd.sx, dy = rd.ey - rd.sy
      const len = Math.sqrt(dx * dx + dy * dy)
      if (len >= 15) {
        const angle = Math.atan2(dy, dx) * (180 / Math.PI)
        onPlaceProp('Roofline', (rd.sx + rd.ex) / 2, (rd.sy + rd.ey) / 2, houseType, { angle, length: len })
      }
      setRoofDrag(null)
    }
  }, [onPlaceProp, houseType])

  const handleCanvasClick = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (!activeTool || activeTool === 'roofline' || activeTool === 'eraser' || !onPlaceProp || !svgRef.current) return
    const toolDef = PLACEMENT_TOOLS.find((t) => t.id === activeTool)
    if (!toolDef) return
    const pt = clientToSvg(svgRef.current, e.clientX, e.clientY)
    if (!pt) return
    onPlaceProp(toolDef.propType, Math.max(VB_X + 20, Math.min(VB_X + VB_W - 20, pt.x)), Math.max(VB_Y + 20, Math.min(VB_Y + VB_H - 20, pt.y)), houseType)
  }, [activeTool, onPlaceProp, houseType])

  // Start prop drag using window-level listeners for reliable tracking
  const startPropDrag = useCallback((propId: string | number, e: React.PointerEvent) => {
    if (activeTool || !svgRef.current || !onMoveProp) return
    const pt = clientToSvg(svgRef.current, e.clientX, e.clientY)
    if (!pt) return
    const d = { id: propId, x: pt.x, y: pt.y }
    propDragRef.current = d
    setPropDrag(d)

    const onMove = (ev: PointerEvent) => {
      if (!svgRef.current) return
      const p = clientToSvg(svgRef.current, ev.clientX, ev.clientY)
      if (!p) return
      const nd = { id: propId, x: p.x, y: p.y }
      propDragRef.current = nd
      setPropDrag(nd)
    }
    const onUp = () => {
      const pd = propDragRef.current
      if (pd && onMoveProp) {
        onMoveProp(pd.id, Math.max(VB_X + 20, Math.min(VB_X + VB_W - 20, pd.x)), Math.max(VB_Y + 20, Math.min(VB_Y + VB_H - 20, pd.y)))
      }
      propDragRef.current = null
      setPropDrag(null)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    e.preventDefault()
    e.stopPropagation()
  }, [activeTool, onMoveProp])

  const cursorStyle = previewOnly
    ? 'default'
    : activeTool === 'eraser'
      ? 'pointer'
      : activeTool
        ? 'crosshair'
        : propDrag
          ? 'grabbing'
          : 'default'

  return (
    <div className="w-full min-w-0 touch-manipulation select-none rounded-xl border border-zinc-800 bg-zinc-950">
      {!previewOnly ? (
        <SceneToolbar
          houseType={houseType}
          setHouseType={setHouseType}
          activeTool={activeTool}
          setActiveTool={setActiveTool}
          selectedProp={selectedProp}
          onUpdateColor={onUpdatePropColor}
        />
      ) : (
        <div className="border-b border-zinc-800 px-4 py-2.5 text-xs font-medium uppercase tracking-wider text-zinc-400">
          Live preview · props follow the current sequence
        </div>
      )}
      <svg
        ref={svgRef} viewBox={`${VB_X} ${VB_Y} ${VB_W} ${VB_H}`} preserveAspectRatio="xMidYMid meet"
        className="block h-[min(60vh,620px)] w-full"
        style={{ cursor: previewOnly ? 'default' : cursorStyle }}
        role="img" aria-label="House display visualizer"
        onPointerLeave={() => !previewOnly && setHoveredId(null)}
        onClick={previewOnly ? undefined : handleCanvasClick}
        onPointerDown={previewOnly ? undefined : handlePointerDown}
        onPointerMove={previewOnly ? undefined : handlePointerMove}
        onPointerUp={previewOnly ? undefined : handlePointerUp}
      >
        <HouseTemplateDefs/><NightSkyBackground/><GroundPlane driveway={template.driveway} walkwayDoorGlobalX={globalXFromHouseLocal(template.walkwayDoorCenterLocalX)} />
        <g transform={HOUSE_TRANSFORM}><HouseTemplateRenderer id={houseType}/></g>

        {/* Roofline drag preview */}
        {roofDrag && (() => {
          const dx = roofDrag.ex - roofDrag.sx, dy = roofDrag.ey - roofDrag.sy
          const len = Math.sqrt(dx * dx + dy * dy)
          const angle = Math.atan2(dy, dx) * (180 / Math.PI)
          return <g transform={`translate(${(roofDrag.sx + roofDrag.ex) / 2},${(roofDrag.sy + roofDrag.ey) / 2}) rotate(${angle})`} opacity="0.5" pointerEvents="none"><RoofStringGlyph state="selected" length={len}/></g>
        })()}

        {/* Props */}
        {placed.map(({ prop, x: baseX, y: baseY }) => {
          const isDragging = propDrag && propDrag.id === prop.id
          const x = isDragging ? propDrag.x : baseX
          const y = isDragging ? propDrag.y : baseY
          const isSel = String(prop.id) === String(selectedPropId)
          const isHov = String(prop.id) === String(hoveredId)
          const state: NodeState = isSel ? 'selected' : isHov ? 'hover' : 'idle'
          const kind = glyphKind(prop)
          const wideHit = kind === 'roofString'
          const labelColor = glowColor(state, prop.color)
          const angle = prop.angle ?? 0
          const liveBoost = liveBoostForProp(prop.id, sequencePreview)

          return (
            <g key={String(prop.id)}
              transform={`translate(${x},${y})${angle ? ` rotate(${angle})` : ''}`}
              style={{
                cursor: previewOnly
                  ? 'default'
                  : activeTool === 'eraser'
                    ? 'pointer'
                    : activeTool
                      ? 'crosshair'
                      : isDragging
                        ? 'grabbing'
                        : 'grab',
              }}
              onPointerEnter={() => !previewOnly && setHoveredId(prop.id)}
              onPointerDown={(e) => {
                if (previewOnly) return
                if (!activeTool) {
                  onSelectProp(prop.id)
                  startPropDrag(prop.id, e)
                }
              }}
              onClick={(e) => {
                if (previewOnly) return
                if (activeTool === 'eraser' && onRemoveProp) {
                  e.stopPropagation()
                  onRemoveProp(prop.id)
                } else if (!activeTool) e.stopPropagation()
              }}
            >
              {wideHit
                ? <ellipse rx={(prop.length ? prop.length / 2 : 68) + 10} ry="28" fill="transparent" pointerEvents={activeTool && activeTool !== 'eraser' ? 'none' : 'all'}/>
                : <circle r={kind === 'megaTree' ? 48 : 32} fill="transparent" pointerEvents={activeTool && activeTool !== 'eraser' ? 'none' : 'all'}/>}
              <g pointerEvents="none">
                <PropGlyph kind={kind} state={state} color={prop.color} length={prop.length} liveBoost={liveBoost} />
              </g>

              {/* Red X delete */}
              {!previewOnly && isSel && onRemoveProp && !activeTool && (
                <g transform={angle ? `rotate(${-angle}) translate(24,-24)` : 'translate(24,-24)'} style={{ cursor: 'pointer' }}
                  onClick={(e) => { e.stopPropagation(); onRemoveProp(prop.id) }} pointerEvents="all">
                  <circle r="9" fill="#dc2626" opacity="0.85"/>
                  <line x1="-3.5" y1="-3.5" x2="3.5" y2="3.5" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                  <line x1="3.5" y1="-3.5" x2="-3.5" y2="3.5" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                </g>
              )}

              <text y={kind === 'megaTree' ? 56 : kind === 'miniTree' ? 36 : 42} textAnchor="middle" fontSize="10.5"
                fill={labelColor.mid} fontWeight={isSel ? 600 : isHov ? 500 : 400}
                opacity={isSel ? 0.95 : isHov ? 0.8 : 0.55} pointerEvents="none"
                transform={angle ? `rotate(${-angle})` : undefined}
                style={{ textShadow: '0 0 8px rgba(0,0,0,0.95)' }}>{prop.name}</text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}

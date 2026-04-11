export type HouseTemplateId = 'two-story' | 'ranch' | 'craftsman'

export type HouseZone = {
  key: string
  label: string
  x: number
  y: number
  w: number
  h: number
}

export interface HouseTemplate {
  id: HouseTemplateId
  label: string
  zones: HouseZone[]
  driveway: { x: number; w: number }
  /** Door center X in pre-transform house coordinates (for front walkway) */
  walkwayDoorCenterLocalX: number
}

// The house group is rendered at 65% scale, translated to sit back on the lot.
// Transform: translate(210,45) scale(0.65)
// Ground line at GROUND_Y ≈ 350. ViewBox starts at y=60 to crop dead sky.
export const HOUSE_TRANSFORM = 'translate(210,45) scale(0.65)'
export const GROUND_Y = 350

/** Map house-local X (pre-transform) to global viewBox X */
export function globalXFromHouseLocal(localX: number): number {
  return 210 + localX * 0.65
}

// ViewBox: crop sky so roofline is near the top with ~25px gap
export const VB_X = 0
export const VB_Y = 60
export const VB_W = 1200
export const VB_H = 540

// ---------------------------------------------------------------------------
// Zone definitions — coordinates in final canvas space (post-transform)
// ---------------------------------------------------------------------------

const TWO_STORY_ZONES: HouseZone[] = [
  { key: 'roofline', label: 'Roofline', x: 431, y: 97, w: 494, h: 39 },
  { key: 'upper-windows', label: 'Upper windows', x: 496, y: 175, w: 364, h: 59 },
  { key: 'lower-windows', label: 'Lower windows', x: 496, y: 260, w: 364, h: 55 },
  { key: 'garage', label: 'Garage', x: 262, y: 260, w: 195, h: 85 },
  { key: 'yard-left', label: 'Yard left', x: 40, y: 380, w: 350, h: 200 },
  { key: 'yard-center', label: 'Yard center', x: 410, y: 380, w: 370, h: 200 },
  { key: 'yard-right', label: 'Yard right', x: 800, y: 380, w: 350, h: 200 },
]

const RANCH_ZONES: HouseZone[] = [
  { key: 'roofline', label: 'Roofline', x: 262, y: 160, w: 676, h: 35 },
  { key: 'upper-windows', label: 'Windows left', x: 310, y: 255, w: 250, h: 40 },
  { key: 'lower-windows', label: 'Windows right', x: 640, y: 255, w: 250, h: 40 },
  { key: 'garage', label: 'Entry', x: 555, y: 255, w: 90, h: 60 },
  { key: 'yard-left', label: 'Yard left', x: 40, y: 380, w: 350, h: 200 },
  { key: 'yard-center', label: 'Yard center', x: 410, y: 380, w: 370, h: 200 },
  { key: 'yard-right', label: 'Yard right', x: 800, y: 380, w: 350, h: 200 },
]

const CRAFTSMAN_ZONES: HouseZone[] = [
  { key: 'roofline', label: 'Roofline', x: 220, y: 95, w: 760, h: 95 },
  { key: 'upper-windows', label: 'Porch gable', x: 380, y: 168, w: 440, h: 48 },
  { key: 'lower-windows', label: 'Lower windows', x: 240, y: 288, w: 560, h: 72 },
  { key: 'garage', label: 'Garage', x: 990, y: 268, w: 150, h: 185 },
  { key: 'yard-left', label: 'Yard left', x: 40, y: 380, w: 350, h: 200 },
  { key: 'yard-center', label: 'Yard center', x: 410, y: 380, w: 370, h: 200 },
  { key: 'yard-right', label: 'Yard right', x: 800, y: 380, w: 350, h: 200 },
]

// ---------------------------------------------------------------------------
// Template registry
// ---------------------------------------------------------------------------

export const HOUSE_TEMPLATES: HouseTemplate[] = [
  {
    id: 'two-story',
    label: 'Two-Story',
    zones: TWO_STORY_ZONES,
    driveway: { x: 268, w: 137 },
    walkwayDoorCenterLocalX: 629,
  },
  {
    id: 'ranch',
    label: 'Ranch',
    zones: RANCH_ZONES,
    driveway: { x: 0, w: 0 },
    walkwayDoorCenterLocalX: 600,
  },
  {
    id: 'craftsman',
    label: 'Craftsman',
    zones: CRAFTSMAN_ZONES,
    driveway: { x: 0, w: 0 },
    walkwayDoorCenterLocalX: 504,
  },
]

export function getTemplate(id: HouseTemplateId): HouseTemplate {
  return HOUSE_TEMPLATES.find((t) => t.id === id) ?? HOUSE_TEMPLATES[0]
}

function zoneKeyForPropType(type: string): string {
  const t = type.toLowerCase()
  if (t.includes('roof')) return 'roofline'
  if (t.includes('face') || t.includes('talking')) return 'lower-windows'
  if (t.includes('matrix')) return 'upper-windows'
  if (t.includes('garage')) return 'garage'
  if (t.includes('tree') && t.includes('mega')) return 'yard-right'
  if (t.includes('mini')) return 'yard-left'
  if (t.includes('arch')) return 'yard-left'
  if (t.includes('stake') || t.includes('ground')) return 'yard-center'
  return 'yard-center'
}

function zoneCenter(zone: HouseZone, index: number) {
  const narrow = zone.w < 360
  const columns = narrow ? 2 : 3
  const col = index % columns
  const row = Math.floor(index / columns)
  const gapX = zone.w / (columns + 1)
  const gapY = Math.max(28, Math.min(40, (zone.h - 28) / 2.2))
  return { x: zone.x + gapX * (col + 1), y: zone.y + 28 + row * gapY }
}

export function getDefaultCanvasPlacementForPropType(
  type: string,
  templateId: HouseTemplateId,
  slotIndex: number,
): { canvasX: number; canvasY: number; houseType: HouseTemplateId } {
  const template = getTemplate(templateId)
  const key = zoneKeyForPropType(type)
  const zone = template.zones.find((z) => z.key === key) ?? template.zones.find((z) => z.key === 'yard-center')!
  const { x, y } = zoneCenter(zone, slotIndex)
  return { canvasX: x, canvasY: y, houseType: templateId }
}

export function ensurePropCanvasPlacement(
  prop: { type: string; canvasX?: number; canvasY?: number; houseType?: string },
  templateId: HouseTemplateId,
  slotIndex: number,
): { canvasX: number; canvasY: number; houseType: HouseTemplateId } {
  if (prop.canvasX != null && prop.canvasY != null && prop.houseType) {
    return { canvasX: prop.canvasX, canvasY: prop.canvasY, houseType: prop.houseType as HouseTemplateId }
  }
  return getDefaultCanvasPlacementForPropType(prop.type, templateId, slotIndex)
}

// ---------------------------------------------------------------------------
// Shared SVG gradient defs
// ---------------------------------------------------------------------------

export function HouseTemplateDefs() {
  return (
    <defs>
      <linearGradient id="ht-night-sky" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#050a1e" />
        <stop offset="38%" stopColor="#0c1a3a" />
        <stop offset="78%" stopColor="#040810" />
        <stop offset="100%" stopColor="#010204" />
      </linearGradient>
      <pattern id="ht-siding-h" width="12" height="4" patternUnits="userSpaceOnUse">
        <rect width="12" height="4" fill="none" />
        <line x1="0" y1="3.2" x2="12" y2="3.2" stroke="#1a2238" strokeWidth="0.35" opacity="0.45" />
      </pattern>
      <pattern id="ht-siding-v" width="10" height="8" patternUnits="userSpaceOnUse">
        <line x1="2" y1="0" x2="2" y2="8" stroke="#1e2638" strokeWidth="0.45" opacity="0.4" />
      </pattern>
      <pattern id="ht-grass" width="6" height="10" patternUnits="userSpaceOnUse">
        <path d="M3 10 L3 4 M1.5 8 L3 3 L4.5 8" stroke="#0d1810" strokeWidth="0.35" fill="none" opacity="0.5" />
      </pattern>
      <linearGradient id="ht-wall" x1="0" y1="0" x2="1" y2="0.25">
        <stop offset="0%" stopColor="#222a42" />
        <stop offset="45%" stopColor="#171d32" />
        <stop offset="100%" stopColor="#0e1424" />
      </linearGradient>
      <linearGradient id="ht-wall-depth" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stopColor="#ffffff" stopOpacity="0.06" />
        <stop offset="50%" stopColor="#ffffff" stopOpacity="0" />
        <stop offset="100%" stopColor="#000000" stopOpacity="0.22" />
      </linearGradient>
      <linearGradient id="ht-wall-side" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stopColor="#111828" />
        <stop offset="100%" stopColor="#0e1422" />
      </linearGradient>
      <linearGradient id="ht-roof" x1="0" y1="0" x2="0.3" y2="1">
        <stop offset="0%" stopColor="#181e2e" />
        <stop offset="40%" stopColor="#121726" />
        <stop offset="100%" stopColor="#0d1220" />
      </linearGradient>
      <linearGradient id="ht-roof-left" x1="0" y1="0" x2="1" y2="0.5">
        <stop offset="0%" stopColor="#2c3854" />
        <stop offset="100%" stopColor="#151b2e" />
      </linearGradient>
      <linearGradient id="ht-roof-right" x1="1" y1="0" x2="0" y2="0.5">
        <stop offset="0%" stopColor="#1a2238" />
        <stop offset="100%" stopColor="#0a0e18" />
      </linearGradient>
      <linearGradient id="ht-roof-garage-l" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#283248" />
        <stop offset="100%" stopColor="#121826" />
      </linearGradient>
      <linearGradient id="ht-roof-garage-r" x1="1" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#1a2230" />
        <stop offset="100%" stopColor="#0c1018" />
      </linearGradient>
      <linearGradient id="ht-garage" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#141a2a" />
        <stop offset="100%" stopColor="#0e1320" />
      </linearGradient>
      <linearGradient id="ht-driveway" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#12161e" />
        <stop offset="100%" stopColor="#0c1018" />
      </linearGradient>
      <linearGradient id="ht-ground" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#0f2418" />
        <stop offset="35%" stopColor="#081a12" />
        <stop offset="85%" stopColor="#030806" />
        <stop offset="100%" stopColor="#010302" />
      </linearGradient>
      <radialGradient id="ht-yard-glow" cx="50%" cy="0%" r="78%">
        <stop offset="0%" stopColor="#2b3453" stopOpacity="0.32" />
        <stop offset="100%" stopColor="#0a0f18" stopOpacity="0" />
      </radialGradient>
      <linearGradient id="ht-stone" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#1e2438" />
        <stop offset="100%" stopColor="#151a2c" />
      </linearGradient>
      <linearGradient id="ht-foundation" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#111620" />
        <stop offset="100%" stopColor="#0c1018" />
      </linearGradient>
      <linearGradient id="ht-trim" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#232a40" />
        <stop offset="100%" stopColor="#1c2236" />
      </linearGradient>
      <filter id="ht-roof-shadow" x="-20%" y="-20%" width="140%" height="160%">
        <feDropShadow dx="0" dy="4" stdDeviation="3.2" floodColor="#05070e" floodOpacity="0.55" />
      </filter>
      <filter id="ht-soft-ground" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur in="SourceGraphic" stdDeviation="16" />
      </filter>
      <pattern id="ht-brick-walk" width="22" height="12" patternUnits="userSpaceOnUse">
        <rect width="22" height="12" fill="#0c0a08" />
        <rect x="1" y="1" width="9" height="4.5" fill="#241c18" stroke="#080605" strokeWidth="0.35" opacity="0.95" />
        <rect x="12" y="1" width="9" height="4.5" fill="#1e1814" stroke="#080605" strokeWidth="0.35" opacity="0.95" />
        <rect x="6" y="6.5" width="9" height="4.5" fill="#221a16" stroke="#080605" strokeWidth="0.35" opacity="0.95" />
        <rect x="17" y="6.5" width="9" height="4.5" fill="#261e1a" stroke="#080605" strokeWidth="0.35" opacity="0.95" />
      </pattern>
    </defs>
  )
}

// ---------------------------------------------------------------------------
// Night sky + ground plane (rendered outside house transform)
// ---------------------------------------------------------------------------

export function NightSkyBackground() {
  const stars = [
    [120, 95], [420, 78], [780, 102], [980, 88], [640, 118], [280, 108], [900, 72], [60, 118],
  ]

  return (
    <g pointerEvents="none">
      <rect x="0" y={VB_Y} width={VB_W} height={VB_H} fill="url(#ht-night-sky)" />
      {stars.map(([sx, sy], i) => (
        <circle key={i} cx={sx} cy={sy} r={0.45 + (i % 2) * 0.2} fill="#c8d8f8" opacity={0.14 + (i % 4) * 0.04} />
      ))}
    </g>
  )
}

export function GroundPlane({
  driveway,
  walkwayDoorGlobalX,
}: {
  driveway: { x: number; w: number }
  /** Door center X in same coordinate space as viewBox (global, not house-transformed) */
  walkwayDoorGlobalX: number
}) {
  const y0 = GROUND_Y
  const y1 = VB_Y + VB_H
  const cx = walkwayDoorGlobalX
  const wTop = 52
  const wBot = 124
  const walkPts = `${cx - wTop / 2},${y0} ${cx + wTop / 2},${y0} ${cx + wBot / 2},${y1} ${cx - wBot / 2},${y1}`

  return (
    <g pointerEvents="none">
      <rect x="0" y={GROUND_Y} width="1200" height={VB_Y + VB_H - GROUND_Y} fill="url(#ht-ground)" />
      <rect x="0" y={GROUND_Y} width="1200" height={VB_Y + VB_H - GROUND_Y} fill="url(#ht-grass)" opacity="0.28" />
      <ellipse cx="600" cy={GROUND_Y + 8} rx="420" ry="26" fill="#020308" opacity="0.45" filter="url(#ht-soft-ground)" />
      <ellipse cx="600" cy={GROUND_Y + 34} rx="430" ry="96" fill="url(#ht-yard-glow)" opacity="0.5" />
      <line x1="0" y1={GROUND_Y} x2="1200" y2={GROUND_Y} stroke="#0e1616" strokeWidth="0.8" />
      {/* Front walk — brick bond, trapezoid perspective */}
      <g opacity="0.9">
        <polygon points={walkPts} fill="url(#ht-brick-walk)" />
        <polygon points={walkPts} fill="none" stroke="#040302" strokeWidth="0.55" opacity="0.45" />
        <line x1={cx - wTop / 2} y1={y0} x2={cx - wBot / 2} y2={y1} stroke="#050403" strokeWidth="0.4" opacity="0.35" />
        <line x1={cx + wTop / 2} y1={y0} x2={cx + wBot / 2} y2={y1} stroke="#050403" strokeWidth="0.4" opacity="0.35" />
      </g>
      {driveway.w > 0 && (
        <>
          <rect x={driveway.x} y={GROUND_Y} width={driveway.w} height={VB_Y + VB_H - GROUND_Y} fill="url(#ht-driveway)" />
          <line x1={driveway.x} y1={GROUND_Y} x2={driveway.x} y2={VB_Y + VB_H} stroke="#1a1e28" strokeWidth="0.4" />
          <line x1={driveway.x + driveway.w} y1={GROUND_Y} x2={driveway.x + driveway.w} y2={VB_Y + VB_H} stroke="#1a1e28" strokeWidth="0.4" />
        </>
      )}
    </g>
  )
}

// ---------------------------------------------------------------------------
// Window helper
// ---------------------------------------------------------------------------

function WindowPane({
  x, y, w, h, mullionV = true, mullionH = true,
}: {
  x: number; y: number; w: number; h: number; mullionV?: boolean; mullionH?: boolean
}) {
  const edge = '#1a2038'
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} fill="#0a0e18" stroke={edge} strokeWidth="0.8" />
      <rect x={x + 1.5} y={y + 1.5} width={w - 3} height={h - 3} fill="#141c2a" opacity="0.42" />
      {mullionV && <line x1={x + w / 2} y1={y} x2={x + w / 2} y2={y + h} stroke={edge} strokeWidth="0.6" opacity="0.75" />}
      {mullionH && <line x1={x} y1={y + h / 2} x2={x + w} y2={y + h / 2} stroke={edge} strokeWidth="0.6" opacity="0.75" />}
    </g>
  )
}

// ---------------------------------------------------------------------------
// TWO-STORY (coordinates in original space — rendered inside scaled <g>)
// ---------------------------------------------------------------------------

export function TwoStoryHouse() {
  return (
    <g pointerEvents="none">
      <ellipse cx="655" cy="462" rx="380" ry="18" fill="#010205" opacity="0.4" filter="url(#ht-soft-ground)" />

      <rect x="60" y="458" width="250" height="14" fill="url(#ht-foundation)" />
      <rect x="360" y="458" width="680" height="14" fill="url(#ht-foundation)" />

      {/* Garage wing — separate volume */}
      <polygon points="55,285 190,220 190,285" fill="url(#ht-roof-garage-l)" stroke="#1a2036" strokeWidth="0.8" filter="url(#ht-roof-shadow)" />
      <polygon points="190,285 325,285 190,220" fill="url(#ht-roof-garage-r)" stroke="#1a2036" strokeWidth="0.8" filter="url(#ht-roof-shadow)" />
      <line x1="190" y1="220" x2="190" y2="285" stroke="#0a0e18" strokeWidth="0.9" opacity="0.55" />
      <rect x="60" y="285" width="260" height="175" fill="url(#ht-wall)" stroke="#1a2036" strokeWidth="0.8" />
      <rect x="60" y="285" width="260" height="175" fill="url(#ht-siding-v)" opacity="0.2" />
      <rect x="60" y="285" width="260" height="175" fill="url(#ht-wall-depth)" />
      <polygon points="235,285 320,285 320,460 210,460" fill="#0b1120" opacity="0.32" />
      <rect x="88" y="330" width="200" height="125" fill="url(#ht-garage)" stroke="#1c2238" strokeWidth="0.8" />
      {[0, 1, 2, 3].map((i) => (
        <line key={`gp${i}`} x1="96" y1={355 + i * 26} x2="280" y2={355 + i * 26} stroke="#1e2438" strokeWidth="0.5" opacity="0.5" />
      ))}
      <line x1="188" y1="335" x2="188" y2="450" stroke="#1e2438" strokeWidth="0.5" opacity="0.4" />

      {/* Main house — gable roof: lit left slope, shadow right slope, sharp ridge */}
      <polygon points="355,170 700,60 700,170" fill="url(#ht-roof-left)" stroke="#1a2036" strokeWidth="0.9" filter="url(#ht-roof-shadow)" />
      <polygon points="700,170 700,60 1045,170" fill="url(#ht-roof-right)" stroke="#1a2036" strokeWidth="0.9" filter="url(#ht-roof-shadow)" />
      <line x1="700" y1="58" x2="700" y2="172" stroke="#3d4a62" strokeWidth="1.4" opacity="0.75" />
      <line x1="500" y1="108" x2="900" y2="108" stroke="#2a3848" strokeWidth="0.5" opacity="0.35" />
      <rect x="360" y="170" width="680" height="150" fill="url(#ht-wall)" stroke="#1a2036" strokeWidth="0.8" />
      <rect x="360" y="170" width="680" height="150" fill="url(#ht-siding-v)" opacity="0.22" />
      <rect x="360" y="170" width="680" height="150" fill="url(#ht-wall-depth)" />
      <rect x="360" y="316" width="680" height="4" fill="url(#ht-trim)" />
      <rect x="360" y="320" width="680" height="140" fill="url(#ht-wall)" stroke="#1a2036" strokeWidth="0.8" />
      <rect x="360" y="320" width="680" height="140" fill="url(#ht-siding-v)" opacity="0.22" />
      <rect x="360" y="320" width="680" height="140" fill="url(#ht-wall-depth)" />
      <polygon points="940,170 1040,170 1040,460 900,460" fill="#0b1120" opacity="0.34" />

      <WindowPane x={452} y={198} w={78} h={74} />
      <WindowPane x={638} y={198} w={78} h={74} />
      <WindowPane x={824} y={198} w={78} h={74} />
      <WindowPane x={418} y={340} w={73} h={68} />
      <WindowPane x={741} y={340} w={73} h={68} />

      <rect x="605" y="345" width="48" height="88" fill="#0e1422" stroke="#1c2238" strokeWidth="0.8" />
      <line x1="629" y1="345" x2="629" y2="433" stroke="#1a2036" strokeWidth="0.5" opacity="0.5" />
      <circle cx="641" cy="394" r="1.5" fill="#2a3250" opacity="0.5" />
      <rect x="360" y="170" width="4" height="290" fill="url(#ht-trim)" opacity="0.4" />
      <rect x="1036" y="170" width="4" height="290" fill="url(#ht-trim)" opacity="0.4" />
    </g>
  )
}

// ---------------------------------------------------------------------------
// RANCH — single story, no garage, symmetrical windows
// ---------------------------------------------------------------------------

export function RanchHouse() {
  // Single-story ranch with hip roof, chimney, and carport — silhouette distinct from gable houses.
  // Hip roof ridge y=190, eave y=300, walls y=300-456, foundation y=456-470.
  // Carport extends left from x=20 to x=120. Chimney breaks roofline on right.
  // After transform: ridge 190*0.65+45=168.5, bottom 470*0.65+45=350.5 → matches GROUND_Y.
  return (
    <g pointerEvents="none">
      {/* Foundation — extends left for carport */}
      <rect x="20" y="456" width="1060" height="14" fill="url(#ht-foundation)" />

      {/* Carport — open lean-to on left side */}
      <polygon points="20,295 120,280 120,300 20,300" fill="url(#ht-roof)" stroke="#1a2036" strokeWidth="0.7" filter="url(#ht-roof-shadow)" />
      <line x1="20" y1="300" x2="120" y2="300" stroke="#1e2438" strokeWidth="0.5" />
      <rect x="28" y="300" width="6" height="156" fill="url(#ht-trim)" opacity="0.5" stroke="#1a2036" strokeWidth="0.4" />
      <rect x="74" y="300" width="6" height="156" fill="url(#ht-trim)" opacity="0.5" stroke="#1a2036" strokeWidth="0.4" />

      {/* Roof — hip (trapezoid), distinct from Two-Story and Craftsman gables */}
      <polygon points="80,300 320,190 880,190 1120,300" fill="url(#ht-roof)" stroke="#1a2036" strokeWidth="1" filter="url(#ht-roof-shadow)" />
      <line x1="320" y1="190" x2="880" y2="190" stroke="#222a42" strokeWidth="0.6" opacity="0.45" />
      <line x1="80" y1="300" x2="1120" y2="300" stroke="#1e2438" strokeWidth="0.6" />

      {/* Walls — single-story height */}
      <rect x="120" y="300" width="960" height="158" fill="url(#ht-wall)" stroke="#1a2036" strokeWidth="0.8" />
      <polygon points="940,300 1080,300 1080,458 885,458" fill="#0b1120" opacity="0.26" />

      {/* 4 symmetrical windows — ~35% larger for prop placement */}
      <WindowPane x={185} y={318} w={81} h={68} />
      <WindowPane x={350} y={318} w={81} h={68} />
      <WindowPane x={769} y={318} w={81} h={68} />
      <WindowPane x={934} y={318} w={81} h={68} />

      {/* Shutters on all 4 windows */}
      {[185, 350, 769, 934].map((wx) => (
        <g key={`sh${wx}`}>
          <rect x={wx - 8} y={316} width="5" height="72" fill="#111828" opacity="0.5" />
          <rect x={wx + 81} y={316} width="5" height="72" fill="#111828" opacity="0.5" />
        </g>
      ))}

      {/* Entry — centered with small overhang */}
      <rect x="555" y="295" width="90" height="6" fill="url(#ht-trim)" />
      <rect x="560" y="300" width="80" height="158" fill="url(#ht-wall-side)" stroke="#1a2036" strokeWidth="0.5" />
      <rect x="575" y="315" width="48" height="140" fill="#0e1422" stroke="#1c2238" strokeWidth="0.8" />
      <line x1="599" y1="315" x2="599" y2="455" stroke="#1a2036" strokeWidth="0.5" opacity="0.5" />
      <circle cx="613" cy="390" r="1.5" fill="#2a3250" opacity="0.5" />
      {/* Sidelights */}
      <rect x="563" y="320" width="9" height="50" fill="#0a0e18" stroke="#1a2038" strokeWidth="0.5" />
      <rect x="626" y="320" width="9" height="50" fill="#0a0e18" stroke="#1a2038" strokeWidth="0.5" />

      {/* Chimney — right side, breaks the roofline */}
      <rect x="920" y="158" width="30" height="142" fill="url(#ht-wall-side)" stroke="#1a2036" strokeWidth="0.7" />
      <rect x="916" y="153" width="38" height="8" fill="url(#ht-stone)" stroke="#1a2036" strokeWidth="0.5" />

      {/* Corner trim */}
      <rect x="120" y="300" width="3" height="158" fill="url(#ht-trim)" opacity="0.35" />
      <rect x="1077" y="300" width="3" height="158" fill="url(#ht-trim)" opacity="0.35" />
    </g>
  )
}

// ---------------------------------------------------------------------------
// CRAFTSMAN
// ---------------------------------------------------------------------------

export function CraftsmanHouse() {
  // Squat, wide Craftsman: low roof pitch, deep eaves + rafter tails, full front porch, tapered columns,
  // lap siding on body; board-and-batten suggestion on porch gable — visually distinct from tall Two-Story.
  return (
    <g pointerEvents="none">
      <ellipse cx="620" cy="468" rx="340" ry="16" fill="#010205" opacity="0.35" filter="url(#ht-soft-ground)" />

      <rect x="200" y="448" width="820" height="16" fill="url(#ht-foundation)" />

      {/* Garage wing — low, set back */}
      <polygon points="990,268 1060,235 1120,268" fill="url(#ht-roof-garage-l)" stroke="#1a2036" strokeWidth="0.7" filter="url(#ht-roof-shadow)" />
      <polygon points="1120,268 1180,268 1060,235" fill="url(#ht-roof-garage-r)" stroke="#1a2036" strokeWidth="0.7" filter="url(#ht-roof-shadow)" />
      <rect x="990" y="268" width="190" height="196" fill="url(#ht-wall-side)" stroke="#1a2036" strokeWidth="0.8" />
      <rect x="990" y="268" width="190" height="196" fill="url(#ht-siding-h)" opacity="0.18" />
      <rect x="1015" y="318" width="140" height="120" fill="url(#ht-garage)" stroke="#1c2238" strokeWidth="0.8" />
      {[0, 1, 2, 3].map((i) => (
        <line key={`cg${i}`} x1="1022" y1={332 + i * 26} x2="1148" y2={332 + i * 26} stroke="#1e2438" strokeWidth="0.45" opacity="0.4" />
      ))}
      <line x1="1085" y1="318" x2="1085" y2="432" stroke="#1e2438" strokeWidth="0.45" opacity="0.35" />

      {/* Main body — wide single story (horizontal massing) */}
      <rect x="200" y="275" width="780" height="175" fill="url(#ht-wall)" stroke="#1a2036" strokeWidth="0.85" />
      <rect x="200" y="275" width="780" height="175" fill="url(#ht-siding-h)" opacity="0.28" />
      <rect x="200" y="275" width="780" height="175" fill="url(#ht-wall-depth)" />
      <polygon points="900,275 990,275 990,450 820,450" fill="#0b1120" opacity="0.22" />

      {/* Low-pitch main roof + wide eaves */}
      <polygon points="160,275 600,118 1040,275" fill="url(#ht-roof-left)" stroke="#1a2036" strokeWidth="1" filter="url(#ht-roof-shadow)" />
      <line x1="600" y1="116" x2="600" y2="278" stroke="#3d4a62" strokeWidth="1.2" opacity="0.55" />
      <line x1="320" y1="195" x2="880" y2="195" stroke="#2a3848" strokeWidth="0.45" opacity="0.28" />

      {/* Exposed rafter tails under eave */}
      {Array.from({ length: 22 }, (_, i) => 175 + i * 38).map((rx) => (
        <line key={`rt${rx}`} x1={rx} y1="275" x2={rx} y2="283" stroke="#1e2840" strokeWidth="2.2" opacity="0.8" />
      ))}

      {/* Covered porch roof (shed) + board & batten gable face */}
      <polygon points="320,275 600,175 880,275" fill="url(#ht-roof-right)" stroke="#1a2036" strokeWidth="0.75" opacity="0.92" filter="url(#ht-roof-shadow)" />
      <line x1="320" y1="275" x2="880" y2="275" stroke="#1e2438" strokeWidth="0.6" />
      {[328, 356, 384, 412, 440, 468, 496, 524, 552, 580, 608, 636, 664, 692, 720, 748, 776, 804, 832, 860, 868].map((bx) => (
        <line key={`bb${bx}`} x1={bx} y1="218" x2={bx} y2="275" stroke="#141a2a" strokeWidth="1.1" opacity="0.38" />
      ))}

      {/* Tapered porch columns */}
      {[340, 440, 540, 640, 740, 840].map((cx) => (
        <g key={`col${cx}`}>
          <polygon
            points={`${cx - 14},448 ${cx + 14},448 ${cx + 9},278 ${cx - 9},278`}
            fill="url(#ht-trim)"
            stroke="#1a2036"
            strokeWidth="0.55"
          />
          <polygon points={`${cx - 10},448 ${cx + 10},448 ${cx + 7},285 ${cx - 7},285`} fill="#121826" opacity="0.55" />
          <rect x={cx - 16} y="436" width="32" height="14" fill="url(#ht-stone)" stroke="#1c2238" strokeWidth="0.45" />
        </g>
      ))}

      {/* Porch deck / rail */}
      <rect x="300" y="430" width="600" height="8" fill="#0e1420" stroke="#1a2036" strokeWidth="0.45" />
      <line x1="300" y1="430" x2="900" y2="430" stroke="#2a3048" strokeWidth="0.4" opacity="0.4" />

      {/* Windows — large, flanking entry (no glow) */}
      <WindowPane x={268} y={305} w={82} h={72} />
      <WindowPane x={738} y={305} w={82} h={72} />

      {/* Front door — center of porch; walkway aligns to this */}
      <rect x="480" y="292" width="48" height="118" fill="#0e1422" stroke="#1c2238" strokeWidth="0.85" />
      <line x1="504" y1="292" x2="504" y2="410" stroke="#1a2036" strokeWidth="0.45" opacity="0.45" />
      <circle cx="518" cy="352" r="1.6" fill="#2a3250" opacity="0.45" />
      <rect x="466" y="310" width="10" height="58" fill="#0a0e18" stroke="#1a2038" strokeWidth="0.45" />
      <rect x="532" y="310" width="10" height="58" fill="#0a0e18" stroke="#1a2038" strokeWidth="0.45" />

      {/* Small attic / transom in porch gable */}
      <WindowPane x={576} y={218} w={48} h={28} mullionH={false} />

      {/* Corner trim */}
      <rect x="200" y="275" width="3" height="175" fill="url(#ht-trim)" opacity="0.38" />
      <rect x="977" y="275" width="3" height="175" fill="url(#ht-trim)" opacity="0.38" />
    </g>
  )
}

// ---------------------------------------------------------------------------
// Renderer dispatch
// ---------------------------------------------------------------------------

export function HouseTemplateRenderer({ id }: { id: HouseTemplateId }) {
  switch (id) {
    case 'two-story': return <TwoStoryHouse />
    case 'ranch': return <RanchHouse />
    case 'craftsman': return <CraftsmanHouse />
  }
}

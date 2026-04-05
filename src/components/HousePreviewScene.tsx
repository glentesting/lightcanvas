import React, { useMemo } from 'react'

type DisplayPropLike = {
  id: string | number
  name: string
  type?: string
  priority?: string
  notes?: string
}

type HousePreviewSceneProps = {
  props: DisplayPropLike[]
  selectedPropId: string | number | null
  onSelectProp: (id: string | number) => void
}

type HouseZone = {
  key: string
  label: string
  x: number
  y: number
  w: number
  h: number
}

const ZONES: HouseZone[] = [
  { key: 'roofline', label: 'Roofline', x: 120, y: 92, w: 360, h: 26 },
  { key: 'upper-windows', label: 'Upper Windows', x: 180, y: 128, w: 230, h: 48 },
  { key: 'lower-windows', label: 'Lower Windows', x: 110, y: 206, w: 380, h: 54 },
  { key: 'yard-left', label: 'Left Yard', x: 50, y: 270, w: 165, h: 110 },
  { key: 'yard-center', label: 'Center Yard', x: 220, y: 274, w: 150, h: 100 },
  { key: 'yard-right', label: 'Right Yard', x: 385, y: 270, w: 165, h: 110 },
]

function inferZone(prop: DisplayPropLike): string {
  const source = `${prop.name} ${prop.type || ''} ${prop.priority || ''}`.toLowerCase()

  if (source.includes('roof')) return 'roofline'
  if (source.includes('face') || source.includes('window')) return 'lower-windows'
  if (source.includes('matrix')) return 'upper-windows'
  if (source.includes('tree')) return 'yard-right'
  if (source.includes('stake')) return 'yard-center'
  if (source.includes('arch')) return 'yard-left'

  return 'yard-center'
}

function zoneCenter(zone: HouseZone, index = 0) {
  const columns = 3
  const col = index % columns
  const row = Math.floor(index / columns)
  const gapX = zone.w / (columns + 1)
  const gapY = 28
  return {
    x: zone.x + gapX * (col + 1),
    y: zone.y + 26 + row * gapY,
  }
}

function renderPropGlyph(prop: DisplayPropLike, x: number, y: number, selected: boolean) {
  const source = `${prop.name} ${prop.type || ''}`.toLowerCase()
  const stroke = selected ? '#0f172a' : '#334155'
  const fill = selected ? '#dbeafe' : '#f8fafc'

  if (source.includes('tree')) {
    return (
      <g>
        <polygon points={`${x},${y-26} ${x-18},${y+16} ${x+18},${y+16}`} fill={fill} stroke={stroke} strokeWidth="2" />
        <rect x={x - 3} y={y + 16} width="6" height="10" rx="2" fill={stroke} />
      </g>
    )
  }

  if (source.includes('stake')) {
    return (
      <g>
        <circle cx={x} cy={y} r="10" fill={fill} stroke={stroke} strokeWidth="2" />
        <line x1={x} y1={y + 10} x2={x} y2={y + 24} stroke={stroke} strokeWidth="2" />
      </g>
    )
  }

  if (source.includes('roof')) {
    return (
      <g>
        <rect x={x - 18} y={y - 8} width="36" height="16" rx="8" fill={fill} stroke={stroke} strokeWidth="2" />
      </g>
    )
  }

  if (source.includes('face')) {
    return (
      <g>
        <circle cx={x} cy={y} r="13" fill={fill} stroke={stroke} strokeWidth="2" />
        <circle cx={x - 4} cy={y - 3} r="1.5" fill={stroke} />
        <circle cx={x + 4} cy={y - 3} r="1.5" fill={stroke} />
        <rect x={x - 5} y={y + 4} width="10" height="4" rx="2" fill={stroke} />
      </g>
    )
  }

  return (
    <g>
      <rect x={x - 14} y={y - 14} width="28" height="28" rx="8" fill={fill} stroke={stroke} strokeWidth="2" />
    </g>
  )
}

export function HousePreviewScene({
  props,
  selectedPropId,
  onSelectProp,
}: HousePreviewSceneProps) {
  const placed = useMemo(() => {
    const grouped = new Map<string, DisplayPropLike[]>()

    for (const prop of props) {
      const zoneKey = inferZone(prop)
      const existing = grouped.get(zoneKey) || []
      existing.push(prop)
      grouped.set(zoneKey, existing)
    }

    return ZONES.flatMap((zone) => {
      const zoneProps = grouped.get(zone.key) || []
      return zoneProps.map((prop, index) => ({
        prop,
        zone,
        ...zoneCenter(zone, index),
      }))
    })
  }, [props])

  const selectedProp = props.find((p) => p.id === selectedPropId) || null

  return (
    <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-xl">
      <div className="border-b border-slate-100 px-6 py-5">
        <div className="text-xl font-semibold text-slate-900">2.5D House Preview</div>
        <div className="mt-1 text-sm leading-6 text-slate-500">
          A visual layout layer for prop placement, zone reasoning, and future sequencing previews.
        </div>
      </div>

      <div className="grid gap-0 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="p-5">
          <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
            <svg viewBox="0 0 600 420" className="h-auto w-full rounded-2xl bg-[linear-gradient(to_bottom,_#dbeafe,_#eff6ff_38%,_#e2e8f0_38%,_#f8fafc_100%)]">
              <rect x="0" y="0" width="600" height="420" fill="transparent" />

              <rect x="95" y="130" width="410" height="150" rx="10" fill="#d6d3d1" stroke="#94a3b8" strokeWidth="2" />
              <polygon points="80,135 300,55 520,135" fill="#78716c" stroke="#64748b" strokeWidth="2" />
              <rect x="270" y="190" width="60" height="90" rx="6" fill="#475569" />
              <rect x="135" y="190" width="58" height="54" rx="6" fill="#cbd5e1" stroke="#94a3b8" />
              <rect x="407" y="190" width="58" height="54" rx="6" fill="#cbd5e1" stroke="#94a3b8" />
              <rect x="220" y="100" width="52" height="38" rx="6" fill="#cbd5e1" stroke="#94a3b8" />
              <rect x="332" y="100" width="52" height="38" rx="6" fill="#cbd5e1" stroke="#94a3b8" />

              <rect x="0" y="280" width="600" height="140" fill="#bbf7d0" />
              <ellipse cx="300" cy="340" rx="235" ry="42" fill="#86efac" opacity="0.55" />

              {ZONES.map((zone) => (
                <g key={zone.key}>
                  <rect
                    x={zone.x}
                    y={zone.y}
                    width={zone.w}
                    height={zone.h}
                    rx="12"
                    fill="white"
                    opacity="0.28"
                    stroke="#94a3b8"
                    strokeDasharray="6 6"
                  />
                  <text x={zone.x + 10} y={zone.y + 18} fontSize="12" fill="#475569">
                    {zone.label}
                  </text>
                </g>
              ))}

              {placed.map(({ prop, x, y }) => {
                const selected = prop.id === selectedPropId
                return (
                  <g
                    key={String(prop.id)}
                    onClick={() => onSelectProp(prop.id)}
                    style={{ cursor: 'pointer' }}
                  >
                    {renderPropGlyph(prop, x, y, selected)}
                    <text
                      x={x}
                      y={y + 34}
                      textAnchor="middle"
                      fontSize="11"
                      fill={selected ? '#0f172a' : '#475569'}
                    >
                      {prop.name}
                    </text>
                  </g>
                )
              })}
            </svg>
          </div>
        </div>

        <div className="border-t border-slate-100 p-6 lg:border-l lg:border-t-0">
          <div className="text-sm uppercase tracking-[0.16em] text-slate-500">Placement Inspector</div>

          {selectedProp ? (
            <div className="mt-4 space-y-4">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-lg font-semibold text-slate-900">{selectedProp.name}</div>
                <div className="mt-2 text-sm text-slate-500">
                  {(selectedProp.type || 'Unknown type')} · {selectedProp.priority || 'General priority'}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="font-medium text-slate-900">Why this zone</div>
                <div className="mt-2 text-sm leading-6 text-slate-600">
                  LightCanvas would place this prop in the{' '}
                  <span className="font-medium">
                    {ZONES.find((z) => z.key === inferZone(selectedProp))?.label || 'Center Yard'}
                  </span>{' '}
                  zone based on prop type, likely sequencing role, and how it should participate in the show.
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="font-medium text-slate-900">Fake-real reasoning</div>
                <ul className="mt-2 space-y-2 text-sm leading-6 text-slate-600">
                  <li>- Optimized for visual clarity in a house-scale preview</li>
                  <li>- Chosen to reduce overlap with other high-priority props</li>
                  <li>- Ready for future drag/drop, snap zones, and sequence overlays</li>
                </ul>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-600">
                {selectedProp.notes || 'No additional notes yet for this prop.'}
              </div>
            </div>
          ) : (
            <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
              Select a prop in the preview to inspect its placement.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

import { useCallback, useEffect, useImperativeHandle, useRef, forwardRef } from 'react'
import type { DisplayProp } from '../../types/display'
import type { PropAnimState, AudioSnapshot } from '../../hooks/usePropsAnimation'
import { usePropsAnimation } from '../../hooks/usePropsAnimation'

// ---------------------------------------------------------------------------
// Prop drawing helpers
// ---------------------------------------------------------------------------

function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace('#', '')
  const r = parseInt(h.substring(0, 2), 16)
  const g = parseInt(h.substring(2, 4), 16)
  const b = parseInt(h.substring(4, 6), 16)
  return `rgba(${r},${g},${b},${alpha})`
}

function drawMegaTree(ctx: CanvasRenderingContext2D, x: number, y: number, color: string, anim: PropAnimState, selected: boolean) {
  const w = 44; const h = 70
  ctx.save()
  ctx.shadowBlur = 30 * anim.glowIntensity
  ctx.shadowColor = color
  ctx.strokeStyle = color
  ctx.lineWidth = 2
  ctx.globalAlpha = selected ? 1.0 : 0.92
  // Triangle outline
  ctx.beginPath()
  ctx.moveTo(x, y - h)
  ctx.lineTo(x - w / 2, y)
  ctx.lineTo(x + w / 2, y)
  ctx.closePath()
  ctx.stroke()
  ctx.fillStyle = hexToRgba(color, 0.18 * anim.glowIntensity)
  ctx.fill()
  // 5-pointed star at peak
  ctx.shadowBlur = 45 * anim.glowIntensity
  ctx.shadowColor = '#ffdd00'
  ctx.fillStyle = '#ffdd00'
  ctx.beginPath()
  const starX = x
  const starY = y - h - 6
  const outerR = 7
  const innerR = 3
  for (let i = 0; i < 10; i++) {
    const angle = (i * Math.PI) / 5 - Math.PI / 2
    const r = i % 2 === 0 ? outerR : innerR
    const sx = starX + Math.cos(angle) * r
    const sy = starY + Math.sin(angle) * r
    if (i === 0) ctx.moveTo(sx, sy)
    else ctx.lineTo(sx, sy)
  }
  ctx.closePath()
  ctx.fill()
  ctx.restore()
}

function drawMiniTree(ctx: CanvasRenderingContext2D, x: number, y: number, color: string, anim: PropAnimState, selected: boolean) {
  const w = 28; const h = 42
  ctx.save()
  ctx.shadowBlur = 22 * anim.glowIntensity
  ctx.shadowColor = color
  ctx.strokeStyle = color
  ctx.lineWidth = 1.5
  ctx.globalAlpha = selected ? 1.0 : 0.92
  ctx.beginPath()
  ctx.moveTo(x, y - h)
  ctx.lineTo(x - w / 2, y)
  ctx.lineTo(x + w / 2, y)
  ctx.closePath()
  ctx.stroke()
  ctx.fillStyle = hexToRgba(color, 0.14 * anim.glowIntensity)
  ctx.fill()
  // 5-pointed star at peak
  ctx.shadowBlur = 30 * anim.glowIntensity
  ctx.shadowColor = '#ffdd00'
  ctx.fillStyle = '#ffdd00'
  ctx.beginPath()
  {
    const starX2 = x
    const starY2 = y - h - 4
    const outerR2 = 5
    const innerR2 = 2.5
    for (let i = 0; i < 10; i++) {
      const angle = (i * Math.PI) / 5 - Math.PI / 2
      const r = i % 2 === 0 ? outerR2 : innerR2
      const sx = starX2 + Math.cos(angle) * r
      const sy = starY2 + Math.sin(angle) * r
      if (i === 0) ctx.moveTo(sx, sy)
      else ctx.lineTo(sx, sy)
    }
  }
  ctx.closePath()
  ctx.fill()
  ctx.restore()
}

function drawStake(ctx: CanvasRenderingContext2D, x: number, y: number, color: string, anim: PropAnimState, selected: boolean) {
  ctx.save()
  ctx.shadowBlur = 22 * anim.glowIntensity
  ctx.shadowColor = color
  ctx.globalAlpha = selected ? 1.0 : 0.92
  // Thin vertical line
  ctx.strokeStyle = color
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(x, y)
  ctx.lineTo(x, y - 36)
  ctx.stroke()
  // Glowing cap
  ctx.fillStyle = color
  ctx.beginPath()
  ctx.arc(x, y - 36, 5 * anim.scale, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

function drawFace(ctx: CanvasRenderingContext2D, x: number, y: number, color: string, anim: PropAnimState, selected: boolean) {
  ctx.save()
  ctx.globalAlpha = selected ? 1.0 : 0.72

  // --- Tree outline: dot-per-pixel string around perimeter ---
  ctx.shadowBlur = 28 * anim.glowIntensity
  ctx.shadowColor = color
  ctx.fillStyle = color

  // Left side: 20 dots from tip (x, y-85) down to base-left (x-55, y)
  for (let i = 0; i < 20; i++) {
    const t = i / 19
    ctx.beginPath()
    ctx.arc(x - 55 * t, (y - 85) + 85 * t, 3.5, 0, Math.PI * 2)
    ctx.fill()
  }
  // Bottom: 18 dots from base-left (x-55, y) to base-right (x+55, y)
  for (let i = 0; i < 18; i++) {
    const t = i / 17
    ctx.beginPath()
    ctx.arc(x - 55 + 110 * t, y, 3.5, 0, Math.PI * 2)
    ctx.fill()
  }
  // Right side: 20 dots from base-right (x+55, y) up to tip (x, y-85)
  for (let i = 0; i < 20; i++) {
    const t = i / 19
    ctx.beginPath()
    ctx.arc(x + 55 - 55 * t, y - 85 * t, 3.5, 0, Math.PI * 2)
    ctx.fill()
  }

  // --- Star floating above the tip ---
  ctx.shadowBlur = 20
  ctx.shadowColor = '#ffdd00'
  ctx.fillStyle = '#ffdd00'
  ctx.strokeStyle = '#ffaa00'
  ctx.lineWidth = 1
  const starCx = x
  const starCy = y - 97
  const outerR = 9
  const innerR = 4
  ctx.beginPath()
  for (let i = 0; i < 10; i++) {
    const angle = -Math.PI / 2 + (i * Math.PI) / 5
    const r = i % 2 === 0 ? outerR : innerR
    const sx = starCx + Math.cos(angle) * r
    const sy = starCy + Math.sin(angle) * r
    if (i === 0) ctx.moveTo(sx, sy)
    else ctx.lineTo(sx, sy)
  }
  ctx.closePath()
  ctx.fill()
  ctx.stroke()

  // --- Eyes: two filled circles of dots ---
  ctx.shadowBlur = 14
  ctx.shadowColor = '#8888ff'
  const eyeColor = '#c8c0ff'
  for (const ecx of [x - 19, x + 19]) {
    const ecy = y - 38
    // Center dot
    ctx.fillStyle = eyeColor
    ctx.beginPath()
    ctx.arc(ecx, ecy, 3.5, 0, Math.PI * 2)
    ctx.fill()
    // Inner ring: 8 dots at radius 7
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2
      ctx.beginPath()
      ctx.arc(ecx + Math.cos(a) * 7, ecy + Math.sin(a) * 7, 2.5, 0, Math.PI * 2)
      ctx.fill()
    }
    // Outer ring: 8 dots at radius 13
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2
      ctx.beginPath()
      ctx.arc(ecx + Math.cos(a) * 13, ecy + Math.sin(a) * 13, 2, 0, Math.PI * 2)
      ctx.fill()
    }
  }

  // Mouth — red smile arc of dots inside the tree body
  ctx.shadowBlur = 14 * anim.glowIntensity
  ctx.shadowColor = '#ff0000'

  const mouthCount = 11
  const mouthCx = x
  const mouthCy = y - 34
  const mouthR = 16
  const openAmount = anim.mouthOpen ?? 0
  const startAngle = 0.3 - openAmount * 0.2
  const endAngle = Math.PI - 0.3 + openAmount * 0.2
  const span = endAngle - startAngle

  for (let i = 0; i < mouthCount; i++) {
    const a = startAngle + (i / (mouthCount - 1)) * span
    const dotX = mouthCx + Math.cos(a) * mouthR
    const dotY = mouthCy + Math.sin(a) * mouthR
    ctx.fillStyle = hexToRgba('#ff2020', 0.9 + openAmount * 0.1)
    ctx.beginPath()
    ctx.arc(dotX, dotY, 3.5, 0, Math.PI * 2)
    ctx.fill()
  }

  // --- Selection box ---
  if (selected) {
    ctx.shadowBlur = 0
    ctx.shadowColor = 'transparent'
    ctx.setLineDash([4, 4])
    ctx.strokeStyle = 'rgba(255,255,255,0.45)'
    ctx.lineWidth = 1.5
    ctx.strokeRect(x - 60, y - 100, 120, 105)
    ctx.setLineDash([])
  }

  ctx.restore()
}

function drawRoofline(ctx: CanvasRenderingContext2D, x: number, y: number, color: string, anim: PropAnimState, selected: boolean, propLength?: number, propAngle?: number) {
  const totalLen = propLength ?? 120
  const count = Math.min(40, Math.max(6, Math.round(totalLen / 10)))
  const angle = (propAngle ?? 0) * Math.PI / 180

  ctx.save()
  ctx.globalAlpha = selected ? 1.0 : 0.92
  ctx.translate(x, y)
  ctx.rotate(angle)

  const halfLen = totalLen / 2
  const spacing = totalLen / (count - 1)

  for (let i = 0; i < count; i++) {
    const bx = -halfLen + i * spacing
    // Chase effect
    const dist = Math.abs((i / (count - 1)) - anim.chasePosition)
    const bulbGlow = Math.max(0.5, 1.0 - dist * 2.5) * anim.glowIntensity
    ctx.shadowBlur = 24 * bulbGlow
    ctx.shadowColor = color
    ctx.fillStyle = hexToRgba(color, bulbGlow)
    ctx.beginPath()
    ctx.arc(bx, 0, 3.5, 0, Math.PI * 2)
    ctx.fill()
  }
  // Wire
  ctx.shadowBlur = 0
  ctx.strokeStyle = hexToRgba(color, 0.2)
  ctx.lineWidth = 0.5
  ctx.beginPath()
  ctx.moveTo(-halfLen, 0)
  ctx.lineTo(halfLen, 0)
  ctx.stroke()

  // Endpoint handles when selected
  if (selected) {
    for (const ex of [-halfLen, halfLen]) {
      ctx.strokeStyle = '#70AD47'
      ctx.lineWidth = 2
      ctx.fillStyle = 'rgba(255,255,255,0.9)'
      ctx.beginPath()
      ctx.arc(ex, 0, 6, 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()
    }
  }

  ctx.restore()
}

function drawArch(ctx: CanvasRenderingContext2D, x: number, y: number, color: string, anim: PropAnimState, selected: boolean) {
  const count = 13
  const archW = 50
  const archH = 55
  ctx.save()
  ctx.shadowBlur = 14 * anim.glowIntensity
  ctx.shadowColor = color
  ctx.fillStyle = color
  ctx.globalAlpha = selected ? 1.0 : 0.92
  for (let i = 0; i < count; i++) {
    const t = (i / (count - 1)) * Math.PI
    const ax = x + Math.cos(Math.PI - t) * archW
    const ay = y - Math.sin(t) * archH
    ctx.beginPath()
    ctx.arc(ax, ay, 3.5, 0, Math.PI * 2)
    ctx.fill()
  }
  // Wire connecting the dots
  ctx.shadowBlur = 0
  ctx.strokeStyle = hexToRgba(color, 0.15)
  ctx.lineWidth = 0.5
  ctx.beginPath()
  for (let i = 0; i < count; i++) {
    const t = (i / (count - 1)) * Math.PI
    const ax = x + Math.cos(Math.PI - t) * archW
    const ay = y - Math.sin(t) * archH
    if (i === 0) ctx.moveTo(ax, ay)
    else ctx.lineTo(ax, ay)
  }
  ctx.stroke()
  ctx.restore()
}

function drawMatrix(ctx: CanvasRenderingContext2D, x: number, y: number, color: string, anim: PropAnimState, selected: boolean) {
  ctx.save()
  ctx.shadowBlur = 14 * anim.glowIntensity
  ctx.shadowColor = color
  ctx.fillStyle = color
  ctx.globalAlpha = selected ? 1.0 : 0.92
  for (let r = 0; r < 5; r++) {
    for (let c = 0; c < 5; c++) {
      const dx = (c - 2) * 10
      const dy = (r - 2) * 10 - 24
      ctx.beginPath()
      ctx.arc(x + dx, y + dy, 2.5, 0, Math.PI * 2)
      ctx.fill()
    }
  }
  ctx.restore()
}

function drawDefault(ctx: CanvasRenderingContext2D, x: number, y: number, color: string, anim: PropAnimState, selected: boolean) {
  ctx.save()
  ctx.shadowBlur = 30 * anim.glowIntensity
  ctx.shadowColor = color
  ctx.fillStyle = color
  ctx.globalAlpha = selected ? 1.0 : 0.92
  ctx.beginPath()
  ctx.arc(x, y - 12, 8, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

/** Bounding box (relative to anchor) for a prop type */
function propBounds(t: string): [number, number, number, number] {
  if (t.includes('face') || t.includes('talking')) return [-60, -100, 120, 105]
  if (t.includes('mega')) return [-24, -72, 48, 74]
  if (t.includes('mini') || (t.includes('tree') && !t.includes('mega'))) return [-16, -44, 32, 46]
  if (t.includes('stake') || t.includes('ground')) return [-8, -38, 16, 40]
  if (t.includes('arch')) return [-26, -38, 52, 40]
  if (t.includes('matrix')) return [-27, -51, 54, 53]
  return [-12, -22, 24, 24]
}

function drawProp(ctx: CanvasRenderingContext2D, prop: DisplayProp, x: number, y: number, anim: PropAnimState, selected: boolean) {
  const color = prop.color ?? '#ffe8c0'
  const t = prop.type.toLowerCase()
  const isRoof = t.includes('roof')

  // Scale for non-roofline props: prop.length as percentage (100 = 1x)
  const s = (!isRoof && prop.length != null) ? Math.max(0.3, prop.length / 100) : 1

  // Apply scale transform around anchor point
  if (s !== 1) {
    ctx.save()
    ctx.translate(x, y)
    ctx.scale(s, s)
    ctx.translate(-x, -y)
  }

  if (t.includes('mega') && t.includes('tree')) drawMegaTree(ctx, x, y, color, anim, selected)
  else if (t.includes('mini') || (t.includes('tree') && !t.includes('mega'))) drawMiniTree(ctx, x, y, color, anim, selected)
  else if (t.includes('stake') || t.includes('ground')) drawStake(ctx, x, y, color, anim, selected)
  else if (t.includes('face') || t.includes('talking')) drawFace(ctx, x, y, color, anim, selected)
  else if (isRoof) drawRoofline(ctx, x, y, color, anim, selected, prop.length, prop.angle)
  else if (t.includes('arch')) drawArch(ctx, x, y, color, anim, selected)
  else if (t.includes('matrix')) drawMatrix(ctx, x, y, color, anim, selected)
  else drawDefault(ctx, x, y, color, anim, selected)

  if (s !== 1) ctx.restore()

  // Selection box + corner handles (drawn at scaled positions but unscaled stroke)
  if (selected && !isRoof) {
    const [bx, by, bw, bh] = propBounds(t)
    const sx = x + bx * s, sy = y + by * s, sw = bw * s, sh = bh * s
    ctx.save()
    ctx.setLineDash([4, 4])
    ctx.strokeStyle = 'rgba(255,255,255,0.45)'
    ctx.lineWidth = 1
    ctx.strokeRect(sx, sy, sw, sh)
    ctx.setLineDash([])
    // Corner handles
    const corners: [number, number][] = [[sx, sy], [sx + sw, sy], [sx, sy + sh], [sx + sw, sy + sh]]
    for (const [hx, hy] of corners) {
      ctx.fillStyle = 'rgba(255,255,255,0.9)'
      ctx.strokeStyle = '#70AD47'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.arc(hx, hy, 5, 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()
    }
    ctx.restore()
  }
}

// ---------------------------------------------------------------------------
// Canvas coordinate helpers
// ---------------------------------------------------------------------------

/** Convert canvas-normalized coords (0–1) to pixel coords */
function toPixel(normX: number, normY: number, cw: number, ch: number): [number, number] {
  return [normX * cw, normY * ch]
}

/** Convert pixel coords to canvas-normalized coords (0–1) */
function toNorm(px: number, py: number, cw: number, ch: number): [number, number] {
  return [px / cw, py / ch]
}

// ---------------------------------------------------------------------------
// Hit-test: is (px,py) near prop at (propPx, propPy)?
// ---------------------------------------------------------------------------
function hitTest(px: number, py: number, propPx: number, propPy: number, radius = 48): boolean {
  const dx = px - propPx
  const dy = py - (propPy - 30) // offset up since props draw above their anchor
  return dx * dx + dy * dy < radius * radius
}

// ---------------------------------------------------------------------------
// VisualizerCanvas component
// ---------------------------------------------------------------------------

export interface VisualizerCanvasHandle {
  triggerFrame: (snapshot: AudioSnapshot) => void
}

interface VisualizerCanvasProps {
  photoUrl: string | null
  nightOpacity: number
  props: DisplayProp[]
  selectedPropId: string | null
  activeTool: string | null
  onCanvasClick: (normX: number, normY: number) => void
  onPropClick: (id: string) => void
  onPropDrag: (id: string, normX: number, normY: number) => void
  onPropResize: (id: string, length: number, angle: number) => void
}

export const VisualizerCanvas = forwardRef<VisualizerCanvasHandle, VisualizerCanvasProps>(
  function VisualizerCanvas({ photoUrl, nightOpacity, props, selectedPropId, activeTool, onCanvasClick, onPropClick, onPropDrag, onPropResize }, ref) {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const bgImageRef = useRef<HTMLImageElement | null>(null)
    const rafRef = useRef<number>(0)
    const dragRef = useRef<{ id: string } | null>(null)
    const resizeRef = useRef<{ id: string; mode: 'roofline' | 'corner'; fixedX: number; fixedY: number } | null>(null)
    const { updateSnapshot, getAnimState } = usePropsAnimation()

    // Expose triggerFrame for sequencer-driven animation
    useImperativeHandle(ref, () => ({
      triggerFrame: (snapshot: AudioSnapshot) => updateSnapshot(snapshot),
    }), [updateSnapshot])

    // Load background photo
    useEffect(() => {
      if (!photoUrl) { bgImageRef.current = null; return }
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.src = photoUrl
      img.onload = () => { bgImageRef.current = img }
    }, [photoUrl])

    // Main draw loop
    const draw = useCallback(() => {
      const canvas = canvasRef.current
      if (!canvas) return
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      const dpr = window.devicePixelRatio || 1
      const rect = canvas.getBoundingClientRect()
      const cw = rect.width
      const ch = rect.height
      canvas.width = cw * dpr
      canvas.height = ch * dpr
      ctx.scale(dpr, dpr)

      // Clear
      ctx.fillStyle = '#050a14'
      ctx.fillRect(0, 0, cw, ch)

      // Background photo
      const bg = bgImageRef.current
      if (bg) {
        // Cover-fit the image
        const imgRatio = bg.width / bg.height
        const canvasRatio = cw / ch
        let sx = 0, sy = 0, sw = bg.width, sh = bg.height
        if (imgRatio > canvasRatio) {
          sw = bg.height * canvasRatio
          sx = (bg.width - sw) / 2
        } else {
          sh = bg.width / canvasRatio
          sy = (bg.height - sh) / 2
        }
        ctx.drawImage(bg, sx, sy, sw, sh, 0, 0, cw, ch)
        // Dark overlay controlled by night mode slider
        ctx.fillStyle = `rgba(2,6,16,${nightOpacity})`
        ctx.fillRect(0, 0, cw, ch)
      } else {
        // No photo — dark gradient placeholder
        const grad = ctx.createLinearGradient(0, 0, 0, ch)
        grad.addColorStop(0, '#020818')
        grad.addColorStop(0.6, '#0a1828')
        grad.addColorStop(1, '#060d08')
        ctx.fillStyle = grad
        ctx.fillRect(0, 0, cw, ch)
      }

      // Draw props
      const now = performance.now() / 1000
      for (const prop of props) {
        if (prop.canvasX == null || prop.canvasY == null) continue
        const [px, py] = toPixel(prop.canvasX, prop.canvasY, cw, ch)
        const anim = getAnimState(prop.type, now)
        const selected = prop.id === selectedPropId
        drawProp(ctx, prop, px, py, anim, selected)
      }

      rafRef.current = requestAnimationFrame(draw)
    }, [props, selectedPropId, nightOpacity, getAnimState])

    useEffect(() => {
      rafRef.current = requestAnimationFrame(draw)
      return () => cancelAnimationFrame(rafRef.current)
    }, [draw])

    // --- Pointer handlers ---

    const getCanvasPos = useCallback((e: React.MouseEvent<HTMLCanvasElement>): [number, number] => {
      const rect = canvasRef.current!.getBoundingClientRect()
      return [e.clientX - rect.left, e.clientY - rect.top]
    }, [])

    const findPropAt = useCallback((px: number, py: number): DisplayProp | null => {
      const canvas = canvasRef.current
      if (!canvas) return null
      const rect = canvas.getBoundingClientRect()
      // Iterate in reverse so topmost prop wins
      for (let i = props.length - 1; i >= 0; i--) {
        const p = props[i]
        if (p.canvasX == null || p.canvasY == null) continue
        const [ppx, ppy] = toPixel(p.canvasX, p.canvasY, rect.width, rect.height)
        if (hitTest(px, py, ppx, ppy)) return p
      }
      return null
    }, [props])

    /** Check if (px,py) is near a resize handle on the selected prop.
        For roofline: endpoint handles. For others: corner handles.
        Returns { id, mode, fixedX, fixedY } or null. */
    const findResizeHandle = useCallback((px: number, py: number): { id: string; mode: 'roofline' | 'corner'; fixedX: number; fixedY: number } | null => {
      if (!selectedPropId) return null
      const canvas = canvasRef.current
      if (!canvas) return null
      const rect = canvas.getBoundingClientRect()
      const sel = props.find((p) => p.id === selectedPropId)
      if (!sel || sel.canvasX == null || sel.canvasY == null) return null
      const [cx, cy] = toPixel(sel.canvasX, sel.canvasY, rect.width, rect.height)
      const t = sel.type.toLowerCase()

      if (t.includes('roof')) {
        // Roofline endpoint handles
        const len = sel.length ?? 120
        const ang = (sel.angle ?? 0) * Math.PI / 180
        const halfLen = len / 2
        const e1x = cx - Math.cos(ang) * halfLen, e1y = cy - Math.sin(ang) * halfLen
        const e2x = cx + Math.cos(ang) * halfLen, e2y = cy + Math.sin(ang) * halfLen
        if (Math.hypot(px - e1x, py - e1y) < 15) return { id: sel.id, mode: 'roofline', fixedX: e2x, fixedY: e2y }
        if (Math.hypot(px - e2x, py - e2y) < 15) return { id: sel.id, mode: 'roofline', fixedX: e1x, fixedY: e1y }
      } else {
        // Corner handles for all other props
        const s = (sel.length != null) ? Math.max(0.3, sel.length / 100) : 1
        const [bx, by, bw, bh] = propBounds(t)
        const corners: [number, number][] = [
          [cx + bx * s, cy + by * s],
          [cx + (bx + bw) * s, cy + by * s],
          [cx + bx * s, cy + (by + bh) * s],
          [cx + (bx + bw) * s, cy + (by + bh) * s],
        ]
        for (const [hx, hy] of corners) {
          if (Math.hypot(px - hx, py - hy) < 12) {
            // Fixed point is the opposite corner (center of prop)
            return { id: sel.id, mode: 'corner', fixedX: cx, fixedY: cy }
          }
        }
      }
      return null
    }, [props, selectedPropId])

    // Store original distance from center to corner at drag start for scale computation
    const scaleBaseRef = useRef<number>(1)

    const handlePointerDown = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
      const [px, py] = getCanvasPos(e)

      // Check resize handles first (roofline endpoints + corner handles)
      const handle = findResizeHandle(px, py)
      if (handle) {
        resizeRef.current = handle
        if (handle.mode === 'corner') {
          // Store current distance from center for relative scaling
          const sel = props.find((p) => p.id === handle.id)
          const currentScale = (sel?.length != null) ? sel.length / 100 : 1
          scaleBaseRef.current = currentScale / Math.max(1, Math.hypot(px - handle.fixedX, py - handle.fixedY))
        }
        ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
        return
      }

      const hit = findPropAt(px, py)

      if (hit) {
        if (activeTool === 'eraser') {
          onPropClick(hit.id)
          return
        }
        onPropClick(hit.id)
        dragRef.current = { id: hit.id }
        ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
        return
      }

      if (activeTool && activeTool !== 'eraser') {
        const rect = canvasRef.current!.getBoundingClientRect()
        const [nx, ny] = toNorm(px, py, rect.width, rect.height)
        onCanvasClick(nx, ny)
        return
      }

      onPropClick('')
    }, [activeTool, getCanvasPos, findResizeHandle, findPropAt, onPropClick, onCanvasClick, props])

    const handlePointerMove = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
      if (resizeRef.current) {
        const [px, py] = getCanvasPos(e)
        const r = resizeRef.current

        if (r.mode === 'roofline') {
          // Roofline: length + angle from fixed endpoint to mouse
          const dx = px - r.fixedX, dy = py - r.fixedY
          const newLength = Math.max(30, Math.hypot(dx, dy))
          const newAngle = Math.atan2(dy, dx) * 180 / Math.PI
          const rect = canvasRef.current!.getBoundingClientRect()
          const [nx, ny] = toNorm((r.fixedX + px) / 2, (r.fixedY + py) / 2, rect.width, rect.height)
          onPropDrag(r.id, nx, ny)
          onPropResize(r.id, newLength, newAngle)
        } else {
          // Corner: scale based on distance from center
          const dist = Math.hypot(px - r.fixedX, py - r.fixedY)
          const newScale = Math.max(30, Math.min(400, Math.round(dist * scaleBaseRef.current * 100)))
          onPropResize(r.id, newScale, 0)
        }
        return
      }

      // Normal drag
      if (!dragRef.current) return
      const rect = canvasRef.current!.getBoundingClientRect()
      const px = e.clientX - rect.left
      const py = e.clientY - rect.top
      const [nx, ny] = toNorm(px, py, rect.width, rect.height)
      onPropDrag(dragRef.current.id, nx, ny)
    }, [getCanvasPos, onPropDrag, onPropResize])

    const handlePointerUp = useCallback(() => {
      dragRef.current = null
      resizeRef.current = null
    }, [])

    const cursor = activeTool === 'eraser'
      ? 'pointer'
      : activeTool
        ? 'crosshair'
        : dragRef.current
          ? 'grabbing'
          : 'default'

    return (
      <canvas
        ref={canvasRef}
        className="block w-full"
        style={{ minHeight: '62vh', cursor }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      />
    )
  },
)

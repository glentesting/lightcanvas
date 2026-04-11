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
  ctx.shadowBlur = 20 * anim.glowIntensity
  ctx.shadowColor = color
  ctx.strokeStyle = color
  ctx.lineWidth = 2
  ctx.globalAlpha = selected ? 1.0 : 0.6
  // Triangle outline
  ctx.beginPath()
  ctx.moveTo(x, y - h)
  ctx.lineTo(x - w / 2, y)
  ctx.lineTo(x + w / 2, y)
  ctx.closePath()
  ctx.stroke()
  ctx.fillStyle = hexToRgba(color, 0.08 * anim.glowIntensity)
  ctx.fill()
  // Star at peak
  ctx.shadowBlur = 30 * anim.glowIntensity
  ctx.fillStyle = '#ffffff'
  ctx.beginPath()
  ctx.arc(x, y - h, 4, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

function drawMiniTree(ctx: CanvasRenderingContext2D, x: number, y: number, color: string, anim: PropAnimState, selected: boolean) {
  const w = 28; const h = 42
  ctx.save()
  ctx.shadowBlur = 15 * anim.glowIntensity
  ctx.shadowColor = color
  ctx.strokeStyle = color
  ctx.lineWidth = 1.5
  ctx.globalAlpha = selected ? 1.0 : 0.6
  ctx.beginPath()
  ctx.moveTo(x, y - h)
  ctx.lineTo(x - w / 2, y)
  ctx.lineTo(x + w / 2, y)
  ctx.closePath()
  ctx.stroke()
  ctx.fillStyle = hexToRgba(color, 0.06 * anim.glowIntensity)
  ctx.fill()
  ctx.restore()
}

function drawStake(ctx: CanvasRenderingContext2D, x: number, y: number, color: string, anim: PropAnimState, selected: boolean) {
  ctx.save()
  ctx.shadowBlur = 15 * anim.glowIntensity
  ctx.shadowColor = color
  ctx.globalAlpha = selected ? 1.0 : 0.6
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
  const hw = 32; const h = 80
  const tipX = x; const tipY = y - h; const baseY = y
  ctx.save()
  ctx.shadowBlur = 18 * anim.glowIntensity
  ctx.shadowColor = color
  ctx.globalAlpha = selected ? 1.0 : 0.65

  const dot = (dx: number, dy: number, c: string, r = 2.2) => {
    ctx.fillStyle = c
    ctx.beginPath()
    ctx.arc(dx, dy, r, 0, Math.PI * 2)
    ctx.fill()
  }

  // Triangle outline — many dots like real LOR pixel strings
  // Left edge: tip down to bottom-left
  for (let i = 0; i <= 16; i++) {
    const t = i / 16
    dot(tipX - hw * t, tipY + h * t, color)
  }
  // Bottom edge: left to right
  for (let i = 0; i <= 14; i++) {
    const t = i / 14
    dot(x - hw + 2 * hw * t, baseY, color)
  }
  // Right edge: bottom-right up to tip
  for (let i = 1; i <= 15; i++) {
    const t = i / 16
    dot(tipX + hw * (1 - t), baseY - h * t, color)
  }

  // Star at peak — 5-pointed, gold
  ctx.shadowColor = '#ffdd00'
  const starCy = tipY - 6
  for (let i = 0; i < 10; i++) {
    const a = (i * Math.PI) / 5 - Math.PI / 2
    const sr = i % 2 === 0 ? 8 : 3.5
    dot(x + Math.cos(a) * sr, starCy + Math.sin(a) * sr, '#ffdd00', 2.2)
  }
  dot(x, starCy, '#ffdd00', 2.5)

  // Eyes — large oval rings of dots, lavender/white
  ctx.shadowColor = '#c8c0ff'
  const eyeColor = '#d8d0ff'
  const eyeY = tipY + h * 0.35 // upper third of triangle
  const eyeSpread = hw * 0.42
  for (const side of [-1, 1]) {
    const cx = x + side * eyeSpread
    // Outer oval ring — 12 dots
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2
      dot(cx + Math.cos(a) * 8, eyeY + Math.sin(a) * 6, eyeColor, 2)
    }
    // Inner fill — 5 dots
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2
      dot(cx + Math.cos(a) * 3.5, eyeY + Math.sin(a) * 2.5, eyeColor, 1.8)
    }
    dot(cx, eyeY, '#ffffff', 2)
  }

  // Mouth — wide smile arc of red dots, curves UP (visually a grin)
  ctx.shadowColor = '#ff2020'
  const mouthCount = 12
  const mouthW = hw * 0.65
  const mouthBaseY = tipY + h * 0.7
  const smileLift = 8 + anim.mouthOpen * 5
  for (let i = 0; i < mouthCount; i++) {
    const t = i / (mouthCount - 1)
    const mx = x - mouthW + 2 * mouthW * t
    const my = mouthBaseY - Math.sin(t * Math.PI) * smileLift
    dot(mx, my, '#ff2020', 2.4)
  }

  ctx.restore()
}

function drawRoofline(ctx: CanvasRenderingContext2D, x: number, y: number, color: string, anim: PropAnimState, selected: boolean, propLength?: number, propAngle?: number) {
  const totalLen = propLength ?? 120
  const count = Math.min(40, Math.max(6, Math.round(totalLen / 10)))
  const angle = (propAngle ?? 0) * Math.PI / 180

  ctx.save()
  ctx.globalAlpha = selected ? 1.0 : 0.6
  ctx.translate(x, y)
  ctx.rotate(angle)

  const halfLen = totalLen / 2
  const spacing = totalLen / (count - 1)

  for (let i = 0; i < count; i++) {
    const bx = -halfLen + i * spacing
    // Chase effect
    const dist = Math.abs((i / (count - 1)) - anim.chasePosition)
    const bulbGlow = Math.max(0.3, 1.0 - dist * 3) * anim.glowIntensity
    ctx.shadowBlur = 12 * bulbGlow
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
  const count = 9
  ctx.save()
  ctx.shadowBlur = 12 * anim.glowIntensity
  ctx.shadowColor = color
  ctx.fillStyle = color
  ctx.globalAlpha = selected ? 1.0 : 0.6
  for (let i = 0; i < count; i++) {
    const t = (i / (count - 1)) * Math.PI
    const ax = x + Math.cos(t) * 24
    const ay = y - Math.sin(t) * 36
    ctx.beginPath()
    ctx.arc(ax, ay, 3, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.restore()
}

function drawMatrix(ctx: CanvasRenderingContext2D, x: number, y: number, color: string, anim: PropAnimState, selected: boolean) {
  ctx.save()
  ctx.shadowBlur = 8 * anim.glowIntensity
  ctx.shadowColor = color
  ctx.fillStyle = color
  ctx.globalAlpha = selected ? 1.0 : 0.6
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
  ctx.shadowBlur = 20 * anim.glowIntensity
  ctx.shadowColor = color
  ctx.fillStyle = color
  ctx.globalAlpha = selected ? 1.0 : 0.6
  ctx.beginPath()
  ctx.arc(x, y - 12, 8, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

function drawProp(ctx: CanvasRenderingContext2D, prop: DisplayProp, x: number, y: number, anim: PropAnimState, selected: boolean) {
  const color = prop.color ?? '#ffe8c0'
  const t = prop.type.toLowerCase()
  if (t.includes('mega') && t.includes('tree')) drawMegaTree(ctx, x, y, color, anim, selected)
  else if (t.includes('mini') || (t.includes('tree') && !t.includes('mega'))) drawMiniTree(ctx, x, y, color, anim, selected)
  else if (t.includes('stake') || t.includes('ground')) drawStake(ctx, x, y, color, anim, selected)
  else if (t.includes('face') || t.includes('talking')) drawFace(ctx, x, y, color, anim, selected)
  else if (t.includes('roof')) drawRoofline(ctx, x, y, color, anim, selected, prop.length, prop.angle)
  else if (t.includes('arch')) drawArch(ctx, x, y, color, anim, selected)
  else if (t.includes('matrix')) drawMatrix(ctx, x, y, color, anim, selected)
  else drawDefault(ctx, x, y, color, anim, selected)

  // Selection dashed rectangle
  if (selected) {
    ctx.save()
    ctx.setLineDash([4, 4])
    ctx.strokeStyle = 'rgba(255,255,255,0.5)'
    ctx.lineWidth = 1
    ctx.strokeRect(x - 30, y - 80, 60, 88)
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
  props: DisplayProp[]
  selectedPropId: string | null
  activeTool: string | null
  onCanvasClick: (normX: number, normY: number) => void
  onPropClick: (id: string) => void
  onPropDrag: (id: string, normX: number, normY: number) => void
  onPropResize: (id: string, length: number, angle: number) => void
}

export const VisualizerCanvas = forwardRef<VisualizerCanvasHandle, VisualizerCanvasProps>(
  function VisualizerCanvas({ photoUrl, props, selectedPropId, activeTool, onCanvasClick, onPropClick, onPropDrag, onPropResize }, ref) {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const bgImageRef = useRef<HTMLImageElement | null>(null)
    const rafRef = useRef<number>(0)
    const dragRef = useRef<{ id: string } | null>(null)
    const resizeRef = useRef<{ id: string; fixedX: number; fixedY: number } | null>(null)
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
        // Dark overlay to maintain night feel
        ctx.fillStyle = 'rgba(2,6,16,0.45)'
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
    }, [props, selectedPropId, getAnimState])

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

    /** Check if (px,py) is near either endpoint of the selected roofline prop. Returns the FIXED endpoint (the other end) if hit, or null. */
    const findRooflineEndpoint = useCallback((px: number, py: number): { id: string; fixedX: number; fixedY: number } | null => {
      if (!selectedPropId) return null
      const canvas = canvasRef.current
      if (!canvas) return null
      const rect = canvas.getBoundingClientRect()
      const sel = props.find((p) => p.id === selectedPropId)
      if (!sel || !sel.type.toLowerCase().includes('roof')) return null
      if (sel.canvasX == null || sel.canvasY == null) return null
      const [cx, cy] = toPixel(sel.canvasX, sel.canvasY, rect.width, rect.height)
      const len = sel.length ?? 120
      const ang = (sel.angle ?? 0) * Math.PI / 180
      const halfLen = len / 2
      // Two endpoints in pixel space
      const e1x = cx - Math.cos(ang) * halfLen, e1y = cy - Math.sin(ang) * halfLen
      const e2x = cx + Math.cos(ang) * halfLen, e2y = cy + Math.sin(ang) * halfLen
      const d1 = Math.hypot(px - e1x, py - e1y)
      const d2 = Math.hypot(px - e2x, py - e2y)
      if (d1 < 15) return { id: sel.id, fixedX: e2x, fixedY: e2y }
      if (d2 < 15) return { id: sel.id, fixedX: e1x, fixedY: e1y }
      return null
    }, [props, selectedPropId])

    const handlePointerDown = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
      const [px, py] = getCanvasPos(e)

      // Check roofline endpoint resize first (only when selected)
      const endpoint = findRooflineEndpoint(px, py)
      if (endpoint) {
        resizeRef.current = endpoint
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
    }, [activeTool, getCanvasPos, findRooflineEndpoint, findPropAt, onPropClick, onCanvasClick])

    const handlePointerMove = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
      // Roofline resize mode
      if (resizeRef.current) {
        const [px, py] = getCanvasPos(e)
        const fx = resizeRef.current.fixedX
        const fy = resizeRef.current.fixedY
        const dx = px - fx
        const dy = py - fy
        const newLength = Math.max(30, Math.hypot(dx, dy))
        const newAngle = Math.atan2(dy, dx) * 180 / Math.PI
        // Recompute center as midpoint between fixed end and mouse
        const rect = canvasRef.current!.getBoundingClientRect()
        const [nx, ny] = toNorm((fx + px) / 2, (fy + py) / 2, rect.width, rect.height)
        onPropDrag(resizeRef.current.id, nx, ny)
        onPropResize(resizeRef.current.id, newLength, newAngle)
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

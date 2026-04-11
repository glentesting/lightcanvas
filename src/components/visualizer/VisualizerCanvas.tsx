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
  const r = 24
  ctx.save()
  ctx.shadowBlur = 15 * anim.glowIntensity
  ctx.shadowColor = color
  ctx.strokeStyle = color
  ctx.lineWidth = 2
  ctx.globalAlpha = selected ? 1.0 : 0.6
  // Circle outline
  ctx.beginPath()
  ctx.arc(x, y - r, r, 0, Math.PI * 2)
  ctx.stroke()
  // Eyes
  ctx.fillStyle = color
  ctx.beginPath()
  ctx.ellipse(x - 8, y - r - 6, 4, 5, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.beginPath()
  ctx.ellipse(x + 8, y - r - 6, 4, 5, 0, 0, Math.PI * 2)
  ctx.fill()
  // Mouth — arc angle changes with mouthOpen
  const mouthAngle = 0.3 + anim.mouthOpen * 0.7 // 0.3 = flat line, 1.0 = wide arc
  ctx.beginPath()
  ctx.arc(x, y - r + 4, 10, Math.PI * (0.5 - mouthAngle / 2), Math.PI * (0.5 + mouthAngle / 2))
  ctx.stroke()
  ctx.restore()
}

function drawRoofline(ctx: CanvasRenderingContext2D, x: number, y: number, color: string, anim: PropAnimState, selected: boolean) {
  const count = 12; const spacing = 10; const totalW = (count - 1) * spacing
  const startX = x - totalW / 2
  ctx.save()
  ctx.globalAlpha = selected ? 1.0 : 0.6
  for (let i = 0; i < count; i++) {
    const bx = startX + i * spacing
    // Chase effect — bulbs near chasePosition glow brighter
    const dist = Math.abs((i / (count - 1)) - anim.chasePosition)
    const bulbGlow = Math.max(0.3, 1.0 - dist * 3) * anim.glowIntensity
    ctx.shadowBlur = 12 * bulbGlow
    ctx.shadowColor = color
    ctx.fillStyle = hexToRgba(color, bulbGlow)
    ctx.beginPath()
    ctx.arc(bx, y, 3.5, 0, Math.PI * 2)
    ctx.fill()
  }
  // Wire
  ctx.shadowBlur = 0
  ctx.strokeStyle = hexToRgba(color, 0.2)
  ctx.lineWidth = 0.5
  ctx.beginPath()
  ctx.moveTo(startX, y)
  ctx.lineTo(startX + totalW, y)
  ctx.stroke()
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
  else if (t.includes('roof')) drawRoofline(ctx, x, y, color, anim, selected)
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
function hitTest(px: number, py: number, propPx: number, propPy: number, radius = 35): boolean {
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
}

export const VisualizerCanvas = forwardRef<VisualizerCanvasHandle, VisualizerCanvasProps>(
  function VisualizerCanvas({ photoUrl, props, selectedPropId, activeTool, onCanvasClick, onPropClick, onPropDrag }, ref) {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const bgImageRef = useRef<HTMLImageElement | null>(null)
    const rafRef = useRef<number>(0)
    const dragRef = useRef<{ id: string } | null>(null)
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

    const handlePointerDown = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
      const [px, py] = getCanvasPos(e)
      const hit = findPropAt(px, py)

      if (hit) {
        if (activeTool === 'eraser') {
          onPropClick(hit.id)
        } else if (!activeTool) {
          onPropClick(hit.id)
          dragRef.current = { id: hit.id }
          ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
        }
        return
      }

      // No prop hit — place new prop if tool active
      if (activeTool && activeTool !== 'eraser') {
        const rect = canvasRef.current!.getBoundingClientRect()
        const [nx, ny] = toNorm(px, py, rect.width, rect.height)
        onCanvasClick(nx, ny)
      }
    }, [activeTool, getCanvasPos, findPropAt, onPropClick, onCanvasClick])

    const handlePointerMove = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
      if (!dragRef.current) return
      const rect = canvasRef.current!.getBoundingClientRect()
      const px = e.clientX - rect.left
      const py = e.clientY - rect.top
      const [nx, ny] = toNorm(px, py, rect.width, rect.height)
      onPropDrag(dragRef.current.id, nx, ny)
    }, [onPropDrag])

    const handlePointerUp = useCallback(() => {
      dragRef.current = null
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

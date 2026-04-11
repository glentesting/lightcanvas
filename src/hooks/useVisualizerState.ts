import { useCallback, useMemo, useState } from 'react'
import type { DisplayProp } from '../types/display'

export type PlacementTool =
  | 'roofline'
  | 'arch'
  | 'mini-tree'
  | 'mega-tree'
  | 'face'
  | 'stake'
  | 'matrix'
  | 'custom'
  | 'pumpkin'
  | 'ghost'
  | 'skull'
  | 'gravestone'
  | 'eraser'

export interface ToolDef {
  id: PlacementTool
  label: string
  propType: string
}

export const TOOLS: ToolDef[] = [
  { id: 'roofline', label: 'Roofline', propType: 'Roofline' },
  { id: 'arch', label: 'Arch', propType: 'Arches' },
  { id: 'mini-tree', label: 'Mini Tree', propType: 'Mini Tree' },
  { id: 'mega-tree', label: 'Mega Tree', propType: 'Mega Tree' },
  { id: 'face', label: 'Face', propType: 'Talking Face' },
  { id: 'stake', label: 'Stake', propType: 'Ground Stakes' },
  { id: 'matrix', label: 'Matrix', propType: 'Matrix' },
  { id: 'custom', label: '+ Custom', propType: 'Smart Pixel' },
  { id: 'pumpkin', label: 'Pumpkin', propType: 'Pumpkin Face' },
  { id: 'ghost', label: 'Ghost', propType: 'Ghost' },
  { id: 'skull', label: 'Skull', propType: 'Skull' },
  { id: 'gravestone', label: 'Gravestone', propType: 'Gravestone' },
  { id: 'eraser', label: 'Eraser', propType: '' },
]

export interface UseVisualizerStateOptions {
  props: DisplayProp[]
  selectedPropId: string | null
  photoUrl: string | null
  onSelectProp: (id: string | null) => void
  onPlaceProp: (type: string, x: number, y: number, houseType: string) => void
  onRemoveProp: (id: string) => void
  onMoveProp: (id: string, x: number, y: number) => void
  onUpdatePropColor: (id: string, color: string) => void
  onResizeProp: (id: string, length: number, angle: number) => void
}

export function useVisualizerState(opts: UseVisualizerStateOptions) {
  const [activeTool, setActiveTool] = useState<PlacementTool | null>(null)
  const [dragId, setDragId] = useState<string | null>(null)

  const placedProps = useMemo(
    () => opts.props.filter((p) => p.canvasX != null && p.canvasY != null),
    [opts.props],
  )

  const selectedProp = useMemo(
    () => opts.props.find((p) => p.id === opts.selectedPropId) ?? null,
    [opts.props, opts.selectedPropId],
  )

  const handleCanvasClick = useCallback(
    (canvasX: number, canvasY: number) => {
      if (!activeTool || activeTool === 'eraser') return
      const toolDef = TOOLS.find((t) => t.id === activeTool)
      if (!toolDef) return
      // Pass empty string for houseType — no longer used for filtering
      opts.onPlaceProp(toolDef.propType, canvasX, canvasY, '')
    },
    [activeTool, opts],
  )

  const handlePropClick = useCallback(
    (id: string) => {
      if (!id) {
        opts.onSelectProp(null)
        return
      }
      if (activeTool === 'eraser') {
        opts.onRemoveProp(id)
      } else {
        opts.onSelectProp(id)
      }
    },
    [activeTool, opts],
  )

  const handlePropDrag = useCallback(
    (id: string, canvasX: number, canvasY: number) => {
      opts.onMoveProp(id, canvasX, canvasY)
    },
    [opts],
  )

  const handlePropResize = useCallback(
    (id: string, length: number, angle: number) => {
      opts.onResizeProp(id, length, angle)
    },
    [opts],
  )

  const startDrag = useCallback((id: string) => setDragId(id), [])
  const endDrag = useCallback(() => setDragId(null), [])

  return {
    activeTool,
    setActiveTool,
    dragId,
    startDrag,
    endDrag,
    placedProps,
    selectedProp,
    handleCanvasClick,
    handlePropClick,
    handlePropDrag,
    handlePropResize,
    photoUrl: opts.photoUrl,
  }
}

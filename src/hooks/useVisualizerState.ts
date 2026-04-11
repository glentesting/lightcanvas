import { useCallback, useMemo, useState } from 'react'
import type { DisplayProp } from '../types/display'
import type { HolidayId } from '../holidays'
import { CHRISTMAS_TOOLS, HALLOWEEN_TOOLS, SHARED_TOOLS } from '../holidays'

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
  id: string
  label: string
  propType: string
  defaultColor?: string
}

const ERASER_TOOL: ToolDef = { id: 'eraser', label: 'Eraser', propType: '' }

export function getToolsForHoliday(holiday: HolidayId): ToolDef[] {
  const holidayTools = holiday === 'halloween' ? HALLOWEEN_TOOLS : CHRISTMAS_TOOLS
  return [...holidayTools, ...SHARED_TOOLS, ERASER_TOOL]
}

export interface UseVisualizerStateOptions {
  props: DisplayProp[]
  selectedPropId: string | null
  photoUrl: string | null
  selectedHoliday?: HolidayId
  onSelectProp: (id: string | null) => void
  onPlaceProp: (type: string, x: number, y: number, houseType: string) => void
  onRemoveProp: (id: string) => void
  onMoveProp: (id: string, x: number, y: number) => void
  onUpdatePropColor: (id: string, color: string) => void
  onResizeProp: (id: string, length: number, angle: number) => void
}

export function useVisualizerState(opts: UseVisualizerStateOptions) {
  const holiday = opts.selectedHoliday ?? 'christmas'
  const tools = useMemo(() => getToolsForHoliday(holiday), [holiday])
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
      const toolDef = tools.find((t) => t.id === activeTool)
      if (!toolDef) return
      opts.onPlaceProp(toolDef.propType, canvasX, canvasY, '')
    },
    [activeTool, tools, opts],
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
    tools,
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

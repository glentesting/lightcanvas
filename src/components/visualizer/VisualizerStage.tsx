import { useCallback, useRef, useState } from 'react'
import type { DisplayProp } from '../../types/display'
import type { PlacementTool, ToolDef } from '../../hooks/useVisualizerState'
import { VisualizerCanvas, type VisualizerCanvasHandle } from './VisualizerCanvas'
import { VisualizerToolbar } from './VisualizerToolbar'
import { UploadPhotoFlow } from './UploadPhotoFlow'

interface VisualizerStageProps {
  props: DisplayProp[]
  selectedPropId: string | null
  tools: ToolDef[]
  activeTool: PlacementTool | null
  selectedProp: DisplayProp | null
  photoUrl: string | null
  onToolChange: (tool: PlacementTool | null) => void
  onCanvasClick: (normX: number, normY: number) => void
  onPropClick: (id: string) => void
  onPropDrag: (id: string, normX: number, normY: number) => void
  onPropResize: (id: string, length: number, angle: number) => void
  onUpdatePropColor: (id: string, color: string) => void
  onPhotoReady: (url: string) => void
  userId: string | null
  profileId: string | null
  undo: () => void
  canUndo: boolean
}

export function VisualizerStage({
  props,
  selectedPropId,
  tools,
  activeTool,
  selectedProp,
  photoUrl,
  onToolChange,
  onCanvasClick,
  onPropClick,
  onPropDrag,
  onPropResize,
  onUpdatePropColor,
  onPhotoReady,
  userId,
  profileId,
  undo,
  canUndo,
}: VisualizerStageProps) {
  const canvasRef = useRef<VisualizerCanvasHandle>(null)
  const [uploadOpen, setUploadOpen] = useState(false)
  const [nightSlider, setNightSlider] = useState(40)
  const [isZoomed, setIsZoomed] = useState(false)

  const handleResetView = useCallback(() => {
    canvasRef.current?.resetView()
    setIsZoomed(false)
  }, [])

  return (
    <div className="w-full overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950">
      <VisualizerToolbar
        tools={tools}
        activeTool={activeTool}
        onToolChange={onToolChange}
        selectedProp={selectedProp}
        onUpdateColor={onUpdatePropColor}
        onUploadPhoto={() => setUploadOpen(true)}
        onChangePhoto={() => setUploadOpen(true)}
        photoUrl={photoUrl}
        onResetView={handleResetView}
        showResetView={isZoomed}
        undo={undo}
        canUndo={canUndo}
      />
      {/* Night mode slider */}
      <div className="flex items-center gap-3 border-t border-zinc-800/60 bg-zinc-950 px-4 py-1.5">
        <span className="flex items-center gap-1.5 text-xs font-medium text-zinc-500">
          <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor"><path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" /></svg>
          Night mode
        </span>
        <input
          type="range"
          min={0}
          max={100}
          value={nightSlider}
          onChange={(e) => setNightSlider(Number(e.target.value))}
          className="h-1 w-28 cursor-pointer appearance-none rounded-full bg-zinc-700 accent-zinc-400"
        />
        <span className="w-7 text-right text-xs tabular-nums text-zinc-500">{nightSlider}%</span>
      </div>
      <VisualizerCanvas
        ref={canvasRef}
        photoUrl={photoUrl}
        nightOpacity={nightSlider / 100}
        props={props}
        selectedPropId={selectedPropId}
        activeTool={activeTool}
        onCanvasClick={onCanvasClick}
        onPropClick={onPropClick}
        onPropDrag={onPropDrag}
        onPropResize={onPropResize}
        onViewChange={setIsZoomed}
      />
      <UploadPhotoFlow
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        onPhotoReady={(url) => {
          onPhotoReady(url)
          setUploadOpen(false)
        }}
        userId={userId}
        profileId={profileId}
      />
    </div>
  )
}

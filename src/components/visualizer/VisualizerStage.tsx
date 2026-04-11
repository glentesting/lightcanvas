import { useRef, useState } from 'react'
import type { DisplayProp } from '../../types/display'
import type { PlacementTool } from '../../hooks/useVisualizerState'
import { VisualizerCanvas, type VisualizerCanvasHandle } from './VisualizerCanvas'
import { VisualizerToolbar } from './VisualizerToolbar'
import { UploadPhotoFlow } from './UploadPhotoFlow'

interface VisualizerStageProps {
  props: DisplayProp[]
  selectedPropId: string | null
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
}

export function VisualizerStage({
  props,
  selectedPropId,
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
}: VisualizerStageProps) {
  const canvasRef = useRef<VisualizerCanvasHandle>(null)
  const [uploadOpen, setUploadOpen] = useState(false)

  return (
    <div className="w-full overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950">
      <VisualizerToolbar
        activeTool={activeTool}
        onToolChange={onToolChange}
        selectedProp={selectedProp}
        onUpdateColor={onUpdatePropColor}
        onUploadPhoto={() => setUploadOpen(true)}
      />
      <VisualizerCanvas
        ref={canvasRef}
        photoUrl={photoUrl}
        props={props}
        selectedPropId={selectedPropId}
        activeTool={activeTool}
        onCanvasClick={onCanvasClick}
        onPropClick={onPropClick}
        onPropDrag={onPropDrag}
        onPropResize={onPropResize}
      />
      <UploadPhotoFlow
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        onPhotoReady={(url) => {
          onPhotoReady(url)
          setUploadOpen(false)
        }}
      />
    </div>
  )
}

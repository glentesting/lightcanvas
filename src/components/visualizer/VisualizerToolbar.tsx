import type { HouseType, PlacementTool } from '../../hooks/useVisualizerState'
import { TOOLS } from '../../hooks/useVisualizerState'
import type { DisplayProp } from '../../types/display'

const HOUSE_OPTIONS: { id: HouseType; label: string }[] = [
  { id: 'two-story', label: 'Two-Story' },
  { id: 'ranch', label: 'Ranch' },
  { id: 'craftsman', label: 'Craftsman' },
]

export const COLOR_PRESETS = [
  { label: 'Warm White', color: '#ffe8c0' },
  { label: 'Cool White', color: '#e8f4ff' },
  { label: 'Red', color: '#ff2020' },
  { label: 'Green', color: '#20ff40' },
  { label: 'Blue', color: '#4080ff' },
  { label: 'Amber', color: '#ffaa00' },
  { label: 'Purple', color: '#aa40ff' },
  { label: 'Pink', color: '#ff40aa' },
]

interface VisualizerToolbarProps {
  houseType: HouseType
  onHouseTypeChange: (id: HouseType) => void
  activeTool: PlacementTool | null
  onToolChange: (tool: PlacementTool | null) => void
  selectedProp: DisplayProp | null
  onUpdateColor?: (id: string, color: string) => void
  onUploadPhoto: () => void
}

export function VisualizerToolbar({
  houseType,
  onHouseTypeChange,
  activeTool,
  onToolChange,
  selectedProp,
  onUpdateColor,
  onUploadPhoto,
}: VisualizerToolbarProps) {
  return (
    <div className="bg-zinc-950 px-4 py-3">
      {/* Row 1: House style + upload + color picker */}
      <div className="flex flex-wrap items-center gap-2 py-1">
        <span className="mr-1 text-xs font-medium uppercase tracking-wider text-zinc-400">House</span>
        {HOUSE_OPTIONS.map((h) => (
          <button
            key={h.id}
            type="button"
            onClick={() => onHouseTypeChange(h.id)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
              houseType === h.id
                ? 'bg-zinc-700 text-zinc-100'
                : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
            }`}
          >
            {h.label}
          </button>
        ))}

        <button
          type="button"
          onClick={onUploadPhoto}
          className="rounded-lg px-3 py-1.5 text-sm font-medium text-zinc-300 transition hover:bg-zinc-800 hover:text-zinc-100"
        >
          Upload Photo
        </button>

        {selectedProp && onUpdateColor && (
          <div className="ml-2 flex items-center gap-2 border-l border-zinc-700 pl-3">
            <span className="text-xs font-medium text-zinc-400">Color:</span>
            {COLOR_PRESETS.map((preset) => (
              <button
                key={preset.label}
                type="button"
                title={preset.label}
                onClick={() => onUpdateColor(selectedProp.id, preset.color)}
                className={`h-4 w-4 shrink-0 rounded-full border transition ${
                  selectedProp.color === preset.color
                    ? 'border-white'
                    : 'border-zinc-500 hover:border-zinc-300'
                }`}
                style={{ backgroundColor: preset.color }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Row 2: Prop tools */}
      <div className="mt-1 flex flex-wrap items-center gap-2 border-t border-zinc-800/70 pt-2">
        <span className="mr-1 text-xs font-medium uppercase tracking-wider text-zinc-400">Tools</span>
        {TOOLS.map((tool) => (
          <button
            key={tool.id}
            type="button"
            title={tool.label}
            onClick={() => onToolChange(activeTool === tool.id ? null : tool.id)}
            className={`rounded-lg px-2.5 py-1.5 text-sm font-medium transition ${
              activeTool === tool.id
                ? tool.id === 'eraser'
                  ? 'bg-brand-red text-white'
                  : 'bg-brand-green text-white'
                : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
            }`}
          >
            {tool.label}
          </button>
        ))}
      </div>

      {/* Status bar */}
      {(selectedProp || activeTool) && (
        <div className="flex items-center gap-2 border-t border-zinc-700 pt-2 text-xs text-zinc-400">
          {activeTool && (
            <span>
              Tool: <strong className="text-zinc-100">{TOOLS.find((t) => t.id === activeTool)?.label}</strong>
              {activeTool === 'eraser' ? ' — click prop to remove' : ' — click to place'}
            </span>
          )}
          {selectedProp && !activeTool && (
            <span className="flex items-center gap-1.5">
              Selected: <strong className="text-zinc-100">{selectedProp.name}</strong>
              {selectedProp.color && (
                <span
                  className="inline-block h-2.5 w-2.5 rounded-full border border-zinc-500"
                  style={{ backgroundColor: selectedProp.color }}
                />
              )}
              <span className="text-zinc-500">Drag to move</span>
            </span>
          )}
        </div>
      )}
    </div>
  )
}

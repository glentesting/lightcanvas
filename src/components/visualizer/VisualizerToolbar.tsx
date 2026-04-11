import type { PlacementTool } from '../../hooks/useVisualizerState'
import { TOOLS } from '../../hooks/useVisualizerState'
import type { DisplayProp } from '../../types/display'

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
  activeTool: PlacementTool | null
  onToolChange: (tool: PlacementTool | null) => void
  selectedProp: DisplayProp | null
  onUpdateColor?: (id: string, color: string) => void
  onUploadPhoto: () => void
}

export function VisualizerToolbar({
  activeTool,
  onToolChange,
  selectedProp,
  onUpdateColor,
  onUploadPhoto,
}: VisualizerToolbarProps) {
  return (
    <div className="bg-zinc-950 px-4 py-3">
      {/* Tools row: Your House + prop tools + color picker */}
      <div className="flex flex-wrap items-center gap-2 py-1">
        <span className="mr-1 text-xs font-medium uppercase tracking-wider text-zinc-400">Tools</span>

        {/* Upload Photo — first in the row */}
        <button
          type="button"
          title="Upload a photo of your house"
          onClick={onUploadPhoto}
          className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium text-zinc-300 transition hover:bg-zinc-800 hover:text-zinc-100"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
          </svg>
          Your House
        </button>

        <span className="mx-1 h-4 border-l border-zinc-700" />

        {/* Prop placement tools */}
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

        {/* Color picker when prop selected */}
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

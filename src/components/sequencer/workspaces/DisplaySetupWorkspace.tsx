import { motion } from 'framer-motion'
import { Plus, Trash2 } from 'lucide-react'
import type { DisplayProp } from '../../../types/display'
import type { HousePhotoRow } from '../../../lib/phase1Repository'
import { useVisualizerState } from '../../../hooks/useVisualizerState'
import { VisualizerStage } from '../../visualizer/VisualizerStage'
import { propTypes } from '../types'

export interface DisplaySetupWorkspaceProps {
  controllers: number
  channelsPerController: number
  setControllers: (n: number) => void
  setChannelsPerController: (n: number) => void
  propsState: DisplayProp[]
  selectedPropId: string | null
  setSelectedPropId: (id: string | null) => void
  totalChannels: number
  usedChannels: number
  remainingChannels: number
  newPropName: string
  setNewPropName: (v: string) => void
  newPropType: string
  setNewPropType: (v: string) => void
  newPropChannels: number
  setNewPropChannels: (v: number) => void
  addProp: () => void
  removeProp: (id: string) => void
  quickAddProp: (type: string, x: number, y: number, houseType: string, opts?: { angle?: number; length?: number }) => void
  updatePropColor: (id: string, color: string) => void
  moveProp: (id: string, x: number, y: number) => void
  resizeProp: (id: string, length: number, angle: number) => void
  photoUrl: string | null
  onPhotoReady: (url: string) => void
  userId: string | null
  profileId: string | null
  housePhotos: HousePhotoRow[]
  onDeletePhoto: (photoId: string, storagePath: string) => void
  undo: () => void
  canUndo: boolean
}

const SEL_ACCENT = 'border-brand-green'
const fieldClass = 'w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-brand-green'
const labelClass = 'mb-1.5 block text-xs leading-tight text-slate-600'
const colHeading = 'mb-3 block text-xs font-medium uppercase tracking-[0.14em] text-slate-500'

export function DisplaySetupWorkspace({
  controllers, channelsPerController, setControllers, setChannelsPerController,
  propsState, selectedPropId, setSelectedPropId,
  totalChannels, usedChannels, remainingChannels,
  newPropName, setNewPropName, newPropType, setNewPropType,
  newPropChannels, setNewPropChannels,
  addProp, removeProp, quickAddProp, updatePropColor, moveProp, resizeProp,
  photoUrl, onPhotoReady,
  userId, profileId,
  housePhotos, onDeletePhoto,
  undo, canUndo,
}: DisplaySetupWorkspaceProps) {
  const capacityPct = Math.min(100, (usedChannels / Math.max(1, totalChannels)) * 100)

  const viz = useVisualizerState({
    props: propsState,
    selectedPropId,
    photoUrl,
    onSelectProp: setSelectedPropId,
    onPlaceProp: quickAddProp,
    onRemoveProp: removeProp,
    onMoveProp: moveProp,
    onUpdatePropColor: updatePropColor,
    onResizeProp: resizeProp,
  })

  return (
    <motion.div key="setup" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} className="w-full min-w-0 max-w-full space-y-6">
      <VisualizerStage
        props={viz.placedProps}
        selectedPropId={selectedPropId}
        tools={viz.tools}
        activeTool={viz.activeTool}
        selectedProp={viz.selectedProp}
        photoUrl={photoUrl}
        onToolChange={viz.setActiveTool}
        onCanvasClick={viz.handleCanvasClick}
        onPropClick={viz.handlePropClick}
        onPropDrag={viz.handlePropDrag}
        onPropResize={viz.handlePropResize}
        onUpdatePropColor={updatePropColor}
        onPhotoReady={onPhotoReady}
        userId={userId}
        profileId={profileId}
        undo={undo}
        canUndo={canUndo}
      />

      {/* Photo library */}
      {housePhotos.length > 0 && (
        <div className="rounded-xl border border-slate-200/90 bg-white px-4 py-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500">Your house photos</span>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {housePhotos.map((photo) => (
              <button
                key={photo.id}
                type="button"
                onClick={() => onPhotoReady(photo.public_url)}
                className={`group relative shrink-0 overflow-hidden rounded-lg border-2 transition ${
                  photoUrl === photo.public_url ? 'border-brand-green' : 'border-transparent hover:border-slate-300'
                }`}
              >
                <img
                  src={photo.public_url}
                  alt=""
                  className="h-10 w-[60px] object-cover"
                />
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); onDeletePhoto(photo.id, photo.storage_path) }}
                  className="absolute right-0.5 top-0.5 hidden rounded-full bg-black/60 p-0.5 text-white group-hover:block"
                  aria-label="Remove photo"
                >
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* White controls card */}
      <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-[0_12px_40px_-16px_rgba(15,23,42,0.12)]">
        <div className="grid gap-10 md:grid-cols-3 md:gap-10">
          {/* Col 1: Display setup */}
          <div>
            <h2 className={colHeading}>Display setup</h2>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-x-5 gap-y-3">
                <label className="block">
                  <span className={labelClass}>Controllers</span>
                  <input type="number" min={1} value={controllers} onChange={(e) => setControllers(Number(e.target.value || 1))} className={fieldClass} />
                </label>
                <label className="block">
                  <span className={labelClass}>Ch / controller</span>
                  <input type="number" min={1} value={channelsPerController} onChange={(e) => setChannelsPerController(Number(e.target.value || 1))} className={fieldClass} />
                </label>
              </div>
              <div className="space-y-2">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-xs text-slate-600">Capacity</span>
                  <span className="text-xs tabular-nums text-slate-600">{usedChannels}/{totalChannels} · {remainingChannels} free</span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
                  <div className="h-full bg-brand-green transition-[width] duration-300 ease-out" style={{ width: `${capacityPct}%` }} />
                </div>
              </div>
            </div>
          </div>

          {/* Col 2: Selection */}
          <div>
            <h2 className={colHeading}>Selection</h2>
            {viz.selectedProp ? (
              <div className={`space-y-2 border-l-2 ${SEL_ACCENT} pl-3 text-xs leading-relaxed text-slate-600`}>
                <div className="text-[1.05rem] font-semibold leading-snug tracking-tight text-slate-900">{viz.selectedProp.name}</div>
                <div>{viz.selectedProp.type} · {viz.selectedProp.controller} · ch {viz.selectedProp.start}–{viz.selectedProp.start + viz.selectedProp.channels - 1}</div>
                {viz.selectedProp.notes ? <p className="text-slate-700">{viz.selectedProp.notes}</p> : null}
              </div>
            ) : (
              <p className="text-xs leading-relaxed text-slate-500">Click a prop on the display above.</p>
            )}
          </div>

          {/* Col 3: Prop list + add prop */}
          <div>
            <h2 className={colHeading}>Props</h2>
            <div className="space-y-4">
              <div className="max-h-[min(48vh,420px)] overflow-y-auto rounded-lg border border-slate-200 bg-slate-50">
                {propsState.length === 0 ? (
                  <div className="px-4 py-8 text-center">
                    <p className="text-sm font-medium text-slate-800">No props on the display yet</p>
                    <p className="mt-2 text-xs leading-relaxed text-slate-500">
                      Use the tools on the canvas or fill out Add prop below to place your first element.
                    </p>
                  </div>
                ) : (
                  propsState.map((prop) => (
                    <PropMappingRow key={prop.id} prop={prop} selected={selectedPropId === prop.id} onSelect={() => setSelectedPropId(prop.id)} onRemove={() => removeProp(prop.id)} />
                  ))
                )}
              </div>
              <div className="border-t border-slate-200 pt-4">
                <span className={labelClass}>Add prop</span>
                <input value={newPropName} onChange={(e) => setNewPropName(e.target.value)} placeholder="Name" className={fieldClass} />
                <select value={newPropType} onChange={(e) => setNewPropType(e.target.value)} className={`${fieldClass} mt-2 cursor-pointer`}>
                  {propTypes.map((type) => (<option key={type}>{type}</option>))}
                </select>
                <input type="number" min={1} value={newPropChannels} onChange={(e) => setNewPropChannels(Number(e.target.value || 1))} className={`${fieldClass} mt-2`} />
                <button type="button" onClick={addProp}
                  className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white py-2.5 text-sm font-medium text-slate-800 transition hover:border-brand-green/60 hover:text-brand-green focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-green/40">
                  <Plus className="h-3.5 w-3.5 shrink-0" strokeWidth={2} aria-hidden /> Add prop
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

function PropMappingRow({ prop, selected, onSelect, onRemove }: { prop: DisplayProp; selected: boolean; onSelect: () => void; onRemove: () => void }) {
  return (
    <div className={`group flex border-b border-slate-200 last:border-b-0 ${selected ? `border-l-2 ${SEL_ACCENT} bg-white` : 'border-l-2 border-l-transparent hover:bg-white'}`}>
      <button type="button" onClick={onSelect} className="min-w-0 flex-1 py-2.5 pl-2.5 pr-1 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-green/50">
        <div className="flex items-center gap-1.5">
          {prop.color && <span className="inline-block h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: prop.color }} />}
          <span className={selected ? 'text-sm font-semibold tracking-tight text-slate-900' : 'text-sm font-normal text-slate-700'}>{prop.name}</span>
        </div>
        <div className="mt-0.5 flex flex-wrap gap-x-2 gap-y-0.5 text-xs text-slate-600">
          <span>{prop.type}</span><span>{prop.controller}</span><span>ch {prop.start}-{prop.start + prop.channels - 1}</span>
        </div>
      </button>
      <button type="button" aria-label={`Remove ${prop.name}`}
        className="shrink-0 self-start p-2 text-brand-red transition hover:text-brand-red-dark focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-red/40"
        onClick={onRemove}>
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}

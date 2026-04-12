import { useEffect, useRef, useState, type ChangeEvent, type ComponentType, type Dispatch, type MouseEvent, type RefObject, type SetStateAction } from 'react'
import type { SongAudioAnalysis } from '../../lib/audioAnalysis'
import type { DisplayProp } from '../../types/display'
import type { HousePhotoRow, UserPlan } from '../../lib/phase1Repository'
import type { Song } from '../../types/song'
import { useVisualizerState } from '../../hooks/useVisualizerState'
import { VisualizerStage } from '../visualizer/VisualizerStage'
import { VisualizerCanvas, type VisualizerCanvasHandle } from '../visualizer/VisualizerCanvas'
import { CopilotPanel } from './CopilotPanel'
import { SequencerHeader } from './SequencerHeader'
import { SequencerTabs } from './SequencerTabs'
import type { ChatMessage, Section, TabValue, TimelineEvent } from './types'
import { AISequencingWorkspace, type StylePreset } from './workspaces/AISequencingWorkspace'
import { DisplaySetupWorkspace } from './workspaces/DisplaySetupWorkspace'
import { ExportWorkspace } from './workspaces/ExportWorkspace'
import type { LorImportResult } from '../../lib/importLor'
import { SongsWorkspace } from './workspaces/SongsWorkspace'
import { TimelineWorkspace } from './workspaces/TimelineWorkspace'
import { formatTime } from './utils'
import { Pause, Pencil, Play, X } from 'lucide-react'

const EFFECT_COLORS: Record<string, string> = {
  'Mouth Sync': '#22c55e',
  Pulse: '#3b82f6',
  Sweep: '#a855f7',
  Twinkle: '#fbbf24',
  Chase: '#f97316',
  Hold: '#64748b',
  'Color Pop': '#ec4899',
  Shimmer: '#14b8a6',
  Fan: '#06b6d4',
  Ripple: '#84cc16',
}

export interface SequencerShellProps {
  activeTab: TabValue
  setActiveTab: Dispatch<SetStateAction<TabValue>>
  rebuildAnalyzing: boolean
  rebuildPhase: 'idle' | 'decode' | 'sequence'
  runAi: () => void
  stylePreset: StylePreset
  onStylePresetChange: (preset: StylePreset) => void
  controllers: number
  channelsPerController: number
  usedChannels: number
  totalChannels: number
  selectedSong: Song
  analysisProgress: number
  signOut: () => void | Promise<void>
  userEmail: string | undefined
  setControllers: (n: number) => void
  setChannelsPerController: (n: number) => void
  propsState: DisplayProp[]
  selectedPropId: string | null
  setSelectedPropId: (id: string | null) => void
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
  songs: Song[]
  selectedSongId: string | null
  setSelectedSongId: Dispatch<SetStateAction<string | null>>
  songFileInputRef: RefObject<HTMLInputElement | null>
  handleSongFileChange: (e: ChangeEvent<HTMLInputElement>) => void
  triggerSongFilePicker: () => void
  songUploading: boolean
  songUploadError: string | null
  songDeleteError: string | null
  handleDeleteSong: (song: Song, ev: MouseEvent) => void | Promise<void>
  songAnalyses: Record<string, SongAudioAnalysis>
  analysisItems: [string, string, string][]
  SongLibraryInlineAudio: ComponentType<{ song: Song }>
  SongWorkspaceAudio: ComponentType<{ song: Song }>
  AnalysisBeatStrip: ComponentType<{ beatTimes: number[]; duration: number }>
  AnalysisBandRows: ComponentType<Pick<SongAudioAnalysis, 'bassSeries' | 'trebleSeries' | 'vocalSeries'>>
  complexity: number
  setComplexity: (n: number) => void
  sections: Section[]
  propEvents: TimelineEvent[]
  selectedEventId: string | null
  setSelectedEventId: (id: string | null) => void
  selectedEvent: TimelineEvent | null
  events: TimelineEvent[]
  exportPayload: string
  playing: boolean
  setPlaying: Dispatch<SetStateAction<boolean>>
  chat: ChatMessage[]
  chatInput: string
  setChatInput: Dispatch<SetStateAction<string>>
  applyCopilot: () => void | Promise<void>
  copilotBusy: boolean
  previewTime: number
  sequenceEventsForPreview: TimelineEvent[]
  patchTimelineEvent: (id: string, patch: Partial<TimelineEvent>) => void
  onDeleteEvent: (id: string) => void
  onSeek: (time: number) => void
  timelineSong: Song
  timelineEvents: TimelineEvent[]
  timelineSongId: string | null
  setTimelineSongId: Dispatch<SetStateAction<string | null>>
  timelineSequenceSource: 'formula' | 'stored'
  setTimelineSequenceSource: Dispatch<SetStateAction<'formula' | 'stored'>>
  runAudioAnalysis: () => void | Promise<void>
  songAnalysisBusy: boolean
  photoUrl: string | null
  onPhotoReady: (url: string) => void
  userId: string | null
  profileId: string | null
  housePhotos: HousePhotoRow[]
  onDeletePhoto: (photoId: string, storagePath: string) => void
  userPlan: UserPlan
  onRenameProp?: (id: string, name: string) => void
  onRechannelProp?: (id: string, channels: number) => void
  onClearAllProps: () => void
  onImportLor?: (result: LorImportResult) => void
  audioBlob?: Blob | null
  undo: () => void
  canUndo: boolean
}

export function SequencerShell(props: SequencerShellProps) {
  const {
    activeTab, setActiveTab,
    rebuildAnalyzing, rebuildPhase, runAi, stylePreset, onStylePresetChange,
    controllers, channelsPerController, usedChannels, totalChannels,
    selectedSong, analysisProgress, signOut, userEmail,
    setControllers, setChannelsPerController,
    propsState, selectedPropId, setSelectedPropId, remainingChannels,
    newPropName, setNewPropName, newPropType, setNewPropType,
    newPropChannels, setNewPropChannels,
    addProp, removeProp, quickAddProp, updatePropColor, moveProp, resizeProp,
    songs, selectedSongId, setSelectedSongId,
    songFileInputRef, handleSongFileChange, triggerSongFilePicker,
    songUploading, songUploadError, songDeleteError, handleDeleteSong,
    songAnalyses, analysisItems,
    SongLibraryInlineAudio, SongWorkspaceAudio, AnalysisBeatStrip, AnalysisBandRows,
    complexity, setComplexity, sections, propEvents,
    selectedEventId, setSelectedEventId, selectedEvent, events, exportPayload,
    playing, setPlaying,
    chat, chatInput, setChatInput, applyCopilot, copilotBusy,
    previewTime, sequenceEventsForPreview,
    patchTimelineEvent, onDeleteEvent, onSeek,
    timelineSong, timelineEvents, timelineSongId, setTimelineSongId,
    timelineSequenceSource, setTimelineSequenceSource,
    runAudioAnalysis, songAnalysisBusy,
    photoUrl, onPhotoReady, userId, profileId,
    housePhotos, onDeletePhoto,
    userPlan,
    onRenameProp, onRechannelProp, onClearAllProps,
    onImportLor, audioBlob,
    undo, canUndo,
  } = props

  const [editingDisplay, setEditingDisplay] = useState(false)
  const [previewNightOpacity, setPreviewNightOpacity] = useState(0.45)

  // Visualizer state for edit mode
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

  // Preview canvas ref for animation
  const previewCanvasRef = useRef<VisualizerCanvasHandle>(null)
  const previewTimeRef = useRef(previewTime)
  useEffect(() => { previewTimeRef.current = previewTime }, [previewTime])
  const seqEventsRef = useRef(sequenceEventsForPreview)
  useEffect(() => { seqEventsRef.current = sequenceEventsForPreview }, [sequenceEventsForPreview])

  // Animation loop — drives the main visualizer
  useEffect(() => {
    if (editingDisplay) return // no animation in edit mode
    if (!playing) {
      const ambient = setInterval(() => {
        previewCanvasRef.current?.triggerFrame({
          beatStrength: 0.3 + Math.sin(Date.now() / 1000) * 0.1,
          bassStrength: 0.2,
          trebleStrength: 0.2,
          vocalConfidence: 0,
          timestamp: 0,
        })
      }, 200)
      return () => clearInterval(ambient)
    }
    const interval = setInterval(() => {
      const t = previewTimeRef.current
      const evts = seqEventsRef.current
      if (!evts.length) {
        previewCanvasRef.current?.triggerFrame({
          beatStrength: 0.5, bassStrength: 0.4, trebleStrength: 0.4, vocalConfidence: 0.1, timestamp: t,
        })
        return
      }
      const activePropIds = new Set<string>()
      const effectsByPropId = new Map<string, string>()
      const intensityByPropId = new Map<string, number>()
      evts.filter(e => e.start <= t && e.end > t).forEach(e => {
        activePropIds.add(e.propId)
        effectsByPropId.set(e.propId, e.effect)
        intensityByPropId.set(e.propId, e.intensity / 100)
      })
      const hasEffect = (effects: string[]) =>
        [...effectsByPropId.values()].some(e => effects.includes(e))
      console.log('[SequencerShell] activePropIds', [...activePropIds], 'previewTime', t)
      previewCanvasRef.current?.triggerFrame({
        beatStrength: hasEffect(['Pulse', 'Chase', 'Sweep', 'Color Pop']) ? 0.85 : 0.2,
        bassStrength: hasEffect(['Pulse', 'Sweep', 'Fan']) ? 0.75 : 0.15,
        trebleStrength: hasEffect(['Twinkle', 'Shimmer', 'Ripple']) ? 0.75 : 0.15,
        vocalConfidence: hasEffect(['Mouth Sync']) ? 0.95 : 0.05,
        timestamp: t,
        activePropIds,
        effectsByPropId,
        intensityByPropId,
      })
    }, 50)
    return () => clearInterval(interval)
  }, [playing, editingDisplay])

  // Redirect legacy 'setup' tab
  useEffect(() => {
    if (activeTab === 'setup') setActiveTab('songs')
  }, [activeTab, setActiveTab])

  const duration = Math.max(0.001, selectedSong.duration)
  const activeEvents = sequenceEventsForPreview.filter(e => previewTime >= e.start && previewTime < e.end)

  return (
    <div className="flex min-h-0 w-full flex-1 flex-col bg-[#f4f5f8] text-slate-900 antialiased">
      {/* Header */}
      <div className="border-b border-slate-200/90 bg-white shadow-[0_1px_0_rgba(15,23,42,0.04)]">
        <div className="mx-auto max-w-7xl px-4 md:px-6">
          <div className="flex flex-col gap-0.5 py-2 md:py-2.5">
            <SequencerHeader signOut={signOut} userEmail={userEmail} />
          </div>
        </div>
      </div>

      {/* TOP: Always-visible visualizer */}
      <div className="w-full border-b border-slate-200">
        <div className="mx-auto max-w-7xl px-4 md:px-6">
          {editingDisplay ? (
            /* Edit mode: full VisualizerStage with toolbar + prop list sidebar */
            <div className="py-4">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Edit Display</span>
                <button
                  type="button"
                  onClick={() => setEditingDisplay(false)}
                  className="flex items-center gap-1 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-slate-800"
                >
                  <X className="h-3.5 w-3.5" /> Done editing
                </button>
              </div>
              <div className="grid gap-5 lg:grid-cols-[1fr_minmax(260px,320px)]">
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
                <DisplaySetupWorkspace
                  controllers={controllers}
                  channelsPerController={channelsPerController}
                  setControllers={setControllers}
                  setChannelsPerController={setChannelsPerController}
                  propsState={propsState}
                  selectedPropId={selectedPropId}
                  setSelectedPropId={setSelectedPropId}
                  totalChannels={totalChannels}
                  usedChannels={usedChannels}
                  remainingChannels={remainingChannels}
                  newPropName={newPropName}
                  setNewPropName={setNewPropName}
                  newPropType={newPropType}
                  setNewPropType={setNewPropType}
                  newPropChannels={newPropChannels}
                  setNewPropChannels={setNewPropChannels}
                  addProp={addProp}
                  removeProp={removeProp}
                  photoUrl={photoUrl}
                  onPhotoReady={onPhotoReady}
                  housePhotos={housePhotos}
                  onDeletePhoto={onDeletePhoto}
                  onRenameProp={onRenameProp}
                  onRechannelProp={onRechannelProp}
                  onClearAllProps={onClearAllProps}
                />
              </div>
            </div>
          ) : (
            /* Preview mode: full-width canvas with overlay controls */
            <div className="relative py-3">
              <div className="overflow-hidden rounded-xl border border-zinc-800" style={{ maxHeight: '50vh' }}>
                <VisualizerCanvas
                  ref={previewCanvasRef}
                  photoUrl={photoUrl}
                  nightOpacity={playing ? 0.85 : previewNightOpacity}
                  props={propsState.filter(p => p.canvasX != null && p.canvasY != null)}
                  selectedPropId={null}
                  activeTool={null}
                  onCanvasClick={() => {}}
                  onPropClick={() => {}}
                  onPropDrag={() => {}}
                  onPropResize={() => {}}
                  onViewChange={() => {}}
                  minHeight="35vh"
                />
              </div>
              {/* Overlay controls */}
              <div className="absolute bottom-5 left-5 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setPlaying(p => !p)}
                  disabled={propsState.length === 0}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-sm transition hover:bg-black/80 disabled:opacity-40"
                >
                  {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                </button>
                <span className="rounded-md bg-black/50 px-2 py-1 text-xs tabular-nums text-white/80 backdrop-blur-sm">
                  {formatTime(previewTime)} / {formatTime(duration)}
                </span>
                <div className="flex items-center gap-1.5 rounded-md bg-black/50 px-2 py-1 backdrop-blur-sm">
                  <svg className="h-3 w-3 text-white/60" viewBox="0 0 20 20" fill="currentColor"><path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" /></svg>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={previewNightOpacity}
                    onChange={(e) => setPreviewNightOpacity(Number(e.target.value))}
                    className="h-1 w-16 cursor-pointer appearance-none rounded-full bg-white/30 accent-white/80"
                  />
                </div>
              </div>
              <div className="absolute right-5 top-5 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setEditingDisplay(true)}
                  className="flex items-center gap-1.5 rounded-lg bg-black/50 px-3 py-1.5 text-xs font-medium text-white/90 backdrop-blur-sm transition hover:bg-black/70"
                >
                  <Pencil className="h-3.5 w-3.5" /> Edit Display
                </button>
              </div>
              {/* Now Playing overlay */}
              {activeEvents.length > 0 && (
                <div className="absolute bottom-5 right-5 max-h-[140px] w-40 overflow-y-auto rounded-lg bg-black/40 p-2.5 backdrop-blur-sm">
                  <div className="mb-1 text-[9px] font-semibold uppercase tracking-wider text-white/50">Now playing</div>
                  <div className="space-y-0.5">
                    {activeEvents.slice(0, 5).map(e => (
                      <div key={e.id} className="flex items-center gap-1.5 text-[10px]">
                        <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: EFFECT_COLORS[e.effect] ?? '#94a3b8' }} />
                        <span className="truncate text-white/80">{e.propName}</span>
                        <span className="shrink-0 text-white/50">{e.effect}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* BOTTOM: Tabbed workspace panel */}
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-7xl px-4 md:px-6">
          <div className="sticky top-0 z-10 -mx-4 bg-[#f4f5f8] px-4 pb-1 pt-3 md:-mx-6 md:px-6">
            <SequencerTabs value={activeTab === 'setup' ? 'songs' : activeTab} onChange={setActiveTab} />
          </div>
          <div className="min-w-0 w-full max-w-full space-y-6 pb-12">
            {activeTab === 'songs' && (
              <SongsWorkspace
                songs={songs}
                selectedSong={selectedSong}
                selectedSongId={selectedSongId}
                setSelectedSongId={setSelectedSongId}
                songFileInputRef={songFileInputRef}
                handleSongFileChange={handleSongFileChange}
                triggerSongFilePicker={triggerSongFilePicker}
                songUploading={songUploading}
                songUploadError={songUploadError}
                songDeleteError={songDeleteError}
                handleDeleteSong={handleDeleteSong}
                songAnalyses={songAnalyses}
                analysisItems={analysisItems}
                SongLibraryInlineAudio={SongLibraryInlineAudio}
                SongWorkspaceAudio={SongWorkspaceAudio}
                AnalysisBeatStrip={AnalysisBeatStrip}
                AnalysisBandRows={AnalysisBandRows}
                runAudioAnalysis={runAudioAnalysis}
                songAnalysisBusy={songAnalysisBusy}
                userPlan={userPlan}
              />
            )}

            {activeTab === 'ai' && (
              <>
                <AISequencingWorkspace
                  analysisProgress={analysisProgress}
                  complexity={complexity}
                  setComplexity={setComplexity}
                  runAi={runAi}
                  rebuildAnalyzing={rebuildAnalyzing}
                  rebuildPhase={rebuildPhase}
                  selectedSong={selectedSong}
                  sections={sections}
                  propsState={propsState}
                  stylePreset={stylePreset}
                  onStylePresetChange={onStylePresetChange}
                />
                <CopilotPanel
                  chat={chat}
                  chatInput={chatInput}
                  setChatInput={setChatInput}
                  applyCopilot={applyCopilot}
                  copilotBusy={copilotBusy}
                />
              </>
            )}

            {activeTab === 'timeline' && (
              <TimelineWorkspace
                propsState={propsState}
                selectedPropId={selectedPropId}
                setSelectedPropId={setSelectedPropId}
                selectedSong={timelineSong}
                songs={songs}
                timelineSongId={timelineSongId}
                setTimelineSongId={setTimelineSongId}
                timelineSequenceSource={timelineSequenceSource}
                setTimelineSequenceSource={setTimelineSequenceSource}
                propEvents={propEvents}
                allEvents={timelineEvents}
                selectedEventId={selectedEventId}
                setSelectedEventId={setSelectedEventId}
                selectedEvent={selectedEvent}
                patchTimelineEvent={patchTimelineEvent}
                sections={sections}
                playing={playing}
                previewTime={previewTime}
                beatTimes={songAnalyses[timelineSong.id]?.beatTimes ?? []}
                onSeek={onSeek}
                onDeleteEvent={onDeleteEvent}
              />
            )}

            {activeTab === 'export' && (
              <ExportWorkspace
                selectedSong={selectedSong}
                propsState={propsState}
                totalChannels={totalChannels}
                events={events}
                exportPayload={exportPayload}
                controllers={controllers}
                channelsPerController={channelsPerController}
                onImportLor={onImportLor}
                audioBlob={audioBlob}
                userPlan={userPlan}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

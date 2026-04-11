import type { ChangeEvent, ComponentType, Dispatch, MouseEvent, RefObject, SetStateAction } from 'react'
import type { SongAudioAnalysis } from '../../lib/audioAnalysis'
import type { DisplayProp } from '../../types/display'
import type { HousePhotoRow, UserPlan } from '../../lib/phase1Repository'
import type { Song } from '../../types/song'
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

export function SequencerShell({
  activeTab,
  setActiveTab,
  rebuildAnalyzing,
  rebuildPhase,
  runAi,
  stylePreset,
  onStylePresetChange,
  controllers,
  channelsPerController,
  usedChannels,
  totalChannels,
  selectedSong,
  analysisProgress,
  signOut,
  userEmail,
  setControllers,
  setChannelsPerController,
  propsState,
  selectedPropId,
  setSelectedPropId,
  remainingChannels,
  newPropName,
  setNewPropName,
  newPropType,
  setNewPropType,
  newPropChannels,
  setNewPropChannels,
  addProp,
  removeProp,
  quickAddProp,
  updatePropColor,
  moveProp,
  resizeProp,
  songs,
  selectedSongId,
  setSelectedSongId,
  songFileInputRef,
  handleSongFileChange,
  triggerSongFilePicker,
  songUploading,
  songUploadError,
  songDeleteError,
  handleDeleteSong,
  songAnalyses,
  analysisItems,
  SongLibraryInlineAudio,
  SongWorkspaceAudio,
  AnalysisBeatStrip,
  AnalysisBandRows,
  complexity,
  setComplexity,
  sections,
  propEvents,
  selectedEventId,
  setSelectedEventId,
  selectedEvent,
  events,
  exportPayload,
  playing,
  setPlaying,
  chat,
  chatInput,
  setChatInput,
  applyCopilot,
  copilotBusy,
  previewTime,
  sequenceEventsForPreview,
  patchTimelineEvent,
  onDeleteEvent,
  onSeek,
  timelineSong,
  timelineEvents,
  timelineSongId,
  setTimelineSongId,
  timelineSequenceSource,
  setTimelineSequenceSource,
  runAudioAnalysis,
  songAnalysisBusy,
  photoUrl,
  onPhotoReady,
  userId,
  profileId,
  housePhotos,
  onDeletePhoto,
  userPlan,
  onRenameProp,
  onRechannelProp,
  onClearAllProps,
  onImportLor,
  audioBlob,
  undo,
  canUndo,
}: SequencerShellProps) {
  return (
    <div className="w-full min-h-0 flex-1 bg-[#f4f5f8] pb-12 text-slate-900 antialiased">
      <div className="border-b border-slate-200/90 bg-white shadow-[0_1px_0_rgba(15,23,42,0.04)]">
        <div className="mx-auto max-w-7xl px-4 md:px-6">
          <div className="flex flex-col gap-0.5 py-2 md:py-2.5">
            <SequencerHeader signOut={signOut} userEmail={userEmail} />
            <SequencerTabs value={activeTab} onChange={setActiveTab} />
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 md:px-6">
        <div className="min-w-0 w-full max-w-full space-y-6">
          <>
            {activeTab === 'setup' && (
              <DisplaySetupWorkspace
                key="setup"
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
                quickAddProp={quickAddProp}
                updatePropColor={updatePropColor}
                moveProp={moveProp}
                resizeProp={resizeProp}
                photoUrl={photoUrl}
                onPhotoReady={onPhotoReady}
                userId={userId}
                profileId={profileId}
                housePhotos={housePhotos}
                onDeletePhoto={onDeletePhoto}
                onRenameProp={onRenameProp}
                onRechannelProp={onRechannelProp}
                onClearAllProps={onClearAllProps}
                undo={undo}
                canUndo={canUndo}
              />
            )}
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
            {activeTab === 'ai' && (
              <CopilotPanel
                playing={playing}
                setPlaying={setPlaying}
                chat={chat}
                chatInput={chatInput}
                setChatInput={setChatInput}
                applyCopilot={applyCopilot}
                copilotBusy={copilotBusy}
                propsState={propsState}
                selectedSong={selectedSong}
                previewTime={previewTime}
                sequenceEvents={sequenceEventsForPreview}
                photoUrl={photoUrl}
              />
            )}
          </>
        </div>
      </div>
    </div>
  )
}

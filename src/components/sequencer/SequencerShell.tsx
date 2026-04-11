import type { ChangeEvent, ComponentType, Dispatch, MouseEvent, RefObject, SetStateAction } from 'react'
import type { SongAudioAnalysis } from '../../lib/audioAnalysis'
import type { DisplayProp } from '../../types/display'
import type { Song } from '../../types/song'
import { CopilotPanel } from './CopilotPanel'
import { SequencerHeader } from './SequencerHeader'
import { SequencerTabs } from './SequencerTabs'
import type { HouseTemplateId } from '../HouseTemplates'
import type { ChatMessage, Section, TabValue, TimelineEvent } from './types'
import { AISequencingWorkspace } from './workspaces/AISequencingWorkspace'
import { DisplaySetupWorkspace } from './workspaces/DisplaySetupWorkspace'
import { ExportWorkspace } from './workspaces/ExportWorkspace'
import { SongsWorkspace } from './workspaces/SongsWorkspace'
import { TimelineWorkspace } from './workspaces/TimelineWorkspace'

export interface SequencerShellProps {
  activeTab: TabValue
  setActiveTab: Dispatch<SetStateAction<TabValue>>
  rebuildAnalyzing: boolean
  rebuildPhase: 'idle' | 'decode' | 'sequence'
  runAi: () => void
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
  displayHouseType: HouseTemplateId
  setDisplayHouseType: (id: HouseTemplateId) => void
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
}

export function SequencerShell({
  activeTab,
  setActiveTab,
  rebuildAnalyzing,
  rebuildPhase,
  runAi,
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
  displayHouseType,
  setDisplayHouseType,
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
                photoUrl={photoUrl}
                onPhotoReady={onPhotoReady}
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
              />
            )}

            {activeTab === 'export' && (
              <ExportWorkspace
                selectedSong={selectedSong}
                propsState={propsState}
                totalChannels={totalChannels}
                events={events}
                exportPayload={exportPayload}
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
                houseType={displayHouseType}
                onHouseTypeChange={setDisplayHouseType}
              />
            )}
          </>
        </div>
      </div>
    </div>
  )
}

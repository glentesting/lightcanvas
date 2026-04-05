import { AnimatePresence } from 'framer-motion'
import type { ChangeEvent, ComponentType, Dispatch, MouseEvent, RefObject, SetStateAction } from 'react'
import type { SongAudioAnalysis } from '../../lib/audioAnalysis'
import type { DisplayProp } from '../../types/display'
import type { Song } from '../../types/song'
import { CopilotPanel } from './CopilotPanel'
import { SequencerHeader } from './SequencerHeader'
import { SequencerTabs } from './SequencerTabs'
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
  propsMappedCount: number
  usedChannels: number
  totalChannels: number
  selectedSong: Song
  analysisProgress: number
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
  applyCopilot: () => void
}

export function SequencerShell({
  activeTab,
  setActiveTab,
  rebuildAnalyzing,
  rebuildPhase,
  runAi,
  controllers,
  channelsPerController,
  propsMappedCount,
  usedChannels,
  totalChannels,
  selectedSong,
  analysisProgress,
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
}: SequencerShellProps) {
  return (
    <div className="w-full bg-gradient-to-b from-slate-50 via-white to-slate-100 pb-6 text-slate-900">
      <div className="mx-auto max-w-7xl p-6 md:p-10">
        <SequencerHeader
          rebuildAnalyzing={rebuildAnalyzing}
          rebuildPhase={rebuildPhase}
          runAi={runAi}
          controllers={controllers}
          channelsPerController={channelsPerController}
          propsMappedCount={propsMappedCount}
          usedChannels={usedChannels}
          totalChannels={totalChannels}
          selectedSong={selectedSong}
          analysisProgress={analysisProgress}
        />

        <div className="min-w-0 w-full max-w-full space-y-6">
          <SequencerTabs value={activeTab} onChange={setActiveTab} />
          <AnimatePresence mode="wait">
            {activeTab === 'setup' && (
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
                selectedSong={selectedSong}
                sections={sections}
                propEvents={propEvents}
                selectedEventId={selectedEventId}
                setSelectedEventId={setSelectedEventId}
                selectedEvent={selectedEvent}
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
          </AnimatePresence>

          <CopilotPanel
            playing={playing}
            setPlaying={setPlaying}
            chat={chat}
            chatInput={chatInput}
            setChatInput={setChatInput}
            applyCopilot={applyCopilot}
          />
        </div>
      </div>
    </div>
  )
}

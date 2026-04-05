import { motion } from 'framer-motion'
import { Sparkles } from 'lucide-react'
import type { Song } from '../../types/song'
import { LightCanvasWordmark } from '../LightCanvasWordmark'
import { formatTime } from './utils'
import { Button } from './shared/Button'
import { Stat } from './shared/Stat'

export interface SequencerHeaderProps {
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
}

export function SequencerHeader({
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
}: SequencerHeaderProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-8 overflow-hidden rounded-[28px] border border-slate-200 bg-white/90 shadow-xl shadow-slate-300/40 backdrop-blur-sm"
    >
      <div className="grid gap-8 p-8 md:grid-cols-[1.2fr_0.8fr] md:gap-10 md:p-10">
        <div className="min-w-0">
          <div className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
            Full sequencing prototype
          </div>
          <LightCanvasWordmark
            as="h1"
            className="mt-4 text-4xl font-semibold tracking-tight text-slate-900 md:text-5xl"
          />
          <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600 md:text-lg">
            Playable LightCanvas workspace: display setup, song library, AI sequencing, timeline,
            and export — with real uploads and account-backed display data where wired.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button disabled={rebuildAnalyzing} onClick={runAi}>
              <Sparkles className="h-4 w-4" />{' '}
              {rebuildAnalyzing
                ? rebuildPhase === 'sequence'
                  ? 'Generating sequence…'
                  : 'Analyzing…'
                : 'Rebuild Sequence'}
            </Button>
          </div>
        </div>
        <div className="grid min-w-0 grid-cols-2 gap-3 sm:gap-4">
          <Stat label="Controllers" value={controllers} sub={`${channelsPerController} ch each`} />
          <Stat label="Props mapped" value={propsMappedCount} sub={`${usedChannels}/${totalChannels} ch used`} />
          <Stat
            label="Song"
            value={selectedSong.bpm != null ? selectedSong.bpm : '—'}
            sub={`${selectedSong.key} · ${formatTime(selectedSong.duration)}`}
          />
          <Stat label="AI readiness" value={`${analysisProgress}%`} sub={selectedSong.status} />
        </div>
      </div>
    </motion.div>
  )
}

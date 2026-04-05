import { motion } from 'framer-motion'
import { Mic2, Sparkles, Wand2 } from 'lucide-react'
import type { DisplayProp } from '../../../types/display'
import type { Song } from '../../../types/song'
import type { Section } from '../types'
import { formatTime } from '../utils'
import { Button } from '../shared/Button'
import { Card } from '../shared/Card'
import { CardHeader } from '../shared/CardHeader'
import { Progress } from '../shared/Progress'
import { SliderRow } from '../shared/SliderRow'
import { Stat } from '../shared/Stat'

export interface AISequencingWorkspaceProps {
  analysisProgress: number
  complexity: number
  setComplexity: (n: number) => void
  runAi: () => void
  rebuildAnalyzing: boolean
  rebuildPhase: 'idle' | 'decode' | 'sequence'
  selectedSong: Song
  sections: Section[]
  propsState: DisplayProp[]
}

export function AISequencingWorkspace({
  analysisProgress,
  complexity,
  setComplexity,
  runAi,
  rebuildAnalyzing,
  rebuildPhase,
  selectedSong,
  sections,
  propsState,
}: AISequencingWorkspaceProps) {
  return (
    <motion.div
      key="ai"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      className="grid w-full min-w-0 max-w-full gap-6 lg:grid-cols-[1fr_1fr] lg:items-start"
    >
      <Card>
        <CardHeader
          title="AI Auto-Sequencing"
          description="Controls and fake depth around how the real sequencing engine would think."
          icon={Wand2}
        />
        <div className="space-y-6 p-6">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium">Analysis pipeline</div>
                <div className="text-sm text-slate-500">
                  Beat, bass, treble, vocals, phrasing, dynamic range, transition shaping.
                </div>
              </div>
              <div className="rounded-full bg-brand-green px-3 py-1 text-xs text-white shadow-brand-soft">
                {analysisProgress}%
              </div>
            </div>
            <div className="mt-4">
              <Progress value={analysisProgress} />
            </div>
          </div>
          <SliderRow label="Sequence complexity" value={complexity} onChange={setComplexity} />
          <SliderRow label="Face sync priority" value={88} onChange={() => {}} />
          <SliderRow label="Bass reactivity" value={72} onChange={() => {}} />
          <SliderRow label="Transition smoothness" value={61} onChange={() => {}} />
          <SliderRow label="Finale escalation" value={90} onChange={() => {}} />
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm leading-7 text-slate-600">
            <div className="font-medium text-brand-green">Fake scope details</div>
            <div className="mt-2">
              In a real build, this panel would let the user choose between sequencing styles, phrase
              density, effect families, safety rails for beginners, more advanced layering rules, and
              whether the AI should favor clarity, spectacle, or controller efficiency.
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button disabled={rebuildAnalyzing} onClick={runAi}>
              <Sparkles className="h-4 w-4" />{' '}
              {rebuildAnalyzing
                ? rebuildPhase === 'sequence'
                  ? 'Generating sequence…'
                  : 'Analyzing…'
                : 'Rebuild Full Sequence'}
            </Button>
            <Button variant="secondary">Re-analyze Audio</Button>
            <Button variant="secondary">Re-map Props</Button>
          </div>
        </div>
      </Card>
      <Card>
        <CardHeader
          title="Talking Face Sync"
          description="Dedicated fake detail for vocal-to-mouth sequencing."
          icon={Mic2}
        />
        <div className="space-y-5 p-6">
          <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-3">
            <Stat
              label="Assigned Prop"
              value={propsState.find((p) => p.type === 'Talking Face')?.name ?? 'None'}
              sub="Vocal lead"
            />
            <Stat
              label="Vocal Confidence"
              value={`${selectedSong.analysis.vocals}%`}
              sub="Phrase detect"
            />
            <Stat label="Mode" value="Phrase + Mouth" sub="Prototype logic" valueTruncate />
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="font-medium text-brand-red">Detected vocal phrase windows</div>
            <div className="mt-4 space-y-3">
              {sections
                .filter((s) => s.vocals)
                .map((s) => (
                  <div
                    key={s.name + s.start}
                    className="flex items-center justify-between rounded-xl bg-slate-50 p-3 text-sm"
                  >
                    <span className="font-medium">
                      {formatTime(s.start)} – {formatTime(s.end)}
                    </span>
                    <span className="text-slate-500">{s.name} · fake mouth cue block</span>
                  </div>
                ))}
            </div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm leading-7 text-slate-600">
            <div className="font-medium text-brand-green">Fake scope details</div>
            <div className="mt-2">
              The real version would support phoneme approximation, face presets, hold states between
              phrases, alternate mouth maps, and phrase cleanup rules for noisy vocals or overlapping
              instrumentation.
            </div>
          </div>
        </div>
      </Card>
    </motion.div>
  )
}

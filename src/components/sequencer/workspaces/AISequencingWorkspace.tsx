import { useState } from 'react'
import { motion } from 'framer-motion'
import { Sparkles } from 'lucide-react'
import type { DisplayProp } from '../../../types/display'
import type { Song } from '../../../types/song'
import type { Section } from '../types'
import { formatTime } from '../utils'
import { Button } from '../shared/Button'
import { InfoPopover } from '../shared/InfoPopover'
import { Progress } from '../shared/Progress'
import { SliderRow } from '../shared/SliderRow'

export type StylePreset = 'beginner' | 'standard' | 'spectacular'

const STYLE_PRESETS: { value: StylePreset; label: string; description: string }[] = [
  { value: 'beginner', label: 'Beginner', description: 'Simple, easy to wire' },
  { value: 'standard', label: 'Standard', description: 'Balanced show' },
  { value: 'spectacular', label: 'Spectacular', description: 'Dense, all-out' },
]

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
  stylePreset: StylePreset
  onStylePresetChange: (preset: StylePreset) => void
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
  stylePreset,
  onStylePresetChange,
}: AISequencingWorkspaceProps) {
  return (
    <motion.div
      key="ai"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      className="w-full min-w-0 max-w-full space-y-8 rounded-2xl border border-slate-200/90 bg-white p-7 shadow-[0_12px_40px_-16px_rgba(15,23,42,0.1)]"
    >
      <p className="text-[15px] leading-relaxed text-slate-600">
        Tune how dense your show feels, then run a full rebuild. The live preview and copilot below use the same props and
        song data as the rest of the app.
      </p>

      <div className="grid gap-10 lg:grid-cols-2 lg:gap-12">
        <div className="space-y-8 rounded-2xl border border-slate-200/80 bg-slate-50/50 p-6">
          <section className="space-y-3">
            <InfoPopover title="Analysis pipeline">
              <p>
                Shows how far your song has been analyzed (beats, bass, treble, vocals, dynamics). That data is what the
                sequencer uses to line effects up with the music. Run analysis from the Song Library when you add a new
                track.
              </p>
            </InfoPopover>
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-600">Beat, bass, treble, vocals, phrasing, dynamics</span>
              <span className="rounded-lg bg-slate-900 px-2.5 py-1 text-xs font-medium tabular-nums text-white">
                {analysisProgress}%
              </span>
            </div>
            <div className="mt-1">
              <Progress value={analysisProgress} />
            </div>
          </section>

          <section className="space-y-4">
            <InfoPopover title="Style preset">
              <p>
                Pick a style that matches how ambitious your show is. Beginner keeps things simple; Spectacular goes all-out.
              </p>
            </InfoPopover>
            <div className="flex gap-2">
              {STYLE_PRESETS.map((p) => (
                <button
                  key={p.value}
                  onClick={() => onStylePresetChange(p.value)}
                  className={`flex-1 rounded-xl border-2 px-3 py-2.5 text-center transition-all duration-150 ${
                    stylePreset === p.value
                      ? 'border-brand-green bg-brand-green/10 text-slate-900 shadow-sm'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                  }`}
                >
                  <div className="text-sm font-semibold">{p.label}</div>
                  <div className="mt-0.5 text-[11px] leading-tight text-slate-500">{p.description}</div>
                </button>
              ))}
            </div>
          </section>

          <section className="space-y-4">
            <InfoPopover title="Sequence parameters">
              <p>
                <strong className="text-slate-800">Sequence complexity</strong> controls how busy the pattern is — higher values create more
                cuts and busier patterns across all props.
              </p>
            </InfoPopover>
            <div className="space-y-4 rounded-2xl border-2 border-brand-green/20 bg-white p-5 shadow-sm">
              <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-800">Active</div>
              <SliderRow label="Sequence complexity" value={complexity} onChange={setComplexity} />
              <p className="text-xs leading-relaxed text-slate-600">
                Higher values produce denser timing and more effect changes on every prop.
              </p>
            </div>
            <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-100/60 p-5">
              <div className="text-[11px] font-medium uppercase tracking-[0.12em] text-slate-500">Coming soon</div>
              <SliderRow label="Face sync priority" value={88} onChange={() => {}} disabled />
              <SliderRow label="Bass reactivity" value={72} onChange={() => {}} disabled />
              <SliderRow label="Transition smoothness" value={61} onChange={() => {}} disabled />
              <SliderRow label="Finale escalation" value={90} onChange={() => {}} disabled />
            </div>
          </section>

          <div className="flex flex-wrap gap-3 border-t border-slate-200/90 pt-6">
            <Button className="min-w-[200px]" disabled={rebuildAnalyzing} onClick={runAi}>
              <Sparkles className="h-4 w-4" />
              {rebuildAnalyzing ? (rebuildPhase === 'sequence' ? 'Generating…' : 'Analyzing…') : 'Rebuild full sequence'}
            </Button>
            <Button variant="secondary" disabled>
              Re-analyze audio (soon)
            </Button>
            <Button variant="secondary" disabled>
              Re-map props (soon)
            </Button>
          </div>
        </div>

        <div className="space-y-8 rounded-2xl border border-slate-200/80 bg-slate-50/50 p-6">
          <section className="space-y-3">
            <InfoPopover title="Props in this sequence">
              <p>
                Lists every display prop that will receive timeline events. Sequences are built for the whole house — not
                only the singing face. Add or rearrange props in Display Setup first.
              </p>
            </InfoPopover>
            <p className="text-sm text-slate-600">
              Vocal analysis boosts face timing; bass and energy still drive trees and stakes.
            </p>
            {propsState.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 bg-white px-4 py-8 text-center">
                <p className="text-sm font-medium text-slate-800">No props yet</p>
                <p className="mt-2 text-xs leading-relaxed text-slate-500">
                  Open Display Setup and place props on the house before generating a sequence.
                </p>
              </div>
            ) : (
              <ul className="max-h-[240px] space-y-2 overflow-y-auto rounded-xl border border-slate-200 bg-white p-4 text-sm">
                {propsState.map((p) => (
                  <li
                    key={p.id}
                    className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2 last:border-0 last:pb-0"
                  >
                    <span className="font-medium text-slate-900">{p.name}</span>
                    <span className="shrink-0 text-xs text-slate-500">{p.type}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="space-y-3">
            <InfoPopover title="Vocal windows">
              <p>
                Sections where vocals are detected get extra attention for face sync and lyrical emphasis. If a song is
                instrumental, this list may be short.
              </p>
            </InfoPopover>
            <div className="space-y-1.5">
              {sections
                .filter((s) => s.vocals)
                .map((s) => (
                  <div
                    key={s.name + s.start}
                    className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
                  >
                    <span className="font-medium text-slate-900">
                      {formatTime(s.start)} – {formatTime(s.end)}
                    </span>
                    <span className="text-slate-600">{s.name}</span>
                  </div>
                ))}
              {sections.filter((s) => s.vocals).length === 0 && (
                <p className="py-4 text-sm text-slate-500">No vocal-heavy sections in the current map.</p>
              )}
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white px-4 py-4 text-sm text-slate-700">
            <span className="font-semibold text-slate-900">Now editing:</span>{' '}
            {selectedSong.title.replace(/\.(mp3|wav|m4a)$/i, '')} ·{' '}
            <span className="text-slate-500">Vocal confidence {selectedSong.analysis.vocals}%</span>
          </section>
        </div>
      </div>
    </motion.div>
  )
}

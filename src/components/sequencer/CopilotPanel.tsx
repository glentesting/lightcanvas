import type { Dispatch, SetStateAction } from 'react'
import {
  ArrowRight,
  Bot,
  CheckCircle2,
  MessageSquare,
  Pause,
  Play,
  Volume2,
} from 'lucide-react'
import type { DisplayProp } from '../../types/display'
import type { Song } from '../../types/song'
import type { ChatMessage, TimelineEvent } from './types'
import { formatTime } from './utils'
import { Button } from './shared/Button'
import { Card } from './shared/Card'
import { InfoPopover } from './shared/InfoPopover'

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

export interface CopilotPanelProps {
  playing: boolean
  setPlaying: Dispatch<SetStateAction<boolean>>
  chat: ChatMessage[]
  chatInput: string
  setChatInput: Dispatch<SetStateAction<string>>
  applyCopilot: () => void | Promise<void>
  copilotBusy: boolean
  propsState: DisplayProp[]
  selectedSong: Song
  previewTime: number
  sequenceEvents: TimelineEvent[]
}

export function CopilotPanel({
  playing,
  setPlaying,
  chat,
  chatInput,
  setChatInput,
  applyCopilot,
  copilotBusy,
  propsState,
  selectedSong,
  previewTime,
  sequenceEvents,
}: CopilotPanelProps) {
  const duration = Math.max(0.001, selectedSong.duration)

  return (
    <div className="flex w-full min-w-0 flex-col gap-8">
      <Card className="min-w-0 overflow-hidden">
        <div className="border-b border-slate-200/90 px-5 pb-5 pt-6 sm:px-6">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 shrink-0 rounded-xl bg-slate-100 p-2.5 text-slate-700">
              <Volume2 className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <InfoPopover title="Live show preview">
                <p>
                  This is the same house style and the same props you set up in Display Setup — nothing is invented here.
                  Press Preview to watch lights brighten on each prop when that prop has an active moment in the sequence.
                </p>
              </InfoPopover>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                Matches Display Setup: house style and prop positions stay in sync.
              </p>
            </div>
          </div>
        </div>
        <div className="space-y-5 px-5 pb-7 pt-4 sm:px-6">
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="secondary" onClick={() => setPlaying((p) => !p)} disabled={propsState.length === 0}>
              {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              {playing ? 'Pause' : 'Preview'}
            </Button>
            <span className="text-xs tabular-nums text-slate-600">
              {formatTime(previewTime)} / {formatTime(duration)}
            </span>
            {propsState.length === 0 && (
              <span className="text-xs text-slate-500">Add props in Display Setup to preview.</span>
            )}
          </div>
          <div className="grid gap-5 lg:grid-cols-4">
            <div className="min-w-0 lg:col-span-3">
              <div className="flex min-h-[200px] items-center justify-center rounded-2xl" style={{ backgroundColor: '#0a0e1a' }}>
                <p className="text-sm text-slate-500">Live preview plays when a sequence is running.</p>
              </div>
            </div>
            <div className="min-w-0 space-y-2 rounded-xl border border-slate-200/90 bg-slate-50/90 p-4 text-xs leading-snug text-slate-600 lg:col-span-1">
              <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Now playing</div>
              <div className="max-h-[min(40vh,320px)] space-y-1.5 overflow-y-auto">
                {sequenceEvents
                  .filter((e) => previewTime >= e.start && previewTime < e.end)
                  .slice(0, 12)
                  .map((e) => (
                    <div key={e.id} className="flex items-center gap-2">
                      <span
                        className="h-2 w-2 shrink-0 rounded-full"
                        style={{ backgroundColor: EFFECT_COLORS[e.effect] ?? '#94a3b8' }}
                      />
                      <span className="truncate font-medium text-slate-800">{e.propName}</span>
                      <span className="shrink-0 text-slate-500">{e.effect}</span>
                    </div>
                  ))}
                {sequenceEvents.filter((e) => previewTime >= e.start && previewTime < e.end).length === 0 && (
                  <p className="text-slate-500">Nothing playing — hit Preview to start</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </Card>

      <Card className="min-w-0">
        <div className="border-b border-slate-200/90 px-5 pb-5 pt-6 sm:px-6">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 shrink-0 rounded-xl bg-slate-100 p-2.5 text-slate-700">
              <Bot className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <InfoPopover title="AI Copilot">
                <p>
                  Describe the change you want in everyday language. The assistant reads your sequence and display, then
                  proposes real updates. You need the API server running (see note below) — plain Vite alone cannot reach it.
                </p>
              </InfoPopover>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                Short requests work best: one clear change per message.
              </p>
            </div>
          </div>
        </div>
        <div className="space-y-4 px-5 pb-6 pt-4 sm:px-6">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <Button
              variant="secondary"
              className="text-xs sm:text-sm"
              onClick={() => setChatInput('Make the finale bigger')}
            >
              Bigger finale
            </Button>
            <Button
              variant="secondary"
              className="text-xs sm:text-sm"
              onClick={() => setChatInput('Make the face sync cleaner')}
            >
              Cleaner face
            </Button>
            <Button
              variant="secondary"
              className="text-xs sm:text-sm"
              onClick={() => setChatInput('Increase bass pulses')}
            >
              More bass
            </Button>
          </div>
          <div className="h-[220px] space-y-2 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 p-3">
            {chat.map((msg) => (
              <div
                key={msg.id}
                className={`rounded-lg p-2.5 text-xs leading-relaxed transition duration-150 ${
                  msg.role === 'assistant'
                    ? 'border border-slate-200 bg-white text-slate-700'
                    : 'bg-brand-green text-white'
                }`}
              >
                <div className="mb-0.5 flex items-center gap-1.5 text-[10px] uppercase tracking-wide opacity-80">
                  {msg.role === 'assistant' ? (
                    <Bot className="h-3 w-3 shrink-0" />
                  ) : (
                    <MessageSquare className="h-3 w-3 shrink-0" />
                  )}
                  {msg.role}
                </div>
                {msg.text}
              </div>
            ))}
            {copilotBusy && (
              <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white p-2.5 text-xs text-slate-500">
                <Bot className="h-3 w-3 shrink-0 animate-pulse" />
                Thinking...
              </div>
            )}
          </div>
          <textarea
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            placeholder="Tell the copilot what to change..."
            className="min-h-[84px] w-full resize-y rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm leading-relaxed text-slate-900 outline-none transition duration-150 focus:border-brand-green focus:ring-2 focus:ring-brand-green/20"
          />
          <Button className="w-full" onClick={() => void applyCopilot()} disabled={copilotBusy}>
            <ArrowRight className="h-4 w-4" /> {copilotBusy ? 'Applying…' : 'Apply Copilot change'}
          </Button>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
              <p className="text-xs leading-relaxed text-slate-600">
                AI Copilot is powered by Claude. Changes apply to your active sequence.
              </p>
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}

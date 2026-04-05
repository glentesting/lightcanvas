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
import type { ChatMessage } from './types'
import { Button } from './shared/Button'
import { Card } from './shared/Card'
import { CardHeader } from './shared/CardHeader'
import { LightPreview } from './shared/LightPreview'

export interface CopilotPanelProps {
  playing: boolean
  setPlaying: Dispatch<SetStateAction<boolean>>
  chat: ChatMessage[]
  chatInput: string
  setChatInput: Dispatch<SetStateAction<string>>
  applyCopilot: () => void
}

export function CopilotPanel({
  playing,
  setPlaying,
  chat,
  chatInput,
  setChatInput,
  applyCopilot,
}: CopilotPanelProps) {
  return (
    <div className="grid w-full min-w-0 gap-6 lg:grid-cols-2 lg:items-start">
      <Card className="min-w-0">
        <CardHeader
          title="Live show preview"
          description="Reactive visual playback for the current sequence draft."
          icon={Volume2}
        />
        <div className="space-y-4 px-6 pb-6 pt-4">
          <Button variant="secondary" onClick={() => setPlaying((p) => !p)}>
            {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            {playing ? 'Pause' : 'Preview'}
          </Button>
          <LightPreview playing={playing} />
          <div className="space-y-3">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm leading-relaxed text-slate-600">
              <span className="font-medium text-slate-800">Talking face:</span> reserved for vocal
              phrases and highlighted lyrical moments.
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm leading-relaxed text-slate-600">
              <span className="font-medium text-slate-800">Mega tree:</span> denser patterns in
              high-energy sections and finale lifts.
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm leading-relaxed text-slate-600">
              <span className="font-medium text-slate-800">Ground stakes:</span> low-end pulsing and
              beat-driven movement.
            </div>
          </div>
        </div>
      </Card>
      <Card className="min-w-0">
        <CardHeader
          title="AI Copilot"
          description="Conversational layer for quick sequence tweaks (prototype)."
          icon={Bot}
        />
        <div className="space-y-3 px-6 pb-5 pt-3">
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
          <div className="h-[200px] space-y-2 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 p-2">
            {chat.map((msg) => (
              <div
                key={msg.id}
                className={`rounded-lg p-2 text-xs leading-relaxed ${
                  msg.role === 'assistant'
                    ? 'border border-slate-200 bg-white text-slate-700 shadow-sm'
                    : 'bg-slate-900 text-white'
                }`}
              >
                <div className="mb-0.5 flex items-center gap-1.5 text-[10px] uppercase tracking-wide opacity-70">
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
          </div>
          <textarea
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            placeholder="Tell the copilot what to change..."
            className="min-h-[72px] w-full resize-y rounded-xl border border-slate-300 px-3 py-2 text-sm leading-relaxed outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
          />
          <Button className="w-full" onClick={applyCopilot}>
            <ArrowRight className="h-4 w-4" /> Apply Copilot change
          </Button>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
              <p className="text-xs leading-relaxed text-slate-600">
                Interactive prototype demo. Not yet: true phoneme mouth mapping or real FSEQ/LOR
                export.
              </p>
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}

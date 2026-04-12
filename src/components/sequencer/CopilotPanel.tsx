import type { Dispatch, SetStateAction } from 'react'
import {
  ArrowRight,
  Bot,
  MessageSquare,
} from 'lucide-react'
import type { ChatMessage } from './types'
import { Button } from './shared/Button'
import { Card } from './shared/Card'
import { InfoPopover } from './shared/InfoPopover'

export interface CopilotPanelProps {
  chat: ChatMessage[]
  chatInput: string
  setChatInput: Dispatch<SetStateAction<string>>
  applyCopilot: () => void | Promise<void>
  copilotBusy: boolean
}

export function CopilotPanel({
  chat,
  chatInput,
  setChatInput,
  applyCopilot,
  copilotBusy,
}: CopilotPanelProps) {
  return (
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
                proposes real updates.
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
          <Button variant="secondary" className="text-xs sm:text-sm" onClick={() => setChatInput('Make the finale bigger')}>
            Bigger finale
          </Button>
          <Button variant="secondary" className="text-xs sm:text-sm" onClick={() => setChatInput('Make the face sync cleaner')}>
            Cleaner face
          </Button>
          <Button variant="secondary" className="text-xs sm:text-sm" onClick={() => setChatInput('Increase bass pulses')}>
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
                {msg.role === 'assistant' ? <Bot className="h-3 w-3 shrink-0" /> : <MessageSquare className="h-3 w-3 shrink-0" />}
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
          <p className="text-xs leading-relaxed text-slate-600">
            AI Copilot is powered by Claude. Changes apply to your active sequence.
          </p>
        </div>
      </div>
    </Card>
  )
}

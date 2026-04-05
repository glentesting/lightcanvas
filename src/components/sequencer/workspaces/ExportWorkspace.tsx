import { motion } from 'framer-motion'
import { Download, Sparkles } from 'lucide-react'
import type { DisplayProp } from '../../../types/display'
import type { Song } from '../../../types/song'
import type { TimelineEvent } from '../types'
import { Button } from '../shared/Button'
import { Card } from '../shared/Card'
import { CardHeader } from '../shared/CardHeader'

export interface ExportWorkspaceProps {
  selectedSong: Song
  propsState: DisplayProp[]
  totalChannels: number
  events: TimelineEvent[]
  exportPayload: string
}

export function ExportWorkspace({
  selectedSong,
  propsState,
  totalChannels,
  events,
  exportPayload,
}: ExportWorkspaceProps) {
  return (
    <motion.div
      key="export"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      className="grid w-full min-w-0 max-w-full grid-cols-1 gap-6 lg:grid-cols-2 lg:items-start"
    >
      <Card className="min-w-0">
        <CardHeader
          title="Export Sequence"
          description="Fake but concrete handoff settings to show what the real output layer might include."
          icon={Download}
        />
        <div className="min-w-0 space-y-5 p-6">
          <div className="min-w-0">
            <div className="mb-2 text-sm font-medium text-slate-700">Export Format</div>
            <select className="w-full min-w-0 rounded-xl border border-slate-300 px-3 py-2">
              <option>FSEQ</option>
              <option>xLights-compatible package</option>
              <option>LOR-oriented channel map bundle</option>
            </select>
          </div>
          <div className="grid min-w-0 gap-3 text-sm leading-normal text-slate-600">
            <div className="min-w-0 rounded-xl border border-slate-200 bg-slate-50 p-3 break-words">
              Song: {selectedSong.title}
            </div>
            <div className="min-w-0 rounded-xl border border-slate-200 bg-slate-50 p-3">
              Props mapped: {propsState.length}
            </div>
            <div className="min-w-0 rounded-xl border border-slate-200 bg-slate-50 p-3">
              Controller capacity: {totalChannels} channels
            </div>
            <div className="min-w-0 rounded-xl border border-slate-200 bg-slate-50 p-3">
              Talking face sync included: Yes
            </div>
            <div className="min-w-0 rounded-xl border border-slate-200 bg-slate-50 p-3">
              Timeline events in current draft: {events.length}
            </div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-pretty text-sm leading-relaxed text-slate-600">
            <div className="font-medium text-brand-green">Fake scope details</div>
            <div className="mt-2 text-pretty leading-relaxed">
              A real export layer would handle format translation, channel flattening, effect
              serialization, controller compatibility checks, timing precision, and playback package
              creation for FPP or xLights workflows.
            </div>
          </div>
          <Button>
            <Download className="h-4 w-4" /> Export Mock Sequence
          </Button>
        </div>
      </Card>
      <Card className="min-w-0">
        <CardHeader
          title="Payload Preview"
          description="A believable object-model preview of the prototype's exported data."
          icon={Sparkles}
        />
        <div className="min-w-0 p-6">
          <pre className="max-h-[520px] min-w-0 overflow-auto rounded-2xl border border-brand-green/30 bg-slate-950 p-4 text-xs leading-6 text-slate-100 shadow-[inset_0_0_0_1px_rgba(192,0,0,0.12)]">
            {exportPayload}
          </pre>
        </div>
      </Card>
    </motion.div>
  )
}

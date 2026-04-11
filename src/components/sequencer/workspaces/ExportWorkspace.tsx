import { motion } from 'framer-motion'
import { Download } from 'lucide-react'
import type { DisplayProp } from '../../../types/display'
import type { Song } from '../../../types/song'
import type { TimelineEvent } from '../types'
import { Button } from '../shared/Button'

export interface ExportWorkspaceProps {
  selectedSong: Song
  propsState: DisplayProp[]
  totalChannels: number
  events: TimelineEvent[]
  exportPayload: string
}

const sectionLabel = 'mb-3 block text-xs font-medium uppercase tracking-[0.14em] text-slate-500'

export function ExportWorkspace({
  selectedSong, propsState, totalChannels, events, exportPayload,
}: ExportWorkspaceProps) {
  const items = [
    ['Song', selectedSong.title],
    ['Props mapped', String(propsState.length)],
    ['Channels', String(totalChannels)],
    ['Face sync', 'Included'],
    ['Timeline events', String(events.length)],
  ]

  return (
    <motion.div key="export" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}
      className="w-full min-w-0 max-w-full rounded-xl border border-slate-200 bg-white p-5">

      <div className="grid gap-8 lg:grid-cols-2 lg:gap-10">
        {/* Left: Export settings */}
        <div className="space-y-5">
          <section>
            <h2 className={sectionLabel}>Export Settings</h2>
            <div>
              <div className="mb-1 text-xs text-slate-500">Format</div>
              <select className="w-full rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm text-slate-900">
                <option>FSEQ</option>
                <option>xLights-compatible package</option>
                <option>LOR-oriented channel map bundle</option>
              </select>
            </div>
          </section>

          <section>
            <h2 className={sectionLabel}>Export Summary</h2>
            <div className="space-y-0">
              {items.map(([label, value]) => (
                <div key={label} className="flex items-baseline justify-between border-b border-slate-200 py-2.5 last:border-b-0">
                  <span className="text-sm text-slate-600">{label}</span>
                  <span className="text-sm font-medium text-slate-900">{value}</span>
                </div>
              ))}
            </div>
          </section>

          <Button>
            <Download className="h-4 w-4" /> Export Sequence
          </Button>
        </div>

        {/* Right: Payload preview */}
        <div>
          <h2 className={sectionLabel}>Payload Preview</h2>
          <pre className="max-h-[520px] overflow-auto rounded-lg border border-slate-200 bg-slate-50 p-4 text-xs leading-6 text-slate-700">
            {exportPayload}
          </pre>
        </div>
      </div>
    </motion.div>
  )
}

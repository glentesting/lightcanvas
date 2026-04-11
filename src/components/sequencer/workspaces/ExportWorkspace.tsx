import { useRef, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { AlertTriangle, CheckCircle, Download, Upload, XCircle } from 'lucide-react'
import type { DisplayProp } from '../../../types/display'
import type { Song } from '../../../types/song'
import type { TimelineEvent } from '../types'
import { downloadFseq } from '../../../lib/exportFseq'
import { downloadXlightsXml } from '../../../lib/exportXlights'
import { downloadShowPackage } from '../../../lib/exportShowPackage'
import { validateChannelMapping } from '../../../lib/validateChannels'
import { importLorFile, type LorImportResult } from '../../../lib/importLor'
import type { UserPlan } from '../../../lib/phase1Repository'
import { Button } from '../shared/Button'

export interface ExportWorkspaceProps {
  selectedSong: Song
  propsState: DisplayProp[]
  totalChannels: number
  events: TimelineEvent[]
  exportPayload: string
  controllers: number
  channelsPerController: number
  onImportLor?: (result: LorImportResult) => void
  audioBlob?: Blob | null
  userPlan: UserPlan
}

const sectionLabel = 'mb-3 block text-xs font-medium uppercase tracking-[0.14em] text-slate-500'

export function ExportWorkspace({
  selectedSong, propsState, totalChannels, events, exportPayload,
  controllers, channelsPerController, onImportLor, audioBlob, userPlan,
}: ExportWorkspaceProps) {
  void userPlan
  const hasEvents = events.length > 0
  const lorFileRef = useRef<HTMLInputElement>(null)
  const [lorResult, setLorResult] = useState<LorImportResult | null>(null)
  const [lorLoading, setLorLoading] = useState(false)

  const issues = useMemo(
    () => validateChannelMapping(propsState, controllers, channelsPerController),
    [propsState, controllers, channelsPerController],
  )
  const errors = issues.filter(i => i.severity === 'error')
  const warnings = issues.filter(i => i.severity === 'warning')
  const hasErrors = errors.length > 0
  const canDownload = hasEvents && !hasErrors

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
          {/* Pre-export checklist */}
          <section>
            <h2 className={sectionLabel}>Pre-export Checklist</h2>
            <div className="space-y-1.5 rounded-lg border border-slate-200 bg-slate-50 p-3">
              {/* No events check */}
              <div className="flex items-start gap-2 text-sm">
                {hasEvents
                  ? <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-brand-green" />
                  : <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-brand-red" />}
                <span className={hasEvents ? 'text-slate-700' : 'text-brand-red'}>
                  {hasEvents ? `${events.length} sequence events` : 'No sequence events — generate a sequence first'}
                </span>
              </div>
              {/* Validation issues */}
              {issues.length === 0 && hasEvents && (
                <div className="flex items-start gap-2 text-sm">
                  <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-brand-green" />
                  <span className="text-slate-700">Channel mapping valid</span>
                </div>
              )}
              {errors.map((issue, i) => (
                <div key={`e${i}`} className="flex items-start gap-2 text-sm">
                  <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-brand-red" />
                  <span className="text-brand-red">{issue.message}</span>
                </div>
              ))}
              {warnings.map((issue, i) => (
                <div key={`w${i}`} className="flex items-start gap-2 text-sm">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                  <span className="text-amber-700">{issue.message}</span>
                </div>
              ))}
              {/* Summary */}
              <div className="mt-2 border-t border-slate-200 pt-2 text-xs font-medium">
                {hasErrors
                  ? <span className="text-brand-red">{errors.length} error{errors.length > 1 ? 's' : ''} found — fix before exporting</span>
                  : warnings.length > 0
                    ? <span className="text-amber-600">Ready to export ({warnings.length} warning{warnings.length > 1 ? 's' : ''})</span>
                    : hasEvents
                      ? <span className="text-brand-green">Ready to export</span>
                      : <span className="text-slate-500">Generate a sequence first</span>}
              </div>
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

          <section className="space-y-3">
            <h2 className={sectionLabel}>Download</h2>

            {/* Show Package — primary action */}
            <div className="rounded-xl border-2 border-brand-green/30 bg-brand-green/5 p-4">
              <Button
                disabled={!canDownload}
                className="w-full justify-center px-6 py-3.5 text-[15px]"
                onClick={() => void downloadShowPackage(events, propsState, selectedSong.title, selectedSong.duration, audioBlob ?? null)}
              >
                <Download className="h-5 w-5" /> Download Show Package (.zip)
              </Button>
              <p className="mt-2 text-center text-xs text-slate-600">
                Includes FSEQ, channel map, and instructions
                {audioBlob ? ' — audio file included' : ''}
              </p>
            </div>

            <div>
              <Button
                disabled={!canDownload}
                onClick={() => downloadFseq(events, propsState, selectedSong.title, selectedSong.duration)}
              >
                <Download className="h-4 w-4" /> Download FSEQ
              </Button>
              <p className="mt-1.5 text-xs text-slate-500">
                FSEQ v2 — compatible with xLights and Falcon Player (FPP)
              </p>
            </div>
            <div>
              <button
                type="button"
                disabled={!canDownload}
                onClick={() => downloadXlightsXml(events, propsState, selectedSong.title, selectedSong.duration)}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:border-brand-green/60 hover:text-brand-green disabled:opacity-50"
              >
                <Download className="h-4 w-4" /> Download xLights XML
              </button>
              <p className="mt-1.5 text-xs text-slate-500">
                Import into xLights via File &rarr; Open Sequence
              </p>
            </div>
          </section>
        </div>

        {/* Right: Payload preview */}
        <div>
          <h2 className={sectionLabel}>Payload Preview</h2>
          <pre className="max-h-[520px] overflow-auto rounded-lg border border-slate-200 bg-slate-50 p-4 text-xs leading-6 text-slate-700">
            {exportPayload}
          </pre>
        </div>
      </div>

      {/* Import section */}
      {onImportLor && (
        <div className="mt-6 border-t border-slate-200 pt-5">
          <h2 className={sectionLabel}>Import</h2>
          <div className="flex items-center gap-3">
            <input
              ref={lorFileRef}
              type="file"
              accept=".loredit,.lor,.xml"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0]
                if (!file) return
                setLorLoading(true)
                setLorResult(null)
                try {
                  const result = await importLorFile(file)
                  setLorResult(result)
                } finally {
                  setLorLoading(false)
                  if (lorFileRef.current) lorFileRef.current.value = ''
                }
              }}
            />
            <button
              type="button"
              disabled={lorLoading}
              onClick={() => lorFileRef.current?.click()}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:border-brand-green/60 hover:text-brand-green disabled:opacity-50"
            >
              <Upload className="h-4 w-4" />
              {lorLoading ? 'Reading...' : 'Import from LOR'}
            </button>
            <span className="text-xs text-slate-500">Accepts .loredit and .lor files</span>
          </div>

          {lorResult && (
            <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
              {lorResult.errors.length > 0 && (
                <div className="mb-2 space-y-1">
                  {lorResult.errors.map((err, i) => (
                    <div key={i} className="flex items-start gap-2 text-brand-red">
                      <XCircle className="mt-0.5 h-4 w-4 shrink-0" />
                      <span>{err}</span>
                    </div>
                  ))}
                </div>
              )}
              {lorResult.props.length > 0 && (
                <p className="text-slate-700">
                  Found <strong>{lorResult.props.length}</strong> props and <strong>{lorResult.events.length}</strong> events
                  {lorResult.durationSeconds > 0 && <> ({Math.round(lorResult.durationSeconds)}s)</>}
                </p>
              )}
              {lorResult.props.length > 0 && (
                <Button
                  className="mt-2"
                  onClick={() => {
                    onImportLor(lorResult)
                    setLorResult(null)
                  }}
                >
                  Apply Import
                </Button>
              )}
            </div>
          )}
        </div>
      )}
    </motion.div>
  )
}

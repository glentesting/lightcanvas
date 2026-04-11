import { motion } from 'framer-motion'
import type { DisplayProp } from '../../../types/display'
import type { Song } from '../../../types/song'
import { SongWaveform } from '../../SongWaveform'
import type { Dispatch, SetStateAction } from 'react'
import type { TimelineEvent } from '../types'
import { effectOptions } from '../types'
import { formatTime } from '../utils'
import { SliderRow } from '../shared/SliderRow'

const TRACK_BG = 'bg-slate-950'

function hashHue(id: string): number {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) % 360
  return h
}

export interface TimelineWorkspaceProps {
  propsState: DisplayProp[]
  selectedPropId: string | null
  setSelectedPropId: (id: string | null) => void
  songs: Song[]
  selectedSong: Song
  timelineSongId: string | null
  setTimelineSongId: Dispatch<SetStateAction<string | null>>
  timelineSequenceSource: 'formula' | 'stored'
  setTimelineSequenceSource: Dispatch<SetStateAction<'formula' | 'stored'>>
  propEvents: TimelineEvent[]
  allEvents: TimelineEvent[]
  selectedEventId: string | null
  setSelectedEventId: (id: string | null) => void
  selectedEvent: TimelineEvent | null
  patchTimelineEvent: (id: string, patch: Partial<TimelineEvent>) => void
}

const sectionLabel = 'mb-2 block text-xs font-medium uppercase tracking-[0.14em] text-slate-500'

export function TimelineWorkspace({
  propsState,
  selectedPropId,
  setSelectedPropId,
  songs,
  selectedSong,
  timelineSongId,
  setTimelineSongId,
  timelineSequenceSource,
  setTimelineSequenceSource,
  propEvents,
  allEvents,
  selectedEventId,
  setSelectedEventId,
  selectedEvent,
  patchTimelineEvent,
}: TimelineWorkspaceProps) {
  void propEvents
  const dur = Math.max(0.001, selectedSong.duration)
  const songSelectValue = timelineSongId ?? selectedSong.id

  return (
    <motion.div
      key="timeline"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      className="flex min-h-[min(78vh,900px)] w-full min-w-0 max-w-full flex-col gap-8 rounded-2xl border border-slate-200/90 bg-white p-6 shadow-[0_12px_40px_-16px_rgba(15,23,42,0.1)]"
    >
      <div className="grid gap-4 rounded-2xl border border-slate-200/80 bg-slate-50/80 p-5 sm:grid-cols-2">
        <label className="block">
          <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Song</span>
          <select
            value={songs.some((s) => s.id === songSelectValue) ? songSelectValue : ''}
            onChange={(e) => setTimelineSongId(e.target.value || null)}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm font-medium text-slate-900 shadow-sm transition duration-150 hover:border-slate-400 focus:border-brand-green focus:outline-none focus:ring-2 focus:ring-brand-green/20"
          >
            {songs.length === 0 ? <option value="">No songs</option> : null}
            {songs.map((s) => (
              <option key={s.id} value={s.id}>
                {s.title.replace(/\.(mp3|wav|m4a)$/i, '')}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Sequence</span>
          <select
            value={timelineSequenceSource}
            onChange={(e) => setTimelineSequenceSource(e.target.value as 'formula' | 'stored')}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm font-medium text-slate-900 shadow-sm transition duration-150 hover:border-slate-400 focus:border-brand-green focus:outline-none focus:ring-2 focus:ring-brand-green/20"
          >
            <option value="stored">Saved / AI-generated timeline</option>
            <option value="formula">Formula draft (built-in)</option>
          </select>
        </label>
      </div>

      <div>
        <h2 className={sectionLabel}>Song waveform</h2>
        <p className="mb-4 text-sm leading-relaxed text-slate-600">
          Final review before export: audio overview, then one lane per prop with all sequenced events as blocks. Click a
          block to edit it in the inspector.
        </p>
        <div className="w-full min-w-0">
          <SongWaveform song={selectedSong} />
        </div>
      </div>

      <div className="grid min-h-0 flex-1 gap-5 lg:grid-cols-[minmax(200px,240px)_minmax(0,1fr)_minmax(260px,320px)]">
        {/* Left: Props */}
        <div className="flex min-h-0 flex-col">
          <h2 className={sectionLabel}>Props</h2>
          {propsState.length === 0 ? (
            <p className="text-xs text-slate-500">Add props in Display Setup.</p>
          ) : (
            <div className="max-h-[56vh] min-h-0 flex-1 overflow-y-auto rounded-lg border border-slate-200 bg-slate-50">
              {propsState.map((prop) => (
                <PropRowButton
                  key={prop.id}
                  prop={prop}
                  selected={selectedPropId === prop.id}
                  onSelect={() => setSelectedPropId(prop.id)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Center: Multi-lane timeline */}
        <div className="flex min-h-0 min-w-0 flex-col gap-3">
          <h2 className={sectionLabel}>Sequenced events</h2>
          {propsState.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-500">No props to sequence.</p>
          ) : (
            <div className="max-h-[56vh] min-h-0 flex-1 space-y-2 overflow-y-auto rounded-lg border border-slate-200 bg-slate-100 p-2">
              {propsState.map((prop) => {
                const evs = allEvents.filter((e) => e.propId === prop.id)
                const hue = hashHue(prop.id)
                return (
                  <div key={prop.id} className="rounded-lg border border-slate-200 bg-white p-2 shadow-sm">
                    <div className="mb-1.5 flex items-center gap-2 text-xs font-medium text-slate-800">
                      {prop.color && (
                        <span className="inline-block h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: prop.color }} />
                      )}
                      <span className="truncate">{prop.name}</span>
                      <span className="shrink-0 text-slate-500">{evs.length} events</span>
                    </div>
                    <div className={`relative h-12 w-full overflow-hidden rounded-md ${TRACK_BG}`}>
                      <div className="absolute inset-0 bg-gradient-to-b from-slate-900/50 to-slate-950" />
                      {evs.map((event) => {
                        const left = (event.start / dur) * 100
                        const width = Math.max(0.4, ((event.end - event.start) / dur) * 100)
                        const isSel = selectedEventId === event.id
                        return (
                          <button
                            key={event.id}
                            type="button"
                            title={`${event.effect} · ${formatTime(event.start)}–${formatTime(event.end)}`}
                            className={`absolute top-1 bottom-1 rounded-sm border text-left text-[10px] font-medium leading-tight text-white shadow-sm transition ${
                              isSel ? 'ring-2 ring-brand-green ring-offset-1 ring-offset-slate-950' : 'hover:brightness-110'
                            }`}
                            style={{
                              left: `${left}%`,
                              width: `${width}%`,
                              backgroundColor: `hsla(${hue}, 65%, 42%, 0.92)`,
                              borderColor: `hsla(${hue}, 50%, 28%, 0.9)`,
                            }}
                            onClick={() => {
                              setSelectedPropId(prop.id)
                              setSelectedEventId(event.id)
                            }}
                          >
                            <span className="block truncate px-1 pt-0.5">{event.effect}</span>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Right: Inspector */}
        <div className="flex min-h-0 flex-col">
          <h2 className={sectionLabel}>Event inspector</h2>
          {selectedEvent ? (
            <div className="space-y-4 overflow-y-auto rounded-lg border border-slate-200 bg-slate-50 p-4">
              <div>
                <div className="text-sm font-semibold text-slate-900">{selectedEvent.propName}</div>
                <div className="mt-1 flex flex-wrap gap-1.5 text-xs text-slate-700">
                  <span className="rounded bg-white px-2 py-0.5">{selectedEvent.section}</span>
                  <span className="rounded bg-white px-2 py-0.5">
                    {formatTime(selectedEvent.start)}–{formatTime(selectedEvent.end)}
                  </span>
                </div>
              </div>
              <SliderRow
                label="Intensity"
                value={selectedEvent.intensity}
                onChange={(n) => patchTimelineEvent(selectedEvent.id, { intensity: n })}
              />
              <SliderRow
                label="Smoothness"
                value={selectedEvent.smoothness}
                onChange={(n) => patchTimelineEvent(selectedEvent.id, { smoothness: n })}
              />
              <div>
                <div className="mb-1 text-xs text-slate-500">Effect</div>
                <select
                  value={selectedEvent.effect}
                  onChange={(e) => patchTimelineEvent(selectedEvent.id, { effect: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm text-slate-900"
                >
                  {effectOptions.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>
              {selectedEvent.note && (
                <div className="border-t border-slate-200 pt-3">
                  <div className="text-xs text-slate-500">Note</div>
                  <p className="mt-1 text-sm leading-relaxed text-slate-700">{selectedEvent.note}</p>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-slate-500">Select a colored block in the timeline to edit intensity, smoothness, and effect.</p>
          )}
        </div>
      </div>
    </motion.div>
  )
}

function PropRowButton({
  prop,
  selected,
  onSelect,
}: {
  prop: DisplayProp
  selected: boolean
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`flex w-full items-center gap-2 border-b border-slate-200 px-3 py-3 text-left text-sm last:border-b-0 ${
        selected ? 'border-l-2 border-l-brand-green bg-white font-semibold text-slate-900' : 'border-l-2 border-l-transparent text-slate-700 hover:bg-white'
      }`}
    >
      {prop.color && <span className="inline-block h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: prop.color }} />}
      <span className="truncate">{prop.name}</span>
    </button>
  )
}

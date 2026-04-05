import { motion } from 'framer-motion'
import { Lightbulb, SlidersHorizontal } from 'lucide-react'
import type { DisplayProp } from '../../../types/display'
import type { Song } from '../../../types/song'
import type { Section, TimelineEvent } from '../types'
import { effectOptions } from '../types'
import { formatTime } from '../utils'
import { Button } from '../shared/Button'
import { Card } from '../shared/Card'
import { CardHeader } from '../shared/CardHeader'
import { SliderRow } from '../shared/SliderRow'

export interface TimelineWorkspaceProps {
  propsState: DisplayProp[]
  selectedPropId: string | null
  setSelectedPropId: (id: string | null) => void
  selectedSong: Song
  sections: Section[]
  propEvents: TimelineEvent[]
  selectedEventId: string | null
  setSelectedEventId: (id: string | null) => void
  selectedEvent: TimelineEvent | null
}

export function TimelineWorkspace({
  propsState,
  selectedPropId,
  setSelectedPropId,
  selectedSong,
  sections,
  propEvents,
  selectedEventId,
  setSelectedEventId,
  selectedEvent,
}: TimelineWorkspaceProps) {
  return (
    <motion.div
      key="timeline"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      className="grid w-full min-w-0 max-w-full gap-6 lg:grid-cols-[1.08fr_0.92fr] lg:items-start"
    >
      <Card>
        <CardHeader
          title="Visual Timeline Editor"
          description="Playable fake timeline blocks to demonstrate editing depth."
          icon={SlidersHorizontal}
        />
        <div className="space-y-5 p-6">
          <div className="flex flex-wrap gap-2">
            {propsState.length === 0 ? (
              <p className="text-sm text-slate-600">
                Add at least one prop in{' '}
                <span className="font-medium text-brand-green">Display Setup</span> to edit timelines.
              </p>
            ) : (
              propsState.map((prop) => (
                <Button
                  key={prop.id}
                  onClick={() => setSelectedPropId(prop.id)}
                  variant={selectedPropId === prop.id ? 'primary' : 'secondary'}
                >
                  {prop.name}
                </Button>
              ))
            )}
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="mb-3 text-xs uppercase tracking-[0.16em] text-slate-500">Section map</div>
            <div className="relative h-14 overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-brand-green/15">
              {sections.map((section) => {
                const left = `${(section.start / selectedSong.duration) * 100}%`
                const width = `${((section.end - section.start) / selectedSong.duration) * 100}%`
                return (
                  <div
                    key={section.name + section.start}
                    className="absolute top-0 h-full border-r border-slate-200 p-2 text-[11px] text-slate-600"
                    style={{ left, width }}
                  >
                    <div className="truncate font-medium">{section.name}</div>
                    <div>{formatTime(section.start)}</div>
                  </div>
                )
              })}
            </div>
          </div>
          <div className="space-y-3">
            {propsState.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-600">
                No timeline blocks until you add props to your display.
              </div>
            ) : null}
            {propEvents.map((event) => {
              const left = `${(event.start / selectedSong.duration) * 100}%`
              const width = `${Math.max(5, ((event.end - event.start) / selectedSong.duration) * 100)}%`
              return (
                <button
                  key={event.id}
                  type="button"
                  onClick={() => setSelectedEventId(event.id)}
                  className={`relative flex h-14 w-full items-center rounded-2xl border bg-white px-3 text-left shadow-sm ${
                    selectedEventId === event.id
                      ? 'border-brand-green ring-1 ring-brand-green/30'
                      : 'border-slate-200'
                  }`}
                >
                  <div className="absolute left-3 right-3 top-1/2 h-4 -translate-y-1/2 rounded-full bg-slate-100" />
                  <div
                    className="absolute top-1/2 h-4 -translate-y-1/2 rounded-full bg-gradient-to-r from-brand-green to-brand-green-dark/90"
                    style={{
                      left: `calc(${left} + 12px)`,
                      width: `calc(${width} - 8px)`,
                    }}
                  />
                  <div className="relative z-10 flex w-full items-center justify-between text-sm">
                    <span className="font-medium">{event.effect}</span>
                    <span className="text-slate-500">
                      {formatTime(event.start)}–{formatTime(event.end)}
                    </span>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      </Card>
      <Card>
        <CardHeader
          title="Effect Inspector"
          description="Selected block detail to make scope feel real."
          icon={Lightbulb}
        />
        <div className="space-y-5 p-6">
          {selectedEvent ? (
            <>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-sm text-slate-500">Selected prop</div>
                <div className="mt-1 text-lg font-semibold">{selectedEvent.propName}</div>
                <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
                  <span className="rounded-full border border-slate-200 px-2 py-1">
                    {selectedEvent.section}
                  </span>
                  <span className="rounded-full border border-slate-200 px-2 py-1">
                    {formatTime(selectedEvent.start)}–{formatTime(selectedEvent.end)}
                  </span>
                  <span className="rounded-full border border-slate-200 px-2 py-1">
                    {selectedEvent.effect}
                  </span>
                </div>
              </div>
              <SliderRow label="Intensity" value={selectedEvent.intensity} onChange={() => {}} />
              <SliderRow label="Smoothness" value={selectedEvent.smoothness} onChange={() => {}} />
              <div>
                <div className="mb-2 text-sm font-medium text-slate-700">Effect Type</div>
                <select
                  key={selectedEvent.id}
                  defaultValue={selectedEvent.effect}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2"
                >
                  {effectOptions.map((opt) => (
                    <option key={opt}>{opt}</option>
                  ))}
                </select>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm leading-7 text-slate-600">
                <div className="font-medium text-brand-green">Block note</div>
                <div className="mt-2">{selectedEvent.note}</div>
              </div>
            </>
          ) : (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
              Select a timeline block to inspect it.
            </div>
          )}
        </div>
      </Card>
    </motion.div>
  )
}

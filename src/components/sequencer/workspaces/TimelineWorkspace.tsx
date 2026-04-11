import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import type { Dispatch, SetStateAction } from 'react'
import type { DisplayProp } from '../../../types/display'
import type { Song } from '../../../types/song'
import { SongWaveform } from '../../SongWaveform'
import type { Section, TimelineEvent } from '../types'
import { effectOptions } from '../types'
import { formatTime } from '../utils'

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

const SECTION_COLORS = [
  '#4a3f6b', '#3b5249', '#5a3a3a', '#3a4a5a', '#5a4a3a',
  '#3a5a4a', '#4a3a5a', '#5a3a4a', '#3a4a3f', '#4a5a3a',
]

function sectionColor(name: string): string {
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0x7fffffff
  return SECTION_COLORS[h % SECTION_COLORS.length]
}

const ROW_HEIGHT = 36
const LABEL_WIDTH = 160

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
  sections: Section[]
  playing: boolean
  previewTime: number
  beatTimes: number[]
  onSeek: (time: number) => void
  onDeleteEvent: (id: string) => void
}

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
  sections,
  playing,
  previewTime,
  beatTimes,
  onSeek,
  onDeleteEvent,
}: TimelineWorkspaceProps) {
  void propEvents
  void selectedPropId
  const dur = Math.max(0.001, selectedSong.duration)
  const songSelectValue = timelineSongId ?? selectedSong.id

  const [zoom, setZoom] = useState(1)
  const [snapToBeat, setSnapToBeat] = useState(false)
  // TODO: snapToBeat will be used when drag-resize of blocks is implemented (Phase 4 advanced)
  void snapToBeat

  const scrollRef = useRef<HTMLDivElement>(null)
  const timelineWidth = Math.max(800, dur * 80 * zoom)

  // Auto-scroll to follow playhead during playback
  useEffect(() => {
    if (!playing || !scrollRef.current) return
    const container = scrollRef.current
    const playheadX = (previewTime / dur) * timelineWidth
    const threshold = container.clientWidth * 0.8

    if (playheadX > container.scrollLeft + threshold || playheadX < container.scrollLeft) {
      container.scrollLeft = playheadX - container.clientWidth * 0.3
    }
  }, [previewTime, playing, dur, timelineWidth])

  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('[data-event-block]')) return
    const rect = e.currentTarget.getBoundingClientRect()
    const scrollLeft = scrollRef.current?.scrollLeft ?? 0
    const x = e.clientX - rect.left + scrollLeft
    const fraction = x / timelineWidth
    onSeek(fraction * dur)
    setSelectedEventId(null)
  }

  const showPlayhead = playing || previewTime > 0

  return (
    <motion.div
      key="timeline"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      className="flex w-full min-w-0 max-w-full flex-col gap-4 rounded-2xl border border-slate-200/90 bg-white p-6 shadow-[0_12px_40px_-16px_rgba(15,23,42,0.1)]"
    >
      {/* Empty state guidance */}
      {allEvents.length === 0 && (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
          Your sequence shows up here after you run AI sequencing. Click any colored block to edit it — change the effect,
          intensity, or color. Click empty space to seek.
        </div>
      )}

      {/* Song/Sequence selectors */}
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

      {/* Toolbar: Zoom + Beat-snap */}
      <div className="flex items-center gap-5 rounded-xl bg-zinc-900 px-4 py-2.5">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-zinc-400">Zoom</span>
          <input
            type="range"
            min={0.5}
            max={4}
            step={0.1}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="h-1 w-24 cursor-pointer accent-brand-green"
          />
          <span className="min-w-[2.5rem] text-xs tabular-nums text-zinc-400">{zoom.toFixed(1)}x</span>
        </div>
        <button
          type="button"
          onClick={() => setSnapToBeat((v) => !v)}
          className={`rounded-md px-2.5 py-1 text-xs font-medium transition ${
            snapToBeat
              ? 'bg-brand-green/20 text-brand-green'
              : 'bg-zinc-800 text-zinc-500 hover:text-zinc-300'
          }`}
        >
          Snap to beat
        </button>
      </div>

      {/* Visual Timeline */}
      <div className="flex overflow-hidden rounded-xl border border-zinc-800" style={{ backgroundColor: '#0a0e1a' }}>
        {/* Left: Prop labels */}
        <div className="shrink-0" style={{ width: LABEL_WIDTH }}>
          {/* Waveform spacer */}
          <div className="h-[60px] border-b border-zinc-800" />
          {/* Section marker spacer */}
          <div className="h-6 border-b border-zinc-800" />
          {/* Prop labels */}
          {propsState.map((prop, i) => (
            <div
              key={prop.id}
              className="flex items-center border-b border-zinc-800/50 px-3"
              style={{
                height: ROW_HEIGHT,
                backgroundColor: i % 2 === 0 ? '#0f1729' : '#0a0e1a',
              }}
            >
              {prop.color && (
                <span
                  className="mr-2 inline-block h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: prop.color }}
                />
              )}
              <span className="truncate text-xs text-slate-400">{prop.name}</span>
            </div>
          ))}
        </div>

        {/* Right: Scrollable timeline */}
        <div ref={scrollRef} className="min-w-0 flex-1 overflow-x-auto overflow-y-hidden">
          <div style={{ width: timelineWidth, position: 'relative' }}>
            {/* Waveform strip */}
            <div className="h-[60px] border-b border-zinc-800">
              <SongWaveform song={selectedSong} compact height={60} />
            </div>

            {/* Section markers */}
            <div className="relative h-6 border-b border-zinc-800">
              {sections.map((s) => {
                const left = (s.start / dur) * 100
                const width = ((s.end - s.start) / dur) * 100
                return (
                  <div
                    key={s.name + s.start}
                    className="absolute top-0 bottom-0 flex items-center overflow-hidden border-r border-zinc-700/50 px-1.5"
                    style={{
                      left: `${left}%`,
                      width: `${width}%`,
                      backgroundColor: sectionColor(s.name),
                    }}
                  >
                    <span className="truncate text-[10px] text-white/70">{s.name}</span>
                  </div>
                )
              })}
            </div>

            {/* Prop rows */}
            <div onClick={handleTimelineClick}>
              {propsState.map((prop, i) => {
                const evs = allEvents.filter((e) => e.propId === prop.id)
                return (
                  <div
                    key={prop.id}
                    className="relative border-b border-zinc-800/50"
                    style={{
                      height: ROW_HEIGHT,
                      backgroundColor: i % 2 === 0 ? '#0f1729' : '#0a0e1a',
                    }}
                  >
                    {/* Beat markers */}
                    {beatTimes.map((bt, bi) => {
                      const left = (bt / dur) * 100
                      return (
                        <div
                          key={bi}
                          className="absolute top-0 bottom-0"
                          style={{
                            left: `${left}%`,
                            width: 1,
                            backgroundColor: 'rgba(255,255,255,0.08)',
                          }}
                        />
                      )
                    })}
                    {/* Effect blocks */}
                    {evs.map((event) => {
                      const left = (event.start / dur) * 100
                      const width = Math.max(0.3, ((event.end - event.start) / dur) * 100)
                      const isSel = selectedEventId === event.id
                      const blockWidthPx = (width / 100) * timelineWidth
                      const color = EFFECT_COLORS[event.effect] ?? '#64748b'
                      return (
                        <button
                          key={event.id}
                          type="button"
                          data-event-block
                          title={`${event.effect} · ${formatTime(event.start)}–${formatTime(event.end)} · ${event.intensity}%`}
                          className={`absolute top-[3px] bottom-[3px] rounded-sm text-left text-[9px] font-medium leading-tight text-white transition ${
                            isSel ? 'ring-2 ring-white z-10' : 'hover:brightness-125'
                          }`}
                          style={{
                            left: `${left}%`,
                            width: `${width}%`,
                            backgroundColor: color,
                            opacity: 0.85,
                          }}
                          onClick={(e) => {
                            e.stopPropagation()
                            setSelectedPropId(prop.id)
                            setSelectedEventId(event.id)
                          }}
                        >
                          {blockWidthPx > 60 && (
                            <span className="block truncate px-1 pt-0.5">{event.effect}</span>
                          )}
                        </button>
                      )
                    })}
                  </div>
                )
              })}
            </div>

            {/* Playhead */}
            {showPlayhead && (
              <div
                className="pointer-events-none absolute top-0 bottom-0 z-20"
                style={{
                  left: `${(previewTime / dur) * 100}%`,
                  width: 1.5,
                  backgroundColor: 'rgba(255,255,255,0.6)',
                }}
              />
            )}
          </div>
        </div>
      </div>

      {/* Effect Inspector */}
      {selectedEvent && (
        <EffectInspector
          event={selectedEvent}
          onPatchEvent={patchTimelineEvent}
          onDeleteEvent={(id) => {
            onDeleteEvent(id)
            setSelectedEventId(null)
          }}
        />
      )}
    </motion.div>
  )
}

// ── Effect Inspector ─────────────────────────────────────────────────

const COLOR_SWATCHES = [
  '#ff0000', '#ff8800', '#ffcc00', '#22c55e',
  '#3b82f6', '#a855f7', '#ec4899', '#ffffff',
]

function EffectInspector({
  event,
  onPatchEvent,
  onDeleteEvent,
}: {
  event: TimelineEvent
  onPatchEvent: (id: string, patch: Partial<TimelineEvent>) => void
  onDeleteEvent: (id: string) => void
}) {
  return (
    <div className="rounded-xl border border-zinc-700 bg-zinc-900 p-5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <div className="text-sm font-semibold text-white">{event.propName}</div>
          <div className="mt-0.5 text-xs text-zinc-400">
            {formatTime(event.start)} → {formatTime(event.end)}
          </div>
        </div>
        <button
          type="button"
          onClick={() => onDeleteEvent(event.id)}
          className="rounded-lg bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-400 transition hover:bg-red-500/20"
        >
          Remove block
        </button>
      </div>

      {/* Effect type pills */}
      <div className="mb-4">
        <div className="mb-1.5 text-[11px] font-medium uppercase tracking-wider text-zinc-500">Effect</div>
        <div className="flex flex-wrap gap-1.5">
          {effectOptions.map((eff) => (
            <button
              key={eff}
              type="button"
              onClick={() => onPatchEvent(event.id, { effect: eff })}
              className={`rounded-md px-2.5 py-1 text-xs font-medium transition ${
                event.effect === eff
                  ? 'text-white shadow-sm'
                  : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'
              }`}
              style={
                event.effect === eff
                  ? { backgroundColor: EFFECT_COLORS[eff] ?? '#64748b' }
                  : undefined
              }
            >
              {eff}
            </button>
          ))}
        </div>
      </div>

      {/* Sliders */}
      <div className="mb-4 grid gap-4 sm:grid-cols-2">
        <div>
          <div className="mb-1 text-[11px] font-medium uppercase tracking-wider text-zinc-500">Intensity</div>
          <input
            type="range"
            min={0}
            max={100}
            value={event.intensity}
            onChange={(e) => onPatchEvent(event.id, { intensity: Number(e.target.value) })}
            className="h-1.5 w-full cursor-pointer accent-brand-green"
          />
          <div className="mt-0.5 text-xs tabular-nums text-zinc-400">{event.intensity}%</div>
        </div>
        <div>
          <div className="mb-1 text-[11px] font-medium uppercase tracking-wider text-zinc-500">Smoothness</div>
          <input
            type="range"
            min={0}
            max={100}
            value={event.smoothness}
            onChange={(e) => onPatchEvent(event.id, { smoothness: Number(e.target.value) })}
            className="h-1.5 w-full cursor-pointer accent-brand-green"
          />
          <div className="mt-0.5 text-xs tabular-nums text-zinc-400">{event.smoothness}%</div>
        </div>
      </div>

      {/* Color swatches */}
      <div>
        <div className="mb-1.5 text-[11px] font-medium uppercase tracking-wider text-zinc-500">Color</div>
        <div className="flex gap-2">
          {COLOR_SWATCHES.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => onPatchEvent(event.id, { note: `color:${c}` })}
              className="h-6 w-6 rounded-full border-2 border-zinc-700 transition hover:scale-110"
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

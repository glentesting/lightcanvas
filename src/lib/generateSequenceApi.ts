// TODO: Pass selectedHoliday to the server so it can swap between
// CHRISTMAS_SYSTEM_PROMPT and HALLOWEEN_SYSTEM_PROMPT from src/holidays/
// The prompts live in src/holidays/{christmas,halloween}/prompts.ts
import type { DisplayProp } from '../types/display'
import type { SongAnalysis } from '../types/song'

export type SequenceSectionPayload = {
  name: string
  start: number
  end: number
  energy: number
  vocals: boolean
}

export type ClaudeSequenceEvent = {
  propId: string
  propName: string
  section: string
  start: number
  end: number
  effect: string
  intensity: number
}

export type TimelineEventPayload = {
  id: string
  propId: string
  propName: string
  section: string
  start: number
  end: number
  intensity: number
  smoothness: number
  effect: string
  note: string
}

export function getGenerateSequenceUrl(): string {
  const u = import.meta.env.VITE_GENERATE_SEQUENCE_URL as string | undefined
  return u?.trim() || '/api/generate-sequence'
}

/** Same path as fetch uses; for logs, pair with resolveSequenceRequestUrl(). */
export function resolveSequenceRequestUrl(requestPathOrAbsolute: string): string {
  if (/^https?:\/\//i.test(requestPathOrAbsolute)) return requestPathOrAbsolute
  if (typeof window === 'undefined') return requestPathOrAbsolute
  return new URL(requestPathOrAbsolute, window.location.origin).href
}

export async function requestClaudeSequence(params: {
  songDurationSeconds: number
  analysis: SongAnalysis
  bpm: number
  sections: SequenceSectionPayload[]
  props: DisplayProp[]
}): Promise<ClaudeSequenceEvent[]> {
  const url = getGenerateSequenceUrl()
  const resolvedUrl = resolveSequenceRequestUrl(url)
  console.log('[LightCanvas] requestClaudeSequence called', {
    pathOrUrl: url,
    resolvedUrl,
    sections: params.sections.length,
    props: params.props.length,
  })
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      songDurationSeconds: params.songDurationSeconds,
      bpm: params.bpm,
      analysis: {
        beat_confidence: params.analysis.beat,
        bass_strength: params.analysis.bass,
        treble_strength: params.analysis.treble,
        vocal_confidence: params.analysis.vocals,
        dynamics: params.analysis.dynamics,
      },
      sections: params.sections,
      props: params.props.map((p) => ({
        id: p.id,
        name: p.name,
        type: p.type,
        channels: p.channels,
        controller: p.controller,
      })),
    }),
  })

  const data = (await res.json()) as {
    error?: string
    events?: ClaudeSequenceEvent[]
    anthropicStatus?: number
    anthropicBody?: unknown
  }

  if (!res.ok) {
    const detail =
      data.anthropicBody !== undefined
        ? ` ${JSON.stringify(data.anthropicBody).slice(0, 2000)}`
        : ''
    console.error('[LightCanvas] generate-sequence error response', {
      status: res.status,
      error: data.error,
      anthropicStatus: data.anthropicStatus,
      anthropicBody: data.anthropicBody,
    })
    throw new Error((data.error || `Sequence API failed (${res.status})`) + detail)
  }
  if (!data.events?.length) {
    throw new Error(data.error || 'No events returned')
  }
  return data.events
}

export function mapClaudeEventsToTimeline(
  events: ClaudeSequenceEvent[],
  props: DisplayProp[],
): TimelineEventPayload[] {
  const byId = new Map(props.map((p) => [p.id, p]))
  return events.map((ev, i) => {
    const prop = byId.get(ev.propId)
    const smoothness =
      prop?.type === 'Talking Face' ? 82 : prop?.type === 'Ground Stakes' ? 34 : 58
    const start = ev.start
    const end = ev.end
    const id = `${ev.propId}-${start.toFixed(3)}-${end.toFixed(3)}-${i}`
    return {
      id,
      propId: ev.propId,
      propName: ev.propName || prop?.name || 'Prop',
      section: ev.section || '—',
      start,
      end,
      intensity: ev.intensity,
      smoothness,
      effect: ev.effect,
      note: 'Claude-generated sequence event.',
    }
  })
}

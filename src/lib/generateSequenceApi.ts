// TODO: Pass selectedHoliday to the server so it can swap between
// CHRISTMAS_SYSTEM_PROMPT and HALLOWEEN_SYSTEM_PROMPT from src/holidays/
// The prompts live in src/holidays/{christmas,halloween}/prompts.ts
import type { DisplayProp } from '../types/display'
import type { SongAnalysis } from '../types/song'
import { getSupabaseAccessTokenForApi } from './supabaseClient'

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
  stylePreset?: string
}): Promise<ClaudeSequenceEvent[]> {
  const url = getGenerateSequenceUrl()
  const resolvedUrl = resolveSequenceRequestUrl(url)
  console.log('[LightCanvas] requestClaudeSequence called', {
    pathOrUrl: url,
    resolvedUrl,
    sections: params.sections.length,
    props: params.props.length,
  })
  const accessToken = await getSupabaseAccessTokenForApi()
  if (!accessToken) {
    throw new Error('Not authenticated. Sign in to generate sequences.')
  }
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
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
      stylePreset: params.stylePreset ?? 'standard',
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
  // Name-based lookup: lowercase trimmed name → prop
  const byName = new Map(props.map((p) => [p.name.trim().toLowerCase(), p]))

  let matched = 0
  let dropped = 0

  const result: TimelineEventPayload[] = []
  for (let i = 0; i < events.length; i++) {
    const ev = events[i]

    // 1. Try exact ID match
    let prop = byId.get(ev.propId)
    let resolvedId = ev.propId

    // 2. If no ID match, try exact name match (case-insensitive, trimmed)
    if (!prop && ev.propName) {
      const nameKey = ev.propName.trim().toLowerCase()
      const byNameMatch = byName.get(nameKey)
      if (byNameMatch) {
        prop = byNameMatch
        resolvedId = byNameMatch.id
      }
    }

    // 3. If still no match, try includes() partial match
    if (!prop && ev.propName) {
      const nameKey = ev.propName.trim().toLowerCase()
      for (const p of props) {
        const pName = p.name.trim().toLowerCase()
        if (pName.includes(nameKey) || nameKey.includes(pName)) {
          prop = p
          resolvedId = p.id
          break
        }
      }
    }

    // 4. Skip events with no matching prop
    if (!prop || !resolvedId) {
      dropped++
      console.warn(`[mapClaudeEventsToTimeline] No prop match for propId="${ev.propId}" propName="${ev.propName}" — dropping event`)
      continue
    }

    matched++
    const smoothness =
      prop.type === 'Talking Face' ? 82 : prop.type === 'Ground Stakes' ? 34 : 58
    const id = `${resolvedId}-${ev.start.toFixed(3)}-${ev.end.toFixed(3)}-${i}`
    result.push({
      id,
      propId: resolvedId,
      propName: prop.name,
      section: ev.section || '—',
      start: ev.start,
      end: ev.end,
      intensity: ev.intensity,
      smoothness,
      effect: ev.effect,
      note: 'Claude-generated sequence event.',
    })
  }

  console.log(`[mapClaudeEventsToTimeline] ${events.length} from Claude → ${matched} matched, ${dropped} dropped`)
  return result
}

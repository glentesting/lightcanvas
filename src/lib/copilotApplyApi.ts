import type { DisplayProp } from '../types/display'
import type { SongAnalysis } from '../types/song'
import type { SequenceSectionPayload, ClaudeSequenceEvent } from './generateSequenceApi'

// ── Copilot Message API (real Claude calls) ──────────────────────────

export type CopilotMessagePayload = {
  message: string
  currentEvents: Array<{
    propId: string
    propName: string
    effect: string
    start: number
    end: number
    intensity: number
  }>
  props: DisplayProp[]
  songAnalysis: {
    beat: number
    bass: number
    treble: number
    vocals: number
    dynamics: number
    bpm?: number
    duration?: number
  }
  chatHistory: Array<{ role: 'user' | 'assistant'; text: string }>
}

export type CopilotMessageResult = {
  reply: string
  events: ClaudeSequenceEvent[] | null
}

function getCopilotMessageUrl(): string {
  const u = import.meta.env.VITE_COPILOT_MESSAGE_URL as string | undefined
  return u?.trim() || '/api/copilot-message'
}

export async function requestCopilotMessage(payload: CopilotMessagePayload): Promise<CopilotMessageResult> {
  const url = getCopilotMessageUrl()
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: payload.message,
      currentEvents: payload.currentEvents,
      props: payload.props.map((p) => ({
        id: p.id,
        name: p.name,
        type: p.type,
        channels: p.channels,
        controller: p.controller,
      })),
      songAnalysis: payload.songAnalysis,
      chatHistory: payload.chatHistory,
    }),
  })

  const rawText = await res.text()
  const ct = res.headers.get('content-type') ?? ''

  if (ct.includes('text/html') || looksLikeHtml(rawText)) {
    throw new CopilotApiUnavailableError()
  }

  let data: {
    error?: string
    reply?: string
    events?: ClaudeSequenceEvent[] | null
  }

  try {
    data = JSON.parse(rawText) as typeof data
  } catch {
    throw new CopilotApiUnavailableError()
  }

  if (!res.ok) {
    throw new Error(data.error || `Copilot API failed (${res.status})`)
  }

  return {
    reply: data.reply ?? 'Done.',
    events: data.events ?? null,
  }
}

export type CopilotApplyPayload = {
  userMessage: string
  complexity: number
  songDurationSeconds: number
  bpm: number
  analysis: SongAnalysis
  sections: SequenceSectionPayload[]
  props: DisplayProp[]
  currentEvents: Array<{
    propId: string
    propName: string
    section: string
    start: number
    end: number
    intensity: number
    smoothness: number
    effect: string
    note: string
  }>
}

export type CopilotApplyResult = {
  assistant_message: string
  set_complexity: number | null
  events: ClaudeSequenceEvent[] | null
  replace_all_events: boolean
}

export function getCopilotApplyUrl(): string {
  const u = import.meta.env.VITE_COPILOT_APPLY_URL as string | undefined
  return u?.trim() || '/api/copilot-apply'
}

const COPILOT_DEV_HINT =
  'Copilot needs the API server. Stop using `npm run dev` alone and run `vercel dev` from the project root (or point VITE_COPILOT_APPLY_URL at a running server). Plain Vite serves the SPA only—`/api/copilot-apply` is not available there, so the app gets an HTML page instead of JSON.'

export class CopilotApiUnavailableError extends Error {
  constructor(message = COPILOT_DEV_HINT) {
    super(message)
    this.name = 'CopilotApiUnavailableError'
  }
}

function looksLikeHtml(body: string): boolean {
  const t = body.trimStart().slice(0, 64).toLowerCase()
  return t.startsWith('<!doctype') || t.startsWith('<html') || t.startsWith('<!DOCTYPE') || t.startsWith('<HTML')
}

export async function requestCopilotApply(payload: CopilotApplyPayload): Promise<CopilotApplyResult> {
  const url = getCopilotApplyUrl()
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userMessage: payload.userMessage,
      complexity: payload.complexity,
      songDurationSeconds: payload.songDurationSeconds,
      bpm: payload.bpm,
      analysis: {
        beat: payload.analysis.beat,
        bass: payload.analysis.bass,
        treble: payload.analysis.treble,
        vocals: payload.analysis.vocals,
        dynamics: payload.analysis.dynamics,
      },
      sections: payload.sections,
      props: payload.props.map((p) => ({
        id: p.id,
        name: p.name,
        type: p.type,
        channels: p.channels,
        controller: p.controller,
      })),
      currentEvents: payload.currentEvents,
    }),
  })

  const rawText = await res.text()
  const ct = res.headers.get('content-type') ?? ''

  if (ct.includes('text/html') || looksLikeHtml(rawText)) {
    throw new CopilotApiUnavailableError()
  }

  let data: {
    error?: string
    assistant_message?: string
    set_complexity?: number | null
    events?: ClaudeSequenceEvent[] | null
    replace_all_events?: boolean
  }

  try {
    data = JSON.parse(rawText) as typeof data
  } catch {
    throw new CopilotApiUnavailableError()
  }

  if (!res.ok) {
    throw new Error(data.error || `Copilot API failed (${res.status})`)
  }

  return {
    assistant_message: data.assistant_message ?? 'Done.',
    set_complexity: data.set_complexity ?? null,
    events: data.events ?? null,
    replace_all_events: data.replace_all_events === true,
  }
}

/**
 * Vercel serverless: POST /api/copilot-apply
 * Interprets natural-language sequence edits via Claude; returns assistant text + optional patches.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node'

type SectionInput = {
  name: string
  start: number
  end: number
  energy: number
  vocals: boolean
}

type PropInput = {
  id: string
  name: string
  type: string
  channels: number
  controller: string
}

type EventInput = {
  propId: string
  propName: string
  section: string
  start: number
  end: number
  intensity: number
  smoothness: number
  effect: string
  note?: string
}

type CopilotRequestPayload = {
  userMessage: string
  complexity: number
  songDurationSeconds?: number
  analysis?: {
    beat: number
    bass: number
    treble: number
    vocals: number
    dynamics: number
  }
  bpm?: number
  sections?: SectionInput[]
  props?: PropInput[]
  currentEvents?: EventInput[]
}

const ALLOWED_EFFECTS = [
  'Mouth Sync',
  'Pulse',
  'Sweep',
  'Twinkle',
  'Chase',
  'Hold',
  'Color Pop',
  'Shimmer',
  'Fan',
  'Ripple',
] as const

function buildPrompt(body: CopilotRequestPayload): string {
  const duration = Math.max(0, Number(body.songDurationSeconds) || 0)
  const bpm = Math.max(1, Math.round(Number(body.bpm) || 120))
  const analysis = body.analysis ?? {
    beat: 0,
    bass: 0,
    treble: 0,
    vocals: 0,
    dynamics: 0,
  }
  const sections = Array.isArray(body.sections) ? body.sections : []
  const props = Array.isArray(body.props) ? body.props : []
  const events = Array.isArray(body.currentEvents) ? body.currentEvents : []
  const msg = (body.userMessage || '').trim()

  const eventsJson = JSON.stringify(
    events.slice(0, 400).map((e) => ({
      propId: e.propId,
      propName: e.propName,
      section: e.section,
      start: e.start,
      end: e.end,
      intensity: e.intensity,
      effect: e.effect,
    })),
  )

  return `You are an expert holiday light show sequencer assistant (xLights / FPP style).

## User request
"${msg.replace(/"/g, '\\"')}"

## Song
- Duration: ${duration} seconds
- BPM: ${bpm}
- Analysis (0–100): beat ${analysis.beat}, bass ${analysis.bass}, treble ${analysis.treble}, vocals ${analysis.vocals}, dynamics ${analysis.dynamics}
- Current sequence complexity slider (0–100): ${body.complexity}

## Sections
${sections.map((s) => `- "${s.name}": ${s.start.toFixed(2)}s – ${s.end.toFixed(2)}s, energy ${s.energy}, vocals: ${s.vocals ? 'yes' : 'no'}`).join('\n')}

## Display props (use exact ids)
${props.map((p) => `- id "${p.id}" | "${p.name}" | type "${p.type}"`).join('\n')}

## Current timeline events (subset; full list may be longer)
${eventsJson}

## Your task
1. Interpret the user's request and decide what to change.
2. Respond with **only valid JSON** (no markdown fences) in this exact shape:
{
  "assistant_message": "Short, friendly summary of what you changed or why you could not.",
  "set_complexity": <number 0-100 or null if unchanged>,
  "replace_all_events": <true|false>,
  "events": <array or null>
}

3. If the user asks to adjust complexity, set "set_complexity" to the new value (integer 0–100).
4. If you need to replace the sequence, set "replace_all_events": true and provide "events" as a full JSON array of new events covering the song. Each event object must have:
   - "propId" (string, must match a prop id above)
   - "propName" (string)
   - "section" (string, must match a section name)
   - "start", "end" (numbers in seconds, 0 ≤ start < end ≤ ${duration})
   - "effect" (exactly one of: ${ALLOWED_EFFECTS.join(', ')})
   - "intensity" (integer 0–100)
5. For small tweaks (e.g. boost finale, more bass pulses), you may return "replace_all_events": false and "events": null, and only adjust "set_complexity" if relevant — OR return a **full** replacement array with replace_all_events true when restructuring is needed.
6. Never invent prop ids. If the request is impossible, explain in assistant_message and return null for events and null for set_complexity.
7. Keep assistant_message under 400 characters.`
}

function extractJsonObject(text: string): Record<string, unknown> {
  const trimmed = text.trim()
  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/)
  const raw = fence ? fence[1].trim() : trimmed
  const parsed = JSON.parse(raw) as unknown
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('Claude response is not a JSON object')
  }
  return parsed as Record<string, unknown>
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Content-Type', 'application/json')

  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    return res.status(204).end()
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return res.status(500).json({ error: 'Server misconfiguration: ANTHROPIC_API_KEY is not set' })
  }

  const model = process.env.CLAUDE_MODEL?.trim() || 'claude-sonnet-4-5'

  let body: CopilotRequestPayload
  try {
    body =
      typeof req.body === 'string'
        ? (JSON.parse(req.body) as CopilotRequestPayload)
        : (req.body as CopilotRequestPayload)
  } catch {
    return res.status(400).json({ error: 'Invalid JSON body' })
  }

  if (!body.userMessage?.trim()) {
    return res.status(400).json({ error: 'userMessage is required' })
  }

  if (!body.props?.length) {
    return res.status(400).json({ error: 'props array is required and must not be empty' })
  }
  if (!body.sections?.length) {
    return res.status(400).json({ error: 'sections array is required and must not be empty' })
  }

  const duration = Math.max(0.001, Number(body.songDurationSeconds) || 0)
  const propIds = new Set(body.props.map((p) => p.id))
  const prompt = buildPrompt(body)

  let textContent = ''
  try {
    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model,
        max_tokens: 8192,
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    const rawBody = await anthropicRes.text()
    let anthropicJson: {
      error?: { type?: string; message?: string }
      content?: Array<{ type: string; text?: string }>
    } | null = null
    try {
      anthropicJson = rawBody ? (JSON.parse(rawBody) as typeof anthropicJson) : null
    } catch {
      anthropicJson = null
    }

    if (!anthropicRes.ok) {
      const msg =
        anthropicJson?.error?.message ||
        (typeof rawBody === 'string' && rawBody.length > 0 ? rawBody.slice(0, 500) : anthropicRes.statusText)
      return res.status(502).json({
        error: `Anthropic API error (${anthropicRes.status}): ${msg}`,
        anthropicStatus: anthropicRes.status,
      })
    }

    if (!anthropicJson) {
      return res.status(502).json({ error: 'Anthropic returned invalid JSON' })
    }

    const block = anthropicJson.content?.find((c) => c.type === 'text')
    textContent = block?.text ?? ''
    if (!textContent) {
      return res.status(502).json({ error: 'Empty response from Claude' })
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Request failed'
    return res.status(502).json({ error: msg })
  }

  let parsed: Record<string, unknown>
  try {
    parsed = extractJsonObject(textContent)
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Invalid JSON from Claude'
    return res.status(502).json({ error: msg })
  }

  const assistantMessage =
    typeof parsed.assistant_message === 'string' ? parsed.assistant_message : 'Updated the sequence.'

  let setComplexity: number | null = null
  if (parsed.set_complexity != null) {
    const n = typeof parsed.set_complexity === 'number' ? parsed.set_complexity : Number(parsed.set_complexity)
    if (Number.isFinite(n)) setComplexity = Math.min(100, Math.max(0, Math.round(n)))
  }

  const replaceAll = parsed.replace_all_events === true
  const rawEvents = parsed.events

  const allowed = new Set<string>(ALLOWED_EFFECTS as unknown as string[])

  type OutEvent = {
    propId: string
    propName: string
    section: string
    start: number
    end: number
    effect: string
    intensity: number
  }

  let eventsOut: OutEvent[] | null = null

  if (Array.isArray(rawEvents) && rawEvents.length > 0) {
    const normalized: OutEvent[] = []
    for (const item of rawEvents) {
      if (!item || typeof item !== 'object') continue
      const o = item as Record<string, unknown>
      const propId = typeof o.propId === 'string' ? o.propId : ''
      if (!propId || !propIds.has(propId)) continue

      const propMeta = body.props!.find((p) => p.id === propId)
      const propName =
        typeof o.propName === 'string' && o.propName.length > 0 ? o.propName : propMeta?.name ?? 'Prop'

      const section = typeof o.section === 'string' ? o.section : ''
      const start = typeof o.start === 'number' ? o.start : Number(o.start)
      const end = typeof o.end === 'number' ? o.end : Number(o.end)
      if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) continue

      const effect = typeof o.effect === 'string' ? o.effect : ''
      if (!allowed.has(effect)) continue

      let intensity = typeof o.intensity === 'number' ? o.intensity : Number(o.intensity)
      if (!Number.isFinite(intensity)) intensity = 70
      intensity = Math.min(100, Math.max(0, Math.round(intensity)))

      const s = Math.max(0, start)
      const e = Math.min(duration, end)
      if (e <= s) continue

      normalized.push({
        propId,
        propName,
        section,
        start: s,
        end: e,
        effect,
        intensity,
      })
    }

    if (replaceAll && normalized.length === 0) {
      return res.status(502).json({ error: 'Claude returned no valid events for replacement' })
    }
    if (normalized.length > 0) eventsOut = normalized
  }

  return res.status(200).json({
    assistant_message: assistantMessage,
    set_complexity: setComplexity,
    events: eventsOut,
    replace_all_events: replaceAll,
  })
}

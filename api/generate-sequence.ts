/**
 * Vercel serverless: POST /api/generate-sequence
 * Calls Anthropic Claude to produce timeline events from song analysis + display props.
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

type SequenceRequestPayload = {
  songDurationSeconds?: number
  analysis?: {
    beat_confidence: number
    bass_strength: number
    treble_strength: number
    vocal_confidence: number
    dynamics: number
  }
  bpm?: number
  sections?: SectionInput[]
  props?: PropInput[]
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

function buildPrompt(body: SequenceRequestPayload): string {
  const duration = Math.max(0, Number(body.songDurationSeconds) || 0)
  const bpm = Math.max(1, Math.round(Number(body.bpm) || 120))
  const analysis = body.analysis ?? {
    beat_confidence: 0,
    bass_strength: 0,
    treble_strength: 0,
    vocal_confidence: 0,
    dynamics: 0,
  }
  const sections = Array.isArray(body.sections) ? body.sections : []
  const props = Array.isArray(body.props) ? body.props : []

  return `You are an expert holiday light show sequencer for RGB displays (xLights / FPP style).

## Task
Generate a light show SEQUENCE as a JSON array only (no markdown, no commentary). Each element must be one timeline event.

## Song
- Duration: ${duration} seconds
- BPM: ${bpm}
- Analysis metrics (0-100): beat confidence ${analysis.beat_confidence}, bass strength ${analysis.bass_strength}, treble strength ${analysis.treble_strength}, vocal confidence ${analysis.vocal_confidence}, dynamics ${analysis.dynamics}

## Sections (use exact names and time ranges)
${sections
  .map(
    (s) =>
      `- "${s.name}": ${s.start.toFixed(2)}s – ${s.end.toFixed(2)}s, energy ${s.energy}, vocals: ${s.vocals ? 'yes' : 'no'}`,
  )
  .join('\n')}

## Display props (use exact id and name; never invent prop ids)
${props
  .map(
    (p) =>
      `- id "${p.id}" | name "${p.name}" | type "${p.type}" | channels ${p.channels} | controller "${p.controller}"`,
  )
  .join('\n')}

## Creative rules (mandatory)
1. **Talking Face** props: use **Mouth Sync** during sections where vocals are present; use **Hold** (or subtle **Twinkle**) during non-vocal sections.
2. **Ground Stakes** props: use **Pulse** in bass-heavy / high-energy sections; calmer sections may use **Color Pop** or **Hold**.
3. **Mega Tree** props: use **Sweep** in high-energy sections (energy roughly ≥ 75); use **Twinkle** or **Shimmer** in lower-energy sections.
4. **Finale**: identify the section whose name suggests a finale/outro/ending (or the last high-energy section). For that section, use **maximum intensity (95-100)** for **all** props with bold effects (e.g. Sweep, Pulse, Chase, Shimmer as appropriate to prop type).
5. Other prop types: choose sensible effects from the allowed list; align energy with section energy and analysis metrics.
6. Split work into multiple events per section per prop when needed (roughly 4–14 second chunks) so the timeline is editable; cover the full section [start,end] for each prop without gaps inside the section.
7. **Effect names** must be exactly one of: ${ALLOWED_EFFECTS.join(', ')}.

## Output format (strict JSON array)
Return ONLY a JSON array. Each object must have:
- "propId" (string, must match an id from the props list)
- "propName" (string)
- "section" (string, must match a section name above)
- "start" (number, seconds, 0 – ${duration})
- "end" (number, seconds, > start, ≤ ${duration})
- "effect" (string, from allowed list)
- "intensity" (integer 0–100)

Example shape (illustrative): [{"propId":"…","propName":"…","section":"Chorus","start":45.2,"end":52.0,"effect":"Sweep","intensity":88}]`
}

function extractJsonArray(text: string): unknown {
  const trimmed = text.trim()
  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/)
  const raw = fence ? fence[1].trim() : trimmed
  const parsed = JSON.parse(raw) as unknown
  if (!Array.isArray(parsed)) throw new Error('Claude response is not a JSON array')
  return parsed
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

  const model = process.env.CLAUDE_MODEL?.trim() || 'claude-3-5-sonnet-20241022'

  let body: SequenceRequestPayload
  try {
    body =
      typeof req.body === 'string'
        ? (JSON.parse(req.body) as SequenceRequestPayload)
        : (req.body as SequenceRequestPayload)
  } catch {
    return res.status(400).json({ error: 'Invalid JSON body' })
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

    const anthropicJson = (await anthropicRes.json()) as {
      error?: { message?: string }
      content?: Array<{ type: string; text?: string }>
    }

    if (!anthropicRes.ok) {
      const msg = anthropicJson.error?.message || anthropicRes.statusText
      return res.status(502).json({ error: `Anthropic API error: ${msg}` })
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

  let rawEvents: unknown
  try {
    rawEvents = extractJsonArray(textContent)
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Invalid JSON from Claude'
    return res.status(502).json({ error: msg })
  }

  const normalized: Array<{
    propId: string
    propName: string
    section: string
    start: number
    end: number
    effect: string
    intensity: number
  }> = []

  const allowed = new Set<string>(ALLOWED_EFFECTS as unknown as string[])

  for (const item of rawEvents as unknown[]) {
    if (!item || typeof item !== 'object') continue
    const o = item as Record<string, unknown>
    const propId = typeof o.propId === 'string' ? o.propId : ''
    if (!propId || !propIds.has(propId)) continue

    const propMeta = body.props!.find((p) => p.id === propId)
    const propName =
      typeof o.propName === 'string' && o.propName.length > 0
        ? o.propName
        : propMeta?.name ?? 'Prop'

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

  if (normalized.length === 0) {
    return res.status(502).json({ error: 'Claude returned no valid sequence events' })
  }

  return res.status(200).json({ events: normalized })
}

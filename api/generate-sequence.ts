/**
 * Vercel serverless: POST /api/generate-sequence
 * Calls Anthropic Claude to produce timeline events from song analysis + display props.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { CHRISTMAS_SYSTEM_PROMPT } from '../src/holidays/christmas/prompts'
// TODO: Import HALLOWEEN_SYSTEM_PROMPT and swap based on holidayId parameter
// import { HALLOWEEN_SYSTEM_PROMPT } from '../src/holidays/halloween/prompts'

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
  // TODO: Accept holidayId to swap between CHRISTMAS_SYSTEM_PROMPT / HALLOWEEN_SYSTEM_PROMPT
  stylePreset?: 'beginner' | 'standard' | 'spectacular'
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

const STYLE_PRESET_INSTRUCTIONS: Record<string, string> = {
  beginner:
    'Keep effects simple. Max 2 effect types per prop. Long blocks, no rapid switching. Prioritize on/off patterns.',
  standard:
    'Balanced complexity. Variety of effects. Match energy to song sections.',
  spectacular:
    'Maximum complexity. Dense effect blocks. Rapid switching on high energy sections. All props active during chorus and finale.',
}

function buildUserMessage(body: SequenceRequestPayload): string {
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
  const stylePreset = body.stylePreset ?? 'standard'

  let msg = `Return ONLY a JSON object. Start your response with { and end with }. No explanation, no markdown, no code blocks.

Generate a light show sequence for this song. Return ONLY valid JSON with the shape:
{
  "events": [
    {
      "propId": "string",
      "propName": "string",
      "effect": "Pulse|Chase|Twinkle|Sweep|Shimmer|Mouth Sync|Hold|Color Pop|Fan|Ripple",
      "start": 0.0,
      "end": 4.0,
      "intensity": 0.8,
      "color": "#ffe8c0"
    }
  ]
}

## Song
- Duration: ${duration} seconds
- BPM: ${bpm}

## Audio Analysis (0-100)
- Beat confidence: ${analysis.beat_confidence}
- Bass strength: ${analysis.bass_strength}
- Treble strength: ${analysis.treble_strength}
- Vocal confidence: ${analysis.vocal_confidence}
- Dynamics: ${analysis.dynamics}

## Sections (use exact names and time ranges)
${sections
  .map(
    (s) =>
      `- "${s.name}": ${s.start.toFixed(2)}s – ${s.end.toFixed(2)}s, energy ${s.energy}, vocals: ${s.vocals ? 'yes' : 'no'}`,
  )
  .join('\n')}

## Display Props (use exact id, name, and type — never invent prop ids)
${props
  .map(
    (p) =>
      `- id "${p.id}" | name "${p.name}" | type "${p.type}" | channels ${p.channels} | controller "${p.controller}"`,
  )
  .join('\n')}

## Allowed effects (use exactly these names)
${ALLOWED_EFFECTS.join(', ')}

## CRITICAL RULES
- Generate 2-4 events per prop per section (not 1 giant block)
- Each event: 4-12 seconds duration maximum
- Vary effects within each prop — no two consecutive events on the same prop should have the same effect
- Be concise — total response must fit in 8000 tokens
- High energy sections: intensity 70-95, faster effects
- Low energy: intensity 30-60, Hold and Shimmer
- Talking Tree Face: Mouth Sync in vocal sections only
- Finale: all props intensity 85-100
- Cover full song duration, no gaps per prop
- Return ONLY valid JSON, no explanation`

  const styleInstructions = STYLE_PRESET_INSTRUCTIONS[stylePreset]
  if (styleInstructions) {
    msg += `\n\n## Style preset: ${stylePreset}\n${styleInstructions}`
  }

  return msg
}

function extractJsonArray(text: string): unknown[] {
  if (!text?.trim()) throw new Error('Empty response from Claude')

  // Try to find JSON object with events array
  const objMatch = text.match(/\{[\s\S]*"events"[\s\S]*\}/)
  if (objMatch) {
    try {
      const parsed = JSON.parse(objMatch[0]) as Record<string, unknown>
      if (Array.isArray(parsed.events)) return parsed.events
    } catch { /* continue */ }
  }

  // Try direct array
  const arrMatch = text.match(/\[[\s\S]*\]/)
  if (arrMatch) {
    try {
      const parsed = JSON.parse(arrMatch[0])
      if (Array.isArray(parsed)) return parsed
    } catch { /* continue */ }
  }

  // Try stripping markdown fences
  const clean = text.replace(/```json|```/g, '').trim()
  try {
    const parsed = JSON.parse(clean) as unknown
    if (Array.isArray(parsed)) return parsed
    if (parsed && typeof parsed === 'object') {
      const obj = parsed as Record<string, unknown>
      if (Array.isArray(obj.events)) return obj.events
    }
  } catch { /* continue */ }

  throw new Error(
    `Could not extract JSON from Claude response. Response length: ${text.length} chars. Preview: ${text.slice(0, 200)}`,
  )
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

  const model = process.env.CLAUDE_MODEL?.trim() || 'claude-sonnet-4-5-20251001'

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

  const userMessage = buildUserMessage(body)

  // TODO: Select system prompt based on holidayId parameter (christmas vs halloween)
  const systemPrompt = CHRISTMAS_SYSTEM_PROMPT

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
        stop_sequences: [],
        system: systemPrompt,
        messages: [{ role: 'user', content: userMessage }],
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
      const errPayload = anthropicJson ?? { parseError: 'Response was not JSON', rawBody }
      console.error('[generate-sequence] Anthropic API error', {
        status: anthropicRes.status,
        statusText: anthropicRes.statusText,
        model,
        body: errPayload,
      })
      const msg =
        anthropicJson?.error?.message ||
        (typeof rawBody === 'string' && rawBody.length > 0 ? rawBody.slice(0, 500) : anthropicRes.statusText)
      return res.status(502).json({
        error: `Anthropic API error (${anthropicRes.status}): ${msg}`,
        anthropicStatus: anthropicRes.status,
        anthropicBody: errPayload,
      })
    }

    if (!anthropicJson) {
      console.error('[generate-sequence] Anthropic success status but invalid JSON', { rawBody: rawBody.slice(0, 2000) })
      return res.status(502).json({
        error: 'Anthropic returned non-JSON success body',
        anthropicBody: { rawBody: rawBody.slice(0, 4000) },
      })
    }

    const block = anthropicJson.content?.find((c) => c.type === 'text')
    textContent = block?.text ?? ''
    if (!textContent) {
      console.error('[generate-sequence] Empty Claude text block', { anthropicJson })
      return res.status(502).json({
        error: 'Empty response from Claude (no text content block)',
        anthropicBody: anthropicJson,
      })
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Request failed'
    console.error('[generate-sequence] Fetch/network error', e)
    return res.status(502).json({ error: msg, anthropicBody: null })
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

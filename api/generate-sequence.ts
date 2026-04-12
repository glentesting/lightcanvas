/**
 * Vercel serverless: POST /api/generate-sequence
 * Calls Anthropic Claude to produce timeline events from song analysis + display props.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node'

const CHRISTMAS_SYSTEM_PROMPT = `
You are an expert holiday light show sequencer for Christmas displays. Generate sequences that are joyful, energetic, and synchronized to the music.

Prop behavior:
- Mega Tree: pulse on bass, sweep on chorus, twinkle on verses
- Mini Tree: mirror mega tree at lower intensity
- Talking Tree Face: mouth sync to vocals, hold elsewhere
- Roofline: chase on high energy, shimmer on transitions
- Arch: ripple outward on beat drops
- Stake/Cluster: treble pulse, quick flicker on drums
- Matrix: pixel wave patterns, color shifts on sections

Style: builds from subtle intro, peaks at chorus, spectacular finale with all props at maximum intensity.
`

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

  // Summarize props by type for smaller prompt
  const typeCounts = new Map<string, number>()
  for (const p of props) {
    typeCounts.set(p.type, (typeCounts.get(p.type) ?? 0) + 1)
  }
  const propSummary = [...typeCounts.entries()]
    .map(([type, count]) => `${count} ${type}${count > 1 ? 's' : ''}`)
    .join(', ')

  // List props with id and name (compact)
  const propList = props
    .map((p) => `"${p.id}":"${p.name}"(${p.type})`)
    .join(', ')

  // Sections: name, start, end, energy only — rounded to 1 decimal
  const sectionList = sections
    .map((s) => `${s.name}:${s.start.toFixed(1)}-${s.end.toFixed(1)}s e${s.energy}`)
    .join(', ')

  let msg = `Return ONLY a JSON object {events:[...]}. No explanation.

Song: ${duration}s, ${bpm}BPM. Analysis: beat${analysis.beat_confidence} bass${analysis.bass_strength} treble${analysis.treble_strength} vocal${analysis.vocal_confidence} dynamics${analysis.dynamics}

Sections: ${sectionList}

Props (${propSummary}): ${propList}

Effects: ${ALLOWED_EFFECTS.join(', ')}

Format: {"events":[{"propId":"id","propName":"name","effect":"Effect","start":0.0,"end":8.0,"intensity":75}]}

## CRITICAL RULES
- Generate 1-2 events per prop per section
- Each event: 8-20 seconds duration
- Vary effects — no same effect twice in a row per prop
- Talking Tree Face: Mouth Sync in vocal sections only
- Finale: all props intensity 85-100
- Cover full song, no gaps
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

const SPLIT_EFFECTS = [
  'Pulse', 'Chase', 'Twinkle', 'Sweep', 'Shimmer',
  'Ripple', 'Color Pop', 'Fan', 'Hold', 'Mouth Sync',
]

function splitLongEvents(events: unknown[], maxDuration = 12): unknown[] {
  const result: unknown[] = []
  for (const event of events) {
    if (!event || typeof event !== 'object') { result.push(event); continue }
    const o = event as Record<string, unknown>
    const start = typeof o.start === 'number' ? o.start : Number(o.start)
    const end = typeof o.end === 'number' ? o.end : Number(o.end)
    const duration = end - start
    if (!Number.isFinite(duration) || duration <= maxDuration) {
      result.push(event)
      continue
    }
    const effect = typeof o.effect === 'string' ? o.effect : 'Hold'
    const effectIdx = SPLIT_EFFECTS.indexOf(effect)
    const chunks = Math.ceil(duration / maxDuration)
    const chunkSize = duration / chunks
    for (let i = 0; i < chunks; i++) {
      const newEffect = i % 2 === 0
        ? effect
        : SPLIT_EFFECTS[(effectIdx + 1) % SPLIT_EFFECTS.length]
      result.push({
        ...o,
        start: start + i * chunkSize,
        end: start + (i + 1) * chunkSize,
        effect: newEffect,
      })
    }
  }
  return result
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

  const model = process.env.CLAUDE_MODEL?.trim() || 'claude-sonnet-4-6'

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
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 45000)

    let anthropicRes: Response
    try {
      anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'content-type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model,
          max_tokens: 8192,
          system: systemPrompt,
          messages: [{ role: 'user', content: userMessage }],
        }),
      })
    } catch (fetchErr) {
      clearTimeout(timeoutId)
      if (fetchErr instanceof Error && fetchErr.name === 'AbortError') {
        return res.status(504).json({
          error: 'Sequence generation timed out. Try with fewer props or a shorter song.',
        })
      }
      throw fetchErr
    }
    clearTimeout(timeoutId)

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

  let rawEvents: unknown[]
  try {
    rawEvents = extractJsonArray(textContent)
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Invalid JSON from Claude'
    return res.status(502).json({ error: msg })
  }

  // Split long events into shorter varied blocks
  rawEvents = splitLongEvents(rawEvents, 12)

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

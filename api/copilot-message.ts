/**
 * Vercel serverless: POST /api/copilot-message
 * Real Claude-powered copilot for natural-language light show edits.
 */
import { createClient } from '@supabase/supabase-js'
import type { VercelRequest, VercelResponse } from '@vercel/node'

type ChatHistoryMessage = {
  role: 'user' | 'assistant'
  text: string
}

type PropInput = {
  id: string
  name: string
  type: string
  channels: number
  controller: string
}

type EventSummary = {
  propId: string
  propName: string
  effect: string
  start: number
  end: number
  intensity: number
}

type CopilotMessagePayload = {
  message: string
  currentEvents?: EventSummary[]
  props?: PropInput[]
  songAnalysis?: {
    beat: number
    bass: number
    treble: number
    vocals: number
    dynamics: number
    bpm?: number
    duration?: number
  }
  chatHistory?: ChatHistoryMessage[]
}

const SYSTEM_PROMPT = `You are an AI assistant for LightCanvas, a holiday light show sequencer. You help users modify their light show sequences using natural language. When the user asks you to change something, return a JSON response with:
{
  "reply": "conversational response to the user",
  "events": [...modified events array or null if no changes]
}
Always return valid JSON. If no sequence changes are needed, set events to null. Keep replies friendly and brief.

Each event in the events array must have:
- "propId" (string, must match a prop id from the props list)
- "propName" (string)
- "effect" (one of: Mouth Sync, Pulse, Sweep, Twinkle, Chase, Hold, Color Pop, Shimmer, Fan, Ripple)
- "start" (number, seconds)
- "end" (number, seconds)
- "intensity" (integer 0-100)
- "section" (string)`

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Content-Type', 'application/json')

  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    return res.status(204).end()
  }

  const authHeader = req.headers.authorization
  const bearer =
    typeof authHeader === 'string' && authHeader.toLowerCase().startsWith('bearer ')
      ? authHeader.slice(7).trim()
      : Array.isArray(authHeader) &&
          typeof authHeader[0] === 'string' &&
          authHeader[0].toLowerCase().startsWith('bearer ')
        ? authHeader[0].slice(7).trim()
        : ''
  if (!bearer) {
    return res.status(401).json({ error: 'Unauthorized' })
  }
  const supabaseUrl = process.env.VITE_SUPABASE_URL
  const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY
  if (!supabaseUrl || !supabaseAnonKey) {
    return res.status(500).json({ error: 'Server misconfiguration: Supabase is not configured' })
  }
  const supabase = createClient(supabaseUrl, supabaseAnonKey)
  const { data: authData, error: authError } = await supabase.auth.getUser(bearer)
  if (authError || !authData?.user) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return res.status(500).json({ error: 'Server misconfiguration: ANTHROPIC_API_KEY is not set' })
  }

  let body: CopilotMessagePayload
  try {
    body =
      typeof req.body === 'string'
        ? (JSON.parse(req.body) as CopilotMessagePayload)
        : (req.body as CopilotMessagePayload)
  } catch {
    return res.status(400).json({ error: 'Invalid JSON body' })
  }

  if (!body.message?.trim()) {
    return res.status(400).json({ error: 'message is required' })
  }

  const props = Array.isArray(body.props) ? body.props : []
  const currentEvents = Array.isArray(body.currentEvents) ? body.currentEvents : []
  const chatHistory = Array.isArray(body.chatHistory) ? body.chatHistory : []
  const analysis = body.songAnalysis

  // Build user message with context
  let userContent = ''

  if (chatHistory.length > 0) {
    userContent += '## Recent conversation\n'
    for (const msg of chatHistory.slice(-10)) {
      userContent += `${msg.role}: ${msg.text}\n`
    }
    userContent += '\n'
  }

  if (props.length > 0) {
    userContent += '## Display props\n'
    for (const p of props) {
      userContent += `- id "${p.id}" | name "${p.name}" | type "${p.type}"\n`
    }
    userContent += '\n'
  }

  if (analysis) {
    userContent += `## Song analysis\n`
    userContent += `BPM: ${analysis.bpm ?? 'unknown'}, Duration: ${analysis.duration ?? 'unknown'}s\n`
    userContent += `Beat: ${analysis.beat}, Bass: ${analysis.bass}, Treble: ${analysis.treble}, Vocals: ${analysis.vocals}, Dynamics: ${analysis.dynamics}\n\n`
  }

  if (currentEvents.length > 0) {
    userContent += `## Current sequence (${currentEvents.length} events)\n`
    const summary = currentEvents.slice(0, 30).map(
      (e) => `${e.propName}: ${e.effect} ${e.start.toFixed(1)}-${e.end.toFixed(1)}s @ ${e.intensity}%`,
    )
    userContent += summary.join('\n') + '\n'
    if (currentEvents.length > 30) {
      userContent += `... and ${currentEvents.length - 30} more events\n`
    }
    userContent += '\n'
  }

  userContent += `## User request\n${body.message}`

  // Build messages array with chat history for multi-turn context
  const messages: Array<{ role: 'user' | 'assistant'; content: string }> = [
    { role: 'user', content: userContent },
  ]

  try {
    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 8192,
        system: SYSTEM_PROMPT,
        messages,
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
        (rawBody.length > 0 ? rawBody.slice(0, 500) : anthropicRes.statusText)
      console.error('[copilot-message] Anthropic API error', { status: anthropicRes.status, msg })
      return res.status(502).json({ error: `Anthropic API error (${anthropicRes.status}): ${msg}` })
    }

    if (!anthropicJson) {
      return res.status(502).json({ error: 'Anthropic returned non-JSON success body' })
    }

    const block = anthropicJson.content?.find((c) => c.type === 'text')
    const textContent = block?.text ?? ''
    if (!textContent) {
      return res.status(502).json({ error: 'Empty response from Claude' })
    }

    // Parse the JSON response from Claude
    let parsed: { reply?: string; events?: unknown[] | null }
    try {
      const trimmed = textContent.trim()
      const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/)
      const raw = fence ? fence[1].trim() : trimmed
      parsed = JSON.parse(raw) as typeof parsed
    } catch {
      // If Claude didn't return valid JSON, treat the whole response as a text reply
      return res.status(200).json({ reply: textContent, events: null })
    }

    return res.status(200).json({
      reply: parsed.reply ?? textContent,
      events: Array.isArray(parsed.events) ? parsed.events : null,
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Request failed'
    console.error('[copilot-message] Fetch/network error', e)
    return res.status(502).json({ error: msg })
  }
}

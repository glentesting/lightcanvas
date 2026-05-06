# V2-04 — Real AI Integration (Lumi)

Swap the mock AI provider for real Anthropic API. The interface was built for this — it's one file change plus additional capabilities.

## Provider swap

The mock provider lives behind an `AIProvider` interface. Replace `MockAIProvider` with `AnthropicAIProvider` in `lib/ai/provider.ts`. The rest of the system is unchanged.

Use `claude-sonnet-4-5` model. API key is already in environment variables (confirm `ANTHROPIC_API_KEY` is set in Vercel).

## Prompt engineering for sequence generation

The AI receives:
- Song BPM and beat grid (array of timestamps)
- Song duration
- Audio energy curve (from analysis)
- Fixture list (name, type, pixel count)
- User's vibe selection (energetic, calm, holiday classic, etc.)
- Intensity level (0-100)
- Any existing effects on the timeline (so Lumi can add to rather than replace)

The AI outputs a structured JSON array of effect blocks:
```json
[
  {
    "fixtureId": "fixture-uuid",
    "effectType": "chase",
    "startTimeMs": 0,
    "endTimeMs": 4650,
    "parameters": { "color": "#FF0000", "speed": 0.7 }
  }
]
```

Validate output against zod schema before applying.

## Phrase / section detection

Extend the existing Meyda beat detection to identify song structure:
- Use librosa-style onset detection already available in Meyda
- Segment the song into sections based on energy profile changes
- Label sections as: intro, verse, chorus, bridge, outro (heuristic — not perfect)
- Store sections in `audio.sections` in the project JSONB

This data feeds into AI prompts: "The chorus runs from 0:45 to 1:15. Make it more intense than the verse."

## Spectral audio features

Also store in `audio.spectralFeatures`:
- Bass energy per beat (for pulse/strobe triggering)
- High-frequency energy per beat (for twinkle/shimmer triggering)
- Overall loudness curve (for brightness driving)

Use these in effect rendering for audio-reactive effects:
- "Pulse" effect intensity tracks bass beat energy
- "Sparkle" density tracks high-frequency energy

## AI style presets

Add preset prompts that users can select:

- "TSO Style" — dense, synchronized, lots of chases and color sweeps
- "Calm & Elegant" — slow washes, gentle fades, warm colors
- "High Energy EDM" — fast strobes, rapid color changes, beat-driven
- "Classic Holiday" — traditional red/green/white, slower tempo
- "Subtle & Tasteful" — light accents, mostly off, highlights on beat

These are prepended to the AI prompt as style context.

## AI remix

After a show is generated, "Refine" prompt options:
- "Make it more energetic"
- "Use more red and green"
- "Add more to the chorus"
- "Slow it down"
- "Make the intro less busy"

Each sends the current sequence + the refinement instruction to the AI. Result appears on the suggestion track (V2-01), not applied directly.

## Acceptance

- Real AI generates effects that are structurally valid and pass zod validation
- Generation completes within 30 seconds for a 3-minute song
- SSE streaming shows real progress (not fake ticks)
- Song sections (chorus, verse, etc.) are detected and visible in audio track
- Style presets produce noticeably different show styles
- Spectral features drive audio-reactive effects in preview
- "Refine" prompt modifies the existing show intelligently
- API errors are handled gracefully — user sees a clear message, not a crash

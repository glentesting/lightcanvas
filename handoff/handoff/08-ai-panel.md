# 08 — AI Panel & Mock Provider

The AI panel from the prototype slides in from the right when "AI Actions" is clicked. Five actions, each with the same shape: click → loading state → applies a structured patch to the project. Wire it end-to-end against a **mock provider** now; we'll swap to real Anthropic later by replacing one file.

## Provider interface

```ts
// lib/ai/provider.ts
export interface AIProvider {
  generateFromMusic(input: GenerateInput): AsyncIterable<AIEvent>;
  suggestBeatDrops(input: BeatDropsInput): AsyncIterable<AIEvent>;
  styleTransfer(input: StyleTransferInput): AsyncIterable<AIEvent>;
  fillGaps(input: FillGapsInput): AsyncIterable<AIEvent>;
  describeShow(input: DescribeInput): AsyncIterable<AIEvent>;
}

export type AIEvent =
  | { type: 'progress'; step: string; pct: number }
  | { type: 'thought'; text: string }
  | { type: 'patch'; patch: ProjectPatch }   // applied incrementally
  | { type: 'done'; summary: string }
  | { type: 'error'; message: string };

export interface ProjectPatch {
  addBlocks?: EffectBlock[];
  removeBlockIds?: string[];
  updateBlocks?: Array<{ id: string; patch: Partial<EffectBlock> }>;
  // Future: addFixtures, etc.
}

interface GenerateInput {
  audio: AudioAnalysis;
  fixtures: Fixture[];
  vibe: 'classic' | 'jazz' | 'edm' | 'cinematic' | 'whimsical';
  intensity: 'subtle' | 'balanced' | 'wild';
  startTime?: number;
  endTime?: number;
}
```

## Mock provider

```ts
// lib/ai/mock-provider.ts
export class MockAIProvider implements AIProvider {
  async *generateFromMusic(input: GenerateInput): AsyncIterable<AIEvent> {
    yield { type: 'progress', step: 'Listening to song…', pct: 10 };
    await sleep(800);
    yield { type: 'progress', step: 'Mapping beats to fixtures…', pct: 35 };
    await sleep(900);
    yield { type: 'thought', text: `Detected ${input.audio.beats.length} beats at ${input.audio.bpm} BPM. Building chase patterns on the roofline for the chorus…` };
    await sleep(600);
    yield { type: 'progress', step: 'Composing effect blocks…', pct: 70 };
    await sleep(700);

    // Generate plausible effect arrangement using the song's beats
    const blocks = composeFromBeats(input);
    for (const block of blocks) {
      yield { type: 'patch', patch: { addBlocks: [block] } };
      await sleep(40); // streamed feel
    }
    yield { type: 'progress', step: 'Finalizing…', pct: 100 };
    yield { type: 'done', summary: `Added ${blocks.length} effects across ${new Set(blocks.map(b => b.trackId)).size} fixtures.` };
  }

  // … similar implementations for the other 4 actions
}

function composeFromBeats(input: GenerateInput): EffectBlock[] {
  const { audio, fixtures, intensity, vibe } = input;
  const blocks: EffectBlock[] = [];
  const rules = VIBE_RULES[vibe];           // dictionary mapping vibe → effect preferences

  for (const fixture of fixtures) {
    const role = pickRole(fixture, rules);  // 'lead' | 'rhythm' | 'accent'
    audio.downbeats.forEach((t, i) => {
      // pick an effect for this bar based on role + intensity
      blocks.push({
        id: nanoid(),
        trackId: fixture.id,
        effectId: pickEffect(role, intensity, vibe, i),
        start: t,
        duration: audio.downbeats[i + 1] ? audio.downbeats[i + 1] - t : 2,
        params: defaultParamsFor(/* … */),
      });
    });
  }
  return blocks;
}
```

The composition rules don't have to be brilliant — they just need to produce plausible output. Aim for: rooflines tend to chase/wave, mega trees firework on drops, windows fade slowly, bushes twinkle.

## Real provider (stub for now)

```ts
// lib/ai/anthropic-provider.ts — DO NOT IMPLEMENT YET
export class AnthropicProvider implements AIProvider {
  // Sketch: server-side route /api/ai/generate streams Anthropic events,
  // we transform them into AIEvents above. Tool-use schema where the model
  // can call addBlock/removeBlock primitives, validated with zod.
  async *generateFromMusic(): AsyncIterable<AIEvent> { throw new Error('Not implemented'); }
}
```

The factory in `lib/ai/index.ts` returns the provider:

```ts
export function getAIProvider(): AIProvider {
  if (process.env.NEXT_PUBLIC_AI_PROVIDER === 'anthropic') return new AnthropicProvider();
  return new MockAIProvider();
}
```

## API route

`/api/ai/generate/route.ts` — Server-Sent Events stream of `AIEvent`s. The client `EventSource`s this and the AI panel renders the event log.

```ts
export async function POST(req: Request) {
  const { userId } = auth();
  if (!userId) return new Response('Unauthorized', { status: 401 });
  const input = GenerateInputSchema.parse(await req.json());
  const provider = getAIProvider();

  return new Response(
    new ReadableStream({
      async start(controller) {
        const enc = new TextEncoder();
        for await (const event of provider.generateFromMusic(input)) {
          controller.enqueue(enc.encode(`data: ${JSON.stringify(event)}\n\n`));
        }
        controller.close();
      },
    }),
    { headers: { 'Content-Type': 'text/event-stream' } }
  );
}
```

## Panel UX (matches the prototype)

- Five action cards with icon + title + description
- Click → expand inline with a small form (vibe, intensity, time-range)
- Run → progress steps animate in, then a "thoughts" stream, then "X effects added — Undo / Keep"
- "Undo" runs a single Cmd+Z equivalent that pops everything the AI added (the AI patches are wrapped in one history entry)

## Acceptance

- [ ] Click "Generate from Music" with the demo song — within ~3s, ~30 effect blocks appear on the timeline
- [ ] Progress text updates as it runs
- [ ] Pressing "Undo" after a generation removes everything in one step
- [ ] Closing the panel mid-generation cancels the stream (controller.close + abort signal)
- [ ] Swapping `NEXT_PUBLIC_AI_PROVIDER=anthropic` fails predictably ("Not implemented") rather than crashing

# 07 — Preview Engine

Goal: at any time `t`, render every pixel of every fixture with the correct color and brightness based on the active effect blocks. Two render modes:

- **SVG** (default) — circles per pixel, fast, crisp, no filters
- **Canvas "fancy"** — bloom/glow via shadow-blur, accumulated frames, more expensive

Toggle is a switch in the Preview tab top bar.

## Render pipeline

```
Sequence + Fixtures + t  →  pixelStates: Map<fixtureId, RGB[]>
                              ↓
              Renderer (SVG or Canvas) draws using fixture.layout.points
```

Pure function — same inputs always produce same output. No state held across frames *except* in canvas-fancy mode where we keep a previous-frame buffer for trail effects (meteor) and bloom.

## Effect implementations

Each effect is a pure function in `lib/render/effects/{id}.ts`:

```ts
// lib/render/effects/types.ts
export interface EffectInput {
  block: EffectBlock;       // .start, .duration, .params
  fixture: Fixture;         // .pixelCount
  t: number;                // absolute time in song
  beats?: number[];         // for beat-synced effects
}

export type EffectFn = (input: EffectInput) => RGB[]; // length = fixture.pixelCount
export type RGB = [number, number, number];           // 0..255
```

**Twinkle:** seeded random pixels light up briefly at `params.density` rate. Use a deterministic PRNG seeded by `block.id + Math.floor((t - block.start) * 10)` so the pattern is stable per render.

**Chase:** a band of `params.trailLength || 8` pixels travels along the fixture. Direction from `params.direction`. Speed from `params.speed`. Trail fades exponentially.

**Fade:** all pixels at the same color, brightness eases in/out across the block. `params.easing` selects the curve.

**Strobe:** all pixels full-on for half a frame interval, off for the other half, at `params.speed * 8 Hz`.

**Sparkle:** like twinkle but with two colors and faster decay.

**Wave:** sinusoidal brightness across pixel index, phase moves with time. Color is `params.color1`; if `color2` set, hue lerps along the wave.

**Pulse:** all pixels modulate brightness with a sine, frequency tied to BPM if available, else `params.speed`.

**Wash:** linear gradient between `color1` and `color2` across the strand; if only one color, solid.

**Meteor:** a head pixel travels with a trail; trail length = `params.trailLength`. Mode is "additive" with previous frame for nice persistence in canvas mode.

**Firework:** at `block.start + i * (duration / burstCount)` for `i in 0..burstCount`, emit a burst — a chosen pixel index goes white for ~80ms, then fades through `color1` over ~600ms outward to neighboring pixels.

Document the math of each in code comments. These are the heart of the product — the user cares about how they look.

## Effect compositing

If two blocks on the same fixture overlap in time (rare but allowed):
- Default: later block (higher `start`) **replaces** earlier — last-writer-wins per pixel
- If a block has `params.blendMode = 'add'` (advanced; not surfaced in v1 UI), its RGB is added clamped to 255

## Renderer — SVG mode

```tsx
// preview/svg-renderer.tsx
function SvgRenderer({ project, t }: { project: Project; t: number }) {
  const pixelStates = renderEngine(project.sequence, project.fixtures, t, project.audio?.beats);
  return (
    <svg viewBox="0 0 1600 900" className="w-full h-full">
      <HouseTemplate template={project.houseTemplate} customSvg={project.houseCustomSvg} />
      {project.fixtures.map(f => {
        if (!f.layout) return null;
        const points = sampleAlongPolyline(f.layout.points, f.pixelCount); // returns N {x,y}
        const rgbs = pixelStates.get(f.id) ?? [];
        return points.map((p, i) => (
          <circle key={`${f.id}-${i}`}
            cx={p.x * 1600} cy={p.y * 900}
            r={2.5}
            fill={`rgb(${rgbs[i].join(',')})`}
            opacity={Math.max(rgbs[i][0], rgbs[i][1], rgbs[i][2]) / 255} />
        ));
      })}
    </svg>
  );
}
```

Re-renders on every `t` change. Don't memoize per-pixel — React's reconciler is fast enough at ~3000 pixels @ 30fps. If perf drags, switch to canvas (you'll need to anyway for export).

## Renderer — Canvas "fancy" mode

```tsx
function CanvasRenderer({ project, t }: { project: Project; t: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const ctx = ref.current!.getContext('2d')!;
    ctx.fillStyle = 'rgba(0,0,0,0.15)';        // gentle persistence-of-vision fade
    ctx.fillRect(0, 0, 1600, 900);
    const pixelStates = renderEngine(project.sequence, project.fixtures, t, project.audio?.beats);
    project.fixtures.forEach(f => {
      const points = sampleAlongPolyline(f.layout!.points, f.pixelCount);
      const rgbs = pixelStates.get(f.id) ?? [];
      points.forEach((p, i) => {
        const [r, g, b] = rgbs[i];
        ctx.shadowBlur = 12;
        ctx.shadowColor = `rgb(${r},${g},${b})`;
        ctx.fillStyle = `rgb(${r},${g},${b})`;
        ctx.beginPath();
        ctx.arc(p.x * 1600, p.y * 900, 3, 0, Math.PI * 2);
        ctx.fill();
      });
    });
  }, [t]);
  return <canvas ref={ref} width={1600} height={900} className="w-full h-full" />;
}
```

The house SVG is rendered as a separate `<img>` or inline SVG behind the canvas (z-index lower).

## Performance

Target 30fps with 3000 pixels on a mid-tier laptop. Levers if it's slow:
- Skip render frames when `currentTime` hasn't changed enough (>1/60s threshold)
- In SVG mode, only update `fill` and `opacity` on existing circles, don't recreate them
- Move effect computation to a Web Worker if it's the bottleneck (unlikely below 10k pixels)

## Acceptance

- [ ] All 10 effects render visibly different and recognizable
- [ ] Playing the demo "Wizards in Winter" project shows lights flickering on the house in time with the music
- [ ] Toggling SVG ↔ canvas-fancy is seamless, no flash of empty house
- [ ] Scrubbing the playhead updates the preview in real-time, not just on play
- [ ] Browser CPU stays under 60% during preview playback

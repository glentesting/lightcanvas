# Photographic Visualizer V2 Prototype

This prototype is intentionally isolated from the shipping visualizer.

## Files

- `src/lib/scene/v2/photographic-compositor.ts`
- `src/components/scene/PhotographicStageV2.tsx`
- `src/app/dev/visualizer-v2/page.tsx`
- `src/app/dev/visualizer-v2/demo-data.ts`
- `scripts/visualizer-v2-screenshot.mjs`

## Run

```bash
npm run dev
```

Open `http://localhost:3000/dev/visualizer-v2`.

Use `?photo=/dev/test-photos/your-photo.jpg` to load a bundled local test image,
or use the photo picker in the route.

## Purpose

The prototype tests a different foundation:

1. Stable photographic night plate
2. Surface-receiving mask
3. Colored light spill
4. Separate broad and near halos
5. Small bulb cores
6. No depth mesh and no full-scene bloom

It does not replace `PhotoDepthScene`, `NightStage`, `PreviewPanel`, or
`/dev/stage`.

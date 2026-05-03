# Open questions to resolve before / during implementation

Things the design + prototype don't fully answer. Surface to the user when you hit them.

## Audio
- Max audio file length / size? (Suggest: cap at 15 min, 30MB. Christmas songs are 3–5min.)
- Multi-song shows? (Out of scope v1.)
- Audio re-analysis trigger if user replaces the song? (Yes, blow away `audio` and re-run.)

## Fixtures
- Can a fixture belong to multiple groups? (Suggest: no, simpler.)
- Pixel order: clockwise or strand-direction? Some users wire arches L→R, some R→L. (Add an "invert direction" toggle on the fixture.)
- DMX-style heads (moving lights, RGBW)? (Out of scope v1 — note in handoff for v2.)

## Timeline
- Per-track effect layering (multiple stacked effects on one track at the same time)? Prototype shows single-layer; xLights supports multi-layer. (Decide before shipping — I'd suggest single layer in v1, "Add layer" feature later.)
- Looping a region during playback? (Nice-to-have, not in v1 acceptance.)

## AI
- Token budget when we swap to real Claude — how many beats can we send? (At 140 BPM × 3min that's ~420 beats; well under any context limit. But effect-block output for a full song could be 100s of blocks — stream them, don't generate all at once.)
- Caching: re-running "Generate from Music" with same inputs should cache. Use Vercel KV or just a Supabase `ai_generations` table.

## Exports
- xLights `.fseq` binary export — defer to v2, but document in 09-exports.md. Some users need it directly.
- MP4 vs WebM: ffmpeg.wasm is ~25MB. Lazy-load only when user picks MP4. Acceptable?
- Hardware export (controller-direct via `.eseq` for Falcon controllers)? Way out of scope.

## Other
- Mobile: editor is desktop-only (timeline DnD requires precision). Block mobile users with a "best on desktop" message? Or render a read-only Preview-only view?
- Sharing: public read-only project view at `/p/[shareToken]`? Common ask, not in v1 spec.
- Collaborative editing: Hard nope for v1.

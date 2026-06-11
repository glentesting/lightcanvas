# LightCanvas Visualizer Mission — Build Brief

The rebuild of the visualizer and the prop/lighting authoring layer on top of it — the part that was bland, inflexible, and didn't function before.

**Before writing anything:** read `PROJECT-STATUS.md`, `CLAUDE.md`, and `docs/CONSTITUTION.md`. Summarize the current visualizer, preview, and house-photo code and reconcile it against this brief. If the repo has moved, the repo wins. Reference images live in `docs/visual-references/` — look at them; matching that bar is the whole point.

---

## What "extraordinary" means (and what failed before)

The previous visualizer treated this as an abstract render — glowing dots on a black canvas. It was trash, and here's why: **the lights were never the point. The house is.** What makes the good tools feel extraordinary is *spatial context* — you're looking at a believable version of your own house, at night, lit up, props sitting where they really go. A black void with floating glow can't deliver that no matter how good the bloom is.

The missing ingredient was never glow. It was the house.

References:
- **Reference 01 (ShowTime composite)** — the target. Lights composited on a real photo: RGB pixels outlining rooflines, windows, door; teal mini-trees; a rainbow mega tree. Photorealistic because it's a real photo.
- **Reference 02 / 03 (xLights 3D house)** — take the *placement-in-context* idea, not the build method.
- **Reference 04 (xLights house-model tutorial)** — exists because that workflow is miserable. This is the friction we're killing. Users never model their house.

---

## Architecture overview

Four decoupled layers:

1. **Capture** — how a photo (later, a video) gets into the project.
2. **Scene** — the photo turned into a navigable backdrop the lights live on.
3. **Authoring** — placing props and light runs on the scene (smart templates).
4. **Playback** — the shared engine that plays a sequence on whatever scene + props exist.

Critical rule: **playback must not care how the scene was made or which props are on it.** That's what lets the photo path ship now and the video/3D path drop in later without a rewrite.

---

## UX & Feel (applies across the whole visualizer)

- **The visualizer is the hero.** Make it big. Minimal toolbar and chrome around it. Controls tuck into contextual panels that appear only when needed — not a CAD cockpit of permanent toolbars crowding the stage.
- **Photo + simple 3D, not cartoon-3D or flat-photo.** The feel is: uploaded house photo -> AI builds simple depth -> props and lights snap onto rooflines, bushes, yard, windows. Real-photo realism with just enough dimensionality to plan against.
- **Placement feels drag-and-drop, not coordinate boxes.** Props get handles, snap zones, soft shadows, distance rings, and smart labels. You drag a prop and it *lands* somewhere believable, not at (x:402, y:118).
- **Dark stage, light chrome.** The preview canvas is dark so lights read; the panels and controls around it stay light. Light mode everywhere except the stage itself, per the Constitution.

---

## MISSION 1A — The Scene (the photo night-stage)  <- run this first

The repo already has house-photo upload (the `lightcanvas-images` bucket) and shows the photo with prop anchor points in the layout editor. The current *preview* still animates lights on an SVG house. **1A replaces that SVG preview with the real photo, lit up like the references.** We reuse the existing upload — we are NOT rebuilding capture this session.

Build:
1. Take the uploaded house photo and generate an **AI depth map** (monocular depth estimation). Propose the approach — client-side model vs. an API call — in the plan step.
2. Render the photo as a subtly pannable **2.5D scene**: use the depth for real parallax when the user pans/tilts (like the iPhone depth effect). Lean-and-slide, not a full orbit — one photo only knows the front of the house. Don't fake more than the data supports.
3. The photo is a **dark night stage.** Composite lights onto it as glowing points with additive blending and a bloom pass so they read like real lights at night — match the references, not flat dots.
4. Drive playback off the existing audio/timeline so lights animate in sync. Reuse existing prop positions/anchor points — don't rebuild the layout system.

**Architecture guardrail:** build the scene behind a common interface (e.g. a `PhotoDepthScene` provider) so a future `SplatScene` can drop in later without a rewrite. Do NOT build splatting. Do NOT build a phone-camera/QR capture flow (later polish). Don't touch the prop/template system, timeline, exports, or AI engine this session.

**Done looks like:** open a project with a house photo -> it's a dimensional, pannable night stage -> a test light or two composite onto it and look like real lights, in context.

---

## Later capture polish (NOT now)

Once the scene works, capture gets nicer: a phone-camera button (shoot or pick), and a desktop **QR handoff** (scan with phone -> shoot -> it lands in the project via Supabase storage + realtime). Same pattern carries video when splatting arrives. Flagged so it's not forgotten — not part of 1A.

---

## Scene — Gaussian splatting (PHASE 2 — design the seam, don't build)

The eventual "walk around my real house" payoff: user films a slow video, software reconstructs a photoreal 3D scene to fly through (splatting = a scene rebuilt from video as millions of soft color blobs instead of modeled geometry). Big, novel build. For now, only ensure the Scene layer has room for a second provider so photo->depth and video->splat both feed the same authoring + playback layers, and the user eventually **picks their style**. Build the seam; not the second half.

---

## MISSION 1B — Authoring layer: Smart Templates (separate session)

The prop and lighting system. Old one was bland and inflexible. Fix = mental-model shift + real adjustability.

**Core idea:** users think "8 arches across the front, 20 stakes down the driveway, a mega tree in the middle" — not "42-pixel Boscoyo Arch v3." Smart Templates let them stay in that language; the system translates underneath. Each template is a real prop with sensible defaults and adjustable knobs.

**Two kinds of props:**
- **Placed props** — drag a template onto the scene, position, tune.
- **Drawn runs** — trace a line on the photo (roofline, eaves, window/door outline) -> a string of pixels at chosen spacing. This is the house outline itself, the single biggest thing that makes the photo light up like the references. Don't skip it.

**Template library:** Mega Tree, Mini Tree, Single/Triple Arch (multi-ring + diffused as variants), Peace Stake / ChromaStake, Snowflake, Star, Spinner, Candy Cane, Wreath, Pixel Matrix, Singing Face, and the Run tool.

**Grouping:** "8 arches across the front" is one action — pick Arch, count 8, evenly laid out — plus **group effects** (a chase that rolls across all 8 like a wave). Count + arrangement + group effects, baked into the template.

**Effect vocabulary per template (the hinge to the AI engine):** each template knows what looks good on it — mega tree does spirals/sweeps/bursts, arch does chases/fills/rainbow, matrix does text/patterns, singing face does lip-sync, runs do chase/fill/twinkle/marquee. Without this the AI can't generate something that respects the prop.

**Under the hood:** the friendly template compiles to real pixels and channels so it exports to FSEQ and runs on a controller. User never sees a channel number. Wiring the friendly layer to the real output is likely a big reason the old version "didn't function."

**Free win:** the depth map means props placed farther back scale down on their own.

**Placement feel:** this is where the drag-and-drop handles, snap zones, shadows, distance rings, and smart labels from the UX section live.

---

## MISSION 1C — AI assistant as diagnostician (not a chat gimmick)

Sharpen the existing AI Layout Assistant + Preflight into a real co-pilot that catches things, in plain English:
- "Your arches overlap."
- "This mega tree blocks the window line."
- "Want me to balance the yard symmetry?"
- "Export is missing Controller 1 mapping."

These are inspectable, suggest-don't-destroy nudges (per the Constitution: AI suggests, explains, validates, fixes — reversibly). Overlaps Preflight's readiness checks — extend those rather than building a parallel surface. Sequenced after 1A/1B since it needs props on a scene to diagnose.

---

## Model usage
- **Build time:** Fable in Claude Code for the hard sessions (1A, 1B). Free through June 22; runs at ~2x usage, so session-only, not your default.
- **Run time:** what model the *app* calls for depth/vision/sequencing is a separate cost decision. Don't conflate them in the code.

## How to run
1. One mission per session — 1A, then 1B, then 1C. Never hand over more than one at once.
2. Each session: read PROJECT-STATUS.md + CLAUDE.md + this brief, show the plan before writing.
3. Update PROJECT-STATUS.md per protocol and commit after each mission.

**Mission 1A prompt:** (paste this — also reproduced in chat for easy copy)

> Read PROJECT-STATUS.md, CLAUDE.md, and docs/CONSTITUTION.md first. Look at the reference images in docs/visual-references/ — that's the visual target. Read the current preview engine, the house-photo upload (lightcanvas-images bucket), and how the layout editor shows the house photo with prop anchor points. Show me your plan before writing any code, and in it tell me how you'll generate the depth map (client-side model vs API).
>
> Build ONE thing: a photo-composite night-stage preview, replacing the current SVG-house preview. (1) Generate an AI depth map from the uploaded house photo. (2) Render the photo as a subtly pannable 2.5D scene using the depth for parallax — lean-and-slide, not a full orbit. (3) Treat the photo as a dark night stage; composite lights as glowing points with additive blending + bloom so they look like real lights at night, matching the references. (4) Drive playback off the existing audio/timeline; reuse existing prop anchor positions.
>
> Composition: the visualizer is the hero — make it big, minimal chrome, controls in contextual panels that appear only when needed. Dark preview stage, light app chrome around it.
>
> Architecture: build the scene behind a common interface (e.g. PhotoDepthScene) so a SplatScene can drop in later. Do NOT build splatting, the QR/camera capture flow, the prop/template system, the timeline, exports, or the AI engine this session. Reuse existing photo upload.
>
> Update PROJECT-STATUS.md per the protocol when done. Don't mark done until npx tsc --noEmit and npx next build pass. Show me the result so I can eyeball the look.

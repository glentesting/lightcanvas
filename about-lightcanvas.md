# About LightCanvas

## What It Is

LightCanvas is a web-based AI-powered holiday light show sequencer. It lets people design, sequence, and preview synchronized light displays — the kind you see in elaborate Christmas, Halloween, and Thanksgiving yard displays — without needing to learn legacy, clunky desktop software.

The name says it exactly: a canvas for light. Visual, creative, modern.

---

## The Problem It Solves

The dominant tools in this space — Light-O-Rama (LOR) and xLights — are powerful but deeply inaccessible. LOR's interface looks like it was built in the early 2000s (because it was). xLights has a brutal learning curve. Neither feels like software people actually want to use in 2026.

The hobbyist light show community is massive, passionate, and underserved by their own tools. They're doing extraordinary creative work with software that makes it harder than it needs to be.

LightCanvas is what this community deserves: the power of LOR in a modern, premium-feeling UI — with AI doing the heavy lifting on sequencing.

---

## Who It's For

**Primary user:** The serious hobbyist. Someone running 2–4 controllers, 16+ channels each, a mix of RGB and traditional lights, 10–15 songs per season. They're already doing light shows — they just hate their tools.

This is Glen. Glen is the customer. Build for Glen first.

**Secondary user:** The ambitious beginner. Someone who wants to do a real display but got intimidated by LOR and xLights and gave up. LightCanvas gives them a real entry point.

**Not for (yet):** Professional installers, commercial operators, anyone needing hardware integration beyond export to xLights/FPP.

---

## What Makes It Different

1. **AI sequencing** — upload a song, AI reads the audio, knows your props, generates a full light sequence mapped to the music. No manual timeline work required to get a starting point.

2. **The house visualizer** — a real-time visual canvas where you see your actual display. Dark night-render style (like LOR's visualizer). Drag-and-drop props onto your house. See what your show looks like before you plug anything in. This is the centerpiece feature — the whole product lives or dies on this.

3. **Modern UI** — not a DOS-era interface. Feels like Canva or Figma, not software from 2003.

---

## Business Model

- **Free tier:** Up to 2 controllers, 3 songs. Enough to try it for real and feel the difference.
- **Premium:** $14.99/month or $129/year. Unlimited controllers, songs, and sequences.

**Upsell strategy:** When a free user hits the limit (tries to add a 3rd controller or 4th song), show a clean, non-annoying upgrade prompt — not a wall, not a guilt trip. Just a clear "here's what you unlock" moment with a single CTA. The product does the selling; the prompt just gets out of the way.

Keep it one paid tier for now. No feature matrix, no confusing plan comparison table. Simple = more conversions. Add tiers later once you know what power users actually want to pay more for.

---

## Tech Stack

- **Frontend:** React + Vite + TypeScript + Tailwind CSS
- **Hosting:** Vercel (lightcanvas.vercel.app, eventually lightcanvas.co)
- **Database/Auth:** Supabase
- **AI:** Claude API (claude-sonnet-4-5) via serverless function at `api/generate-sequence.ts`
- **Local dev:** `localhost:5173` via `npm run dev` | AI Copilot features require `vercel dev`
- **Repo:** GitHub (`glentesting/lightcanvas`), single main branch (master)
- **IDE:** Claude Code (switched from Cursor)

---

## Current State (as of April 2026)

**What's working:**
- Auth (Supabase sign-in/sign-out)
- Display config saves to database (controllers, channels, props persist across sessions)
- Song upload with real waveform display
- AI sequencing — Claude API generates prop-specific sequences (Talking Face → Mouth Sync, Mega Tree → Sweep/Shimmer, etc.)
- House visualizer exists with dark night-render aesthetic, three house styles
- Multi-tab layout: Display Setup, Song Library, Sequencing, Timeline, Export

**What's broken or unfinished:**
- Props not rendering correctly on the canvas
- AppShell double-header bug — a floating LightCanvas bar appears mid-page; root fix requires removing AppShell's own header and consolidating into a single SequencerHeader
- Ranch and Craftsman house styles look too similar (need visual distinction)
- Window glow effects interfering with prop placement
- Persistent blank gap at the top of pages (recurring, needs structural fix not patch)
- Logo not yet in the app — header uses text-based wordmark as placeholder

---

## Firm Decisions (Do Not Revisit)

- **Visualizer aesthetic:** Dark night-render style. NOT cartoon SVG. NOT real photo. NOT schematic/zone diagram. Think LOR screenshots — dark stage, house silhouette, glowing props.
- **Props are drag-and-drop:** Free placement anywhere on the canvas. No auto-placement zones, no labeled boxes.
- **Prop shapes:** Mega tree = large triangle | Mini tree = smaller triangle | Stakes = thin vertical lines | Talking face = circle with eyes/mouth
- **Each prop stores its own color** with a color picker (presets + hue slider)
- **Each house style stores independent prop sets** — changing house styles doesn't wipe your props
- **Layout:** Full-width visualizer on top. Controls row below. No side inspector during visualizer view.
- **Multi-holiday platform:** Christmas, Halloween, Thanksgiving, and beyond. Not Christmas-only. Branding should reflect this.
- **No tagline needed.** "LightCanvas" is self-explanatory.

---

## Brand

- **Primary colors:**
  - Green `#70AD47` — "Light" (primary brand color, CTAs, active states)
  - Red `#C00000` — "Canvas" (accent, highlights, logo)
- **Supporting palette:**
  - White `#FFFFFF` — primary UI background, text on dark surfaces
  - Near-black `#0a0e1a` — visualizer background, waveform, timeline (dark surfaces only)
  - Dark slate `#1a2035` — house silhouette walls
  - Light gray `#F5F5F5` or similar — secondary backgrounds, cards
  - Use color purposefully. Green and red are restrained — not slathered everywhere, not Christmas-card loud.

- **Feel:** This needs to be said clearly and repeated often — **LightCanvas must feel premium.** Not toyish. Not like a hobbyist side project. Not like an app template with holiday colors slapped on it. The UI should feel like something people are proud to use and show other people. Think Canva, Figma, Linear — clean, confident, intentional. Every margin, every button, every interaction should feel like someone gave a damn.

  If something looks cheap, fix it. If it looks like a WordPress plugin from 2015, fix it. The software this community has been stuck with for 20 years looks like garbage — that's the entire opportunity here. Don't give them a shinier version of garbage.
- **Logo direction (not yet implemented):** "Light" in green serif with a glowing bulb between the L and "ight." "Canvas" in white italic script over a paint splash. Combine the brush stroke detail from one Gemini variation with the glowing bulb treatment from another.
- **UI approach:** Light UI overall. Selective dark surfaces for the visualizer, waveform, and timeline.

---

## What to Build Next (Priority Order)

1. Fix AppShell double-header — structural fix, not a patch
2. Fix props rendering on the canvas
3. Visually distinguish Ranch vs Craftsman house styles
4. Fix blank gap at top of pages (root cause, not workaround)
5. Implement the logo in the header

Do not work on export, AI improvements, or new features until the visualizer is working correctly. The visualizer is the product.

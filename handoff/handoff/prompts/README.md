# Ready-to-paste Claude Code prompts

Each prompt is a self-contained instruction for one slice. Paste into Claude Code one at a time, in order. Wait for it to finish + verify locally before moving to the next.

Each one assumes the existing scaffold (Next.js 14 App Router, TypeScript, Tailwind, shadcn, Clerk, Supabase) is already running.

---

## Prompt 0 — Read the plan

```
Read the entire `handoff/` folder in this repo, starting with CLAUDE.md, then 00 through 10 in order. After reading, summarize the architecture in 5 bullets and tell me which slice you'd start with. Don't write any code yet.
```

## Prompt 1 — Supabase schema

```
Implement handoff/01-supabase.md. Create the migration files under supabase/migrations/, run them locally against the dev project, and regenerate lib/supabase/types.ts. Verify RLS by running the manual checks listed in the Acceptance section. Show me the migration SQL before applying.
```

## Prompt 2 — Domain types & folder skeleton

```
Implement handoff/00-architecture.md. Create the empty folders + the canonical TypeScript domain types from that file (lib/timeline/types.ts, lib/fixtures/types.ts, lib/audio/types.ts, types/domain.ts). Don't implement any logic yet — just the types and folder structure with index.ts re-exports.
```

## Prompt 3 — Dashboard + project CRUD

```
Implement handoff/02-projects-and-dashboard.md. Build the dashboard page, project card, new-project dialog, and the four server actions (create/delete/rename/duplicate). Match the prototype's visual style — see Lumen Prototype.html in this repo for reference. Hit every Acceptance bullet before stopping.
```

## Prompt 4 — Editor shell, store, autosave

```
Implement handoff/03-editor-shell.md. Set up the Zustand store with zundo for undo/redo, the transport store, autosave to /api/projects/[id]/autosave, and the EditorShell + TopBar + Sidebar components. Don't implement timeline interactions yet — just the shell and a placeholder timeline area. URL-driven tabs.
```

## Prompt 5 — Audio engine

```
Implement handoff/04-audio-engine.md. Wire up the upload flow (signed URLs to lumen-audio bucket), the WaveSurfer instance inside the editor, and the Meyda-based beat detection in a Web Worker. After analysis, persist `audio` to the project and render beat markers + numbered downbeats as an SVG overlay above the waveform. Press space toggles play.
```

## Prompt 6 — Timeline interactions

```
Implement handoff/05-timeline.md. This is the biggest slice — go in this order: render existing blocks → drag from palette → drag existing blocks → resize → multi-select → context menu → keyboard shortcuts → parameter panel. Cmd+Z must work end-to-end. Stop and confirm with me after drag-from-palette is working.
```

## Prompt 7 — Fixtures + Layout view

```
Implement handoff/06-fixtures-and-layout.md. Build the Layout tab: fixture list, house SVG with anchor regions, drag-to-place flow for both strand and point fixtures. Add the "+ Add fixture" dialog. Persist `layout.points` and verify they survive a refresh.
```

## Prompt 8 — Preview engine

```
Implement handoff/07-preview-engine.md. Build the pure render engine in lib/render/, all 10 effect functions, and both renderers (SVG default + canvas fancy). Wire the Preview tab to read transport.currentTime and re-render. Test with the demo "Wizards in Winter" project (seed it from the prototype's editor-data.jsx).
```

## Prompt 9 — AI panel (mock)

```
Implement handoff/08-ai-panel.md. Build the panel UI matching the prototype, the AIProvider interface, the MockAIProvider, and the SSE-streaming /api/ai/* routes. The mock should produce plausible output by composing effects against the song's beats. Wrap each AI run in a single undo entry.
```

## Prompt 10 — Exports

```
Implement handoff/09-exports.md. Build all three exporters. For xLights, target the 2024 .xsq XML format. Create a fixture model + 30 seconds of effects, export, open the .xsq in xLights locally, and verify it loads with effects on the right models at the right times. Iterate the settings strings until it works.
```

## Prompt 11 — Design polish pass

```
Implement handoff/10-design-system.md. Translate the prototype's styles.css into Tailwind config + globals.css + shadcn theme overrides. Walk every screen and confirm it matches the prototype: dashboard, editor, AI panel, export dialog, onboarding. Light mode only — no dark dropdowns or modal overlays.
```

## Prompt 12 — Smoke test

```
Run a full end-to-end manual test:
1. Sign up with a new test account
2. Complete onboarding
3. Create a project from the demo starter
4. Upload an MP3
5. Wait for analysis
6. Drag two effects on, multi-select them, resize, undo
7. Run AI Generate
8. Switch to Layout, place fixtures
9. Switch to Preview, hit play
10. Export Lumen JSON, xLights, and video
Report any breakages with reproduction steps.
```

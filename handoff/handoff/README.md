# Lumen Handoff Package

This folder is the spec + build plan for **Lumen** — an AI-assisted Christmas-light show designer that competes with xLights on UX. It's intended to be pasted into Claude Code (or used as documentation) to build the real product on top of an existing Next.js + Clerk + Supabase scaffold.

## What's in here

- **CLAUDE.md** — Start here. Project overview, working agreement, definition of done.
- **00-architecture.md** — Folder structure, domain types, state boundaries, routing map.
- **01-supabase.md** — SQL migrations, RLS policies, Storage buckets.
- **02-projects-and-dashboard.md** — `/dashboard` and project CRUD.
- **03-editor-shell.md** — Editor route, Zustand store, undo/redo, autosave.
- **04-audio-engine.md** — WaveSurfer + Meyda beat detection.
- **05-timeline.md** — Drag, resize, snap, multi-select, undo, shortcuts. The big one.
- **06-fixtures-and-layout.md** — Pixel-accurate fixture model + Layout view.
- **07-preview-engine.md** — Real-time renderer, all 10 effects.
- **08-ai-panel.md** — AI Actions panel + mock provider (real provider stubbed for swap-in).
- **09-exports.md** — Lumen JSON, xLights `.xsq`, MP4/WebM preview.
- **10-design-system.md** — Tailwind tokens + shadcn theme to match the prototype.
- **OPEN-QUESTIONS.md** — Things the spec doesn't pin down; flag during implementation.
- **prompts/README.md** — Ready-to-paste Claude Code prompts, one per slice.

## How to use

1. Drop this folder into your repo at `docs/lumen-buildplan/` (or wherever).
2. Open Claude Code, point it at the repo, and paste **prompts/README.md**'s Prompt 0.
3. Then paste prompts 1–12 in order. Wait for each to finish and verify locally before moving on.
4. The visual prototype (`Lumen Prototype.html` in the project root) is the visual source of truth — copy it forward.

## Stack reminder

- Existing: Next.js 14 App Router · TypeScript · Tailwind · shadcn/ui · Clerk · Supabase
- Adding: Zustand · WaveSurfer.js v7 · Meyda · dnd-kit · zundo · zod · React Query

## What's intentionally NOT here

- A full xLights `.fseq` binary writer (deferred to v2)
- Real Anthropic AI integration (interface is set up; impl deferred)
- Multi-user collaboration
- Mobile editing
- Sharing / public links

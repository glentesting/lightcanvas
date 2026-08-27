# Cleanup — Status

**Date:** 2026-08-27
**Spec:** the kill list in AUDIT-2026-08.md. This is a personal tool for one
user; everything that served other users, and every page that faked
functionality, is gone. Net: **6,655 lines deleted, 281 added.**

## Deleted — out of scope (audit Tier 1)

| What | Lines |
|---|---|
| `src/app/(marketing)/` (landing, pricing, hero, css, layout) | 1,599 |
| `src/app/(app)/dashboard/page.tsx` (hardcoded 87 score, fake suggestions) | 456 |
| `src/app/onboarding/` + `src/app/api/onboarding/` | 307 |
| `src/app/legal/` (5 placeholder pages) | 256 |
| `src/app/api/shows/` (2 routes) | 230 |
| `src/app/p/[token]/` ("share link" that was really a public UUID select) | 149 |
| `src/components/CookieBanner.tsx` | 154 |
| `src/components/MobileGate.tsx` | 91 |
| `src/app/sign-in/`, `src/app/sign-up/` | 24 |
| `src/middleware.ts` (Clerk) | 20 |
| `src/lib/analytics.ts` (console.log stub) | 15 |

## Deleted — fake pages that lied about working

| What | Lines | Why |
|---|---|---|
| `src/app/(app)/ai-studio/page.tsx` | 344 | hardcoded MOCK_VARIANTS, dead Generate button. Real AI = AIPanel in the editor |
| `src/app/(app)/exports/page.tsx` | 394 | dead Download button, fake progress bar. Real export = ExportDialog in the editor |
| `src/app/(app)/preflight/page.tsx` | 361 | 3/6 checks hardcoded, fictional "LightCanvas Controller LC-1" |
| `src/app/(app)/audio/page.tsx` | 419 | hardcoded key/tempo/LUFS, every button dead |

## Replaced

- **`projects/page.tsx`: 1,033 → ~200 lines.** Name, audio file, updated date,
  Open, Delete (with confirm + storage cleanup), New. Nothing fake.
- **`settings/page.tsx`: deleted (359 lines), not replaced.** Its hardware
  prefs fed ExportDialog through Clerk metadata; the rebuilt ExportDialog
  doesn't read them (export target is fixed: LOR `.loredit`). The owner's
  controller profile is now a constant: ExportDialog validates against
  `"lor-pixie16"` (100 px/port, from the hardware reference).

## Clerk removed entirely

`<ClerkProvider>` out of the root layout, `auth()` stripped from all 9
remaining API routes, sidebar profile chip gone, `@clerk/nextjs` uninstalled,
Clerk vars dropped from `.env.local.example`. Single-user consequences:

- API routes no longer filter by `owner_id` — the GET returns all projects,
  so **rows created under the old Clerk user id remain visible**. New rows
  get `owner_id: "local"`.
- New storage uploads use a `local/{projectId}/` prefix. The depth-map route
  derives its upload path from the stored photo URL, so photos uploaded under
  the old Clerk prefix keep their depth-map caching working.

## Dead chrome removed

- Layout page: "AI Layout Assistant" button + its popover of 8 handler-less
  suggestion buttons, the handler-less "Validate Layout" button (the live
  validation strip below it stays — it's real), and the dead
  "Auto-fix mapping"/"Review manually" strip buttons.
- LayoutEditor: the entire floating canvas toolbar
  (Select/Draw/Move/Resize/Snap/Fit/Zoom/Fullscreen — none had handlers).
- Surviving buttons all work: Photo/Night toggle, Upload Photo, Add Prop
  (3-step modal), props/layers tabs, visibility toggles, inspector.

## Bug fixed

`src/lib/exports/validation.ts`: controller port-limit keys were snake_case
(`falcon_f16v3`) while callers passed kebab-case, so the check could never
fire. Keys fixed, and a `lor-pixie16` profile added (100 pixels/port — the
owner's actual hardware). Verified live: the Export dialog now surfaces real
port-limit warnings on oversized props (it showed 8 genuine warnings on a
test project with a 400-pixel mega tree).

## Routes that remain — and what they do

Verified by running the dev server and rendering every route in a browser
(all render, zero console errors from app code, all API calls 200):

| Route | Status |
|---|---|
| `/` | redirects to `/projects` — functional |
| `/projects` | real project list from the DB (listed the owner's existing projects) — fully functional |
| `/project/[id]` | the editor: photo night-stage preview, props tree, AI panel, **Export** → `.loredit` — fully functional |
| `/project/[id]/layout` | layout editor: photo upload, night preview, add/place/delete props, inspector — functional (prop shapes are still single-anchor; roofline tracing UI remains the known gap, see AUDIT §Visualizer) |
| `/timeline` (`?project=`) | full timeline editor: drag/drop blocks, beat snap, undo/redo — fully functional |
| `/designer` | no-project empty state that redirects into `/project/[id]` when one is loaded — functional |
| `/dev/stage`, `/dev/visualizer-v2` | dev harnesses (404 in prod builds via /dev gating) — functional, intentionally kept |
| 9 API routes (`projects` ×3, `autosave`, `audio`, `import`, `upload-audio`, `upload-house-photo`, `upload-depth-map`, `ai/generate`) | all real, all Clerk-free, verified 200 in the live session |

Every screen that exists now does something real. Nothing renders hardcoded
scores, fictional controllers, or dead primary buttons.

## Left alone (per instructions)

Timeline editor, render engine, beat detection, preview surfaces, `.loredit`
exporter, AI sequencer, visualizer-v2 prototype.

## Notes

- Build passes, `tsc` clean, lint at baseline (3 pre-existing warnings in the
  spike scripts).
- PROJECT-STATUS.md is deleted; CLAUDE.md (rewritten) + the four status docs
  (AUDIT, LOREDIT-EXPORT, AI-PIPELINE, this file) are the documentation now.
- `.claude/launch.json` added so `preview_start`/IDE tooling can boot the dev
  server by name.

# Gap Analysis — What's Between This App and a Real Show

**Date:** 2026-08-29
**Why this exists:** the owner used the app and found it is a viewer, not an
editor. He's right. This document compares what the app does today against
what a person actually needs to design, edit, preview, and verify a light
show — and ranks every gap by one question: **does it block a working show
this season?**

The evidence for "what real sequencing requires" is the purchased
Light-O-Rama sequence sitting in the test folder: 265 props, **50,695
individual effects**, a dozen motion-effect types (color washes, curtains,
ripples, bars, spirals, spinners...), per-strand sub-rows on the trees,
prop groups for one-gesture control of whole sets, and 1,478 hand-placed
timing marks. That is the bar a "finished show" sits at.

---

## Part 1 — His findings, traced to root causes

| What he saw | The actual cause |
|---|---|
| Long ugly prop names ("RGB Mini Tree Base 01") | Import kept the template's internal names as display names. Only the roof strings got friendly names. Naming policy problem, one-time data fix + importer change. |
| Everything grey and indistinguishable | The layout editor paints every idle prop the same grey-blue. There is no concept of an "identity color" per prop type anywhere in the app — three separate hardcoded color tables exist and none of them is what he asked for. |
| Arch has a shadow | The arch outline is an open curve that is being color-filled anyway — the fill paints the half-moon under the arc. One-line drawing bug. |
| Star floats as a separate blob | The tree and its star imported as two independent props (they ARE two circuits on the wire — that part is correct) but nothing links them visually, so the star sits wherever the template put it while the tree gets dragged away. They need to be one thing on screen and two things on the wire. |
| Can't select several props / delete them | The layout editor has single-click select only. No marquee, no multi-select, no bulk delete. Missing feature, not a bug. |
| Timeline has no show preview | True — the timeline page is a block grid with an audio waveform. No picture of the house exists on it at all. |
| Timeline doesn't scroll or follow playback | **The audio player and the timeline don't talk to each other.** The waveform plays audio and keeps the time to itself; the grid below has no playhead, no auto-scroll, no click-to-seek. All the pieces exist; none are wired together. |
| Preview and layout editor draw props differently | **The deepest problem: the app has FOUR renderers.** (1) The layout editor hand-draws its own shapes. (2) The photo night-stage draws real per-pixel lights from the shared geometry. (3) With no photo, the designer falls back to a cartoon house that squeezes all 84 props into 6 light slots. (4) The timeline draws nothing. Only #2 tells the truth. Bonus: the layout editor's "Night Preview" shows fixed pretend colors, not the actual show — quiet fake data that survived earlier purges. |

## Part 2 — The full gap list, ranked

### BLOCKS A WORKING SHOW (must fix)

1. **One renderer everywhere.** Same shapes, same pixel positions, same
   colors in the layout editor, the designer preview, and the timeline.
   Until this is true he cannot trust anything he sees, and every visual
   fix has to be made three times. *Hard-ish (a day), and it makes items
   2–8 cheap.* → **This session, first.**

2. **Timeline playback: playhead, follow-scroll, click-to-seek.** You
   cannot edit a music-synced show without seeing where in the music you
   are. The wiring is small once the audio player publishes its time to
   the shared clock. *Easy once diagnosed.* → **This session.**

3. **Timeline show preview.** Editing blocks blind, then walking to another
   page to see the result, is not editing. A live house strip above the
   timeline, driven by the one renderer. *Easy after item 1.* → **This
   session.**

4. **Identity colors + real show colors.** Idle props must be tellable at a
   glance (his spec: arches dark, faces Christmas green, mini trees lighter
   green, stakes dark grey, roof strings mustard); during playback they
   must show the actual sequence. *Easy after item 1.* → **This session.**

5. **Tree + star merged visually, separate electrically.** *Moderate.* →
   **This session.**

6. **Short names** (Tree 01, Star 01, Arch 01, Stake 12, Elden/Felix/
   Ralphie/Zuzu) — importer + one-time fix of his live project. Export
   mapping is keyed on hidden template names and must not move. *Easy.* →
   **This session.**

7. **Marquee select + bulk delete in layout.** Re-placing a yard means
   grabbing groups, not clicking 40 stakes. *Moderate.* → **This session.**

8. **Arch shadow artifact.** *Trivial.* → **This session.**

### NEEDED SOON (should fix, doesn't block a first show)

9. **Scrub/seek in the designer preview** — the main screen can play/pause
   but not jump around the song.
10. **What-you-see-is-what-exports honesty.** The preview renders 10
    LightCanvas effects; export flattens pixel props to color washes and AC
    props to brightness ramps. He will see a chase in the app and get a
    wash in LOR. Either grow the export grammar (curtain/bars — needs S6
    verification) or show an "as exported" preview mode. Right now this is
    the biggest honesty gap left.
11. **Undo visible in the layout editor.** Undo exists in the data layer;
    the layout page gives no button/shortcut hint, so a bad bulk placement
    feels destructive.
12. **Group tracks in the timeline** — the purchased show leans on prop
    groups ("all arches") heavily; the app has groups in the data model but
    no UI to make/use them.
13. **Copy/paste and repeat for blocks** — 50,695 effects in the reference
    are built from repetition; the timeline has duplicate but no paste-at-
    beat or repeat-every-bar.
14. **The manual S6 acceptance test** — three exported files still have
    never been opened in the real Light-O-Rama program. Everything else can
    be perfect and the season still fails if this fails. Not code; someone
    must double-click S6.

### NICE TO HAVE (genuinely optional this season)

15. Scale/rotate props on the photo (drag-placement works today).
16. Per-strand motion rows like LOR's "Strand 1..16" sub-rows.
17. Richer effect vocabulary in the app (spirals, spinners, pictures...).
18. Lip-sync for the singing faces (explicitly parked).
19. Waveform zoom-sync with the timeline grid (overview vs zoomed view).
20. Prettier tree silhouette matched to the coro cutout photo.

---

## Part 3 — Why "many small patches" still didn't add up

Each earlier session fixed what it was pointed at — export, AI density,
import, geometry — and each fix was real. But the app's *surfaces* were
never joined: the clock, the picture, and the editing grid live on three
pages that don't share state. LOR feels like one program because its
preview, timeline, and layout are three views of one model. This app has
the one model (the store) — the views just never got wired to it evenly.
That is exactly what the must-fix list above does, in order.

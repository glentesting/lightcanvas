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

### NEEDED SOON — items 9–13 DONE 2026-08-30 (SEQUENCING-UPGRADE-STATUS.md)

9. ~~**Scrub/seek in the designer preview**~~ — **DONE.** The song bar is
   click/drag scrubbable, with a playhead, hover time readout, and
   space/arrow/Home keys. It seeks the real audio through the shared
   transport, so the house preview follows even while paused.
10. ~~**What-you-see-is-what-exports honesty**~~ — **DONE, both halves.**
    The export grammar grew: pixel props now use **colorwash + curtain +
    bars** (94% of the reference's motion effects), so chase/wave/meteor
    actually move and fireworks burst. And what still cannot survive is
    stated in plain English *before* export — a "What will actually reach
    your lights" panel in the Export dialog plus a line in the timeline's
    parameter panel, both reading one table (`fidelity.ts`).
    Still S6-unverified (item 14 covers that). Twinkle/sparkle genuinely
    have no LOR pixel equivalent and are disclosed, not hidden.
11. ~~**Undo visible in the layout editor**~~ — **DONE**, and undo was
    quietly broken: autosave status flips were being recorded as undo steps,
    and bulk actions made one step per prop. Both fixed; there are now
    Undo/Redo buttons, shortcuts, and an "Undo that" toast after bulk edits.
12. ~~**Group tracks in the timeline**~~ — **DONE.** A "Sets of lights" bar
    with one-click presets built from the real display (All Arches, All Mini
    Trees, All Yard Stakes, All Roof Lights, All Singing Faces, All Tree
    Stars = all 83 pieces) plus a custom picker. Set rows accept dropped
    effects and fan out to every member.
13. ~~**Copy/paste and repeat for blocks**~~ — **DONE.** Copy (Ctrl+C),
    Paste at playhead (Ctrl+V) with every block landing on a beat, and
    Repeat-every-N-bars with a live count. Bar length comes from the
    detected downbeats; each repeat is measured from the original anchor and
    re-snapped, so it cannot drift.
14. ~~**The manual S6 acceptance test**~~ — **DONE 2026-08-31.** The owner
    exported his real show and opened it in S6 v6.6.12: clean open, 4,385
    effects on all 83 props, 1,246 of the new `bars` effects rendering as a
    staggered arch chase, AC intensity pulses, the beat grid present, his
    song's filename carried through. **One caveat: the `curtain` grammar was
    not exercised** — his show contains zero curtains (center-out chases and
    fireworks only). Close that by adding a Fireworks effect, re-exporting,
    and opening in S6. The manual torch now passes to the hardware bench
    test (`BENCH-TEST-CHECKLIST.md`).

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

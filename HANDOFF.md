# LightCanvas — Conversation Handoff

**Date:** August 31, 2026
**Purpose:** Everything a new chat needs that isn't already in the repo docs.

---

## Who I am and how we work

I'm Glen. LightCanvas is mine — I'm the only user, I run every prompt, and
this is my house we're building a light show for. Don't refer to me as "the
owner" or in the third person. Just "you" and "your house."

**I am completely non-technical.** Never ask me to check a file, run a
command, verify config, or figure something out. If it's technical, you solve
it or you write it into a prompt I can paste. My jobs are: making decisions,
looking at the app and saying what's wrong, and physical checks on my hardware.

Twice early on you handed me homework instead of handling it. Don't.

**Tone:** direct, no corporate voice, no hedging. Take a stance. Southern
phrasing is fine. If something's going badly, say so plainly — I've asked for
bluntness and I mean it.

---

## The working pattern that works

1. I describe a problem or you spot a gap.
2. You write a **complete, self-contained prompt** for Claude Code — including
   file paths, context, constraints, and verification steps. Nothing left for
   me to fill in.
3. I paste it into Claude Code (Fable 5, pointed at
   `C:\dev\lightcanvas\AppRepo`).
4. It works, writes a status doc, commits.
5. I paste the result back here, usually with screenshots. You translate what
   happened and tell me what to look at next.

**My eyes stay in the loop.** Claude Code can run the app but has had trouble
reliably *seeing* rendered pixels. Every visual problem so far — grey props,
the arch shadow, the floating star, the roofline scribbles, props that didn't
look like my real props — I found by looking. Keep asking me to look.

**Watch the session size.** Claude Code sessions hit their context ceiling
after a few hours. When that happens, tell me to commit, close it, and start
fresh — the repo docs carry everything forward.

---

## THE BIG ONE: the acceptance test PASSED (Aug 31, 2026)

For weeks the open question was whether Light-O-Rama would accept a file
LightCanvas wrote. **It does.**

I exported my real show from the app and opened it in LOR S6 v6.6.12:

- Opened clean, no errors. Total time 3:39.84, matching my song.
- **4,385 effects across all 83 of my props**, including **1,246 `bars`
  motion effects** — the brand-new grammar added Aug 30.
- The arches show a proper staggered chase traveling 01 → 08.
- AC channels show real intensity pulses on my roof strings.
- 473 "LightCanvas Beats" timing marks alongside the template's 1,478.
- `musicFilename` correctly carries my song, not the template's.

**The export path is proven.** That was the largest technical risk in the
project and it is now closed.

**Still untested in S6:** the `curtain` grammar. My show happens to contain
zero curtains — they only appear on center-out chases and fireworks. Dropping
a Fireworks effect somewhere and re-exporting would close that last gap.

---

## Where things stand

**Software:** working end to end. Import my display from a purchased
`.loredit`, load a song, AI generates a musically-planned show, preview it on
a photo of my house, edit it on a timeline with sets/copy/paste/repeat, export
a `.loredit` that LOR opens. Four honest screens, no fake pages — a cleanup
deleted ~7,400 lines of startup-era scaffolding.

**Hardware: this display already ran a full season and it worked.** Same
controllers, same props, same wiring, same Director — somebody else set it up
and ran it, and I'm learning to run it myself. That's the honest framing.
**The gear is proven; what's new is me.** Don't let anyone write these docs
as though this is a pile of untested equipment, because it isn't.

Everything is identified and documented in
`LIGHTCANVAS-HARDWARE-REFERENCE.md`. Both Pixie16 unit IDs were already set
correctly (`09` and `30`). **I ran the bench test myself on September 12,
2026 — my first time — and both boxes passed** — they answered the software with the right numbers, both
power halves work, and pixels lit in the colour asked for. It also settled
why the face numbering skipped `31`/`33`/`35`/`37`: each face spans two
ports. Everything read off the boards is in §3 of that doc; the PC-side
procedure that worked, including the driver step Windows doesn't do for you,
is §11.

**What's actually still open.** The big one is my software, not the gear:
**no LightCanvas-made sequence has ever played on this hardware.** Bought
sequences ran on it all last season; a file my app made has opened in S6 but
has never been on the SD card and out to the props. That's the real unknown.

Smaller and honestly labelled: **Box 3**, the AC controller, is a box *I*
haven't powered up — it looks hardwired into conduit, and its ID has never
been read back by anyone (the AC lights ran last season, so `01` is a
reasonable bet, but nobody has actually looked). The **ELOR** setting is
genuinely untested by anyone. The **Director and FM transmitter** ran the
show last season, so they're not suspect — I just haven't driven them yet.

**Deadline:** the show has to run this season. A September 3rd honesty
checkpoint was set for whether this path was working. It is.

**Fallback:** I own 8 professionally-sequenced songs that run on my exact
hardware. Worst case I run those. I still need to buy the MP3s for them — LOR
sells sequences without music. Separate errand, low priority.

---

## Read these in the repo (all current, all truthful)

- `CLAUDE.md` — the full technical briefing. Start here.
- `LIGHTCANVAS-HARDWARE-REFERENCE.md` — my physical show: controllers, unit
  IDs, port-to-prop map, `.loredit` format, file locations, bench-test steps.
- `AUDIT-2026-08.md` — the honest audit that reset the project's direction.
- `GAP-ANALYSIS.md` — ranked gaps vs. real sequencing needs.
- `LOREDIT-EXPORT-STATUS.md`, `AI-PIPELINE-STATUS.md`,
  `LAYOUT-IMPORT-STATUS.md`, `LAYOUT-GEOMETRY-STATUS.md`,
  `EDITOR-UPGRADE-STATUS.md`, `SEQUENCING-UPGRADE-STATUS.md`,
  `CLEANUP-STATUS.md` — session by session.
- `WALKTHROUGH.md` — my plain-English guide. Keep it truthful.

---

## Things learned the hard way

- **The old reference doc targeted the wrong LOR format.** `.lms` (S4) is
  useless to me. `.loredit` (S6) is the only target. That doc sat in
  `docs/` long after I thought it was gone; it was moved to
  `docs/_archive/` on 22 September 2026.
- **Template-fill beats synthesis.** Don't generate a layout from scratch —
  fill an existing `.loredit` that already carries my preview.
- **My props are flat coro cutouts**, not generic shapes. Mini trees are
  tiered silhouettes with pixels in horizontal rows. Getting this wrong made
  chases travel the wrong direction.
- **Narrow patches don't add up.** A run of tightly-scoped prompts each
  succeeded and the app still wasn't usable, because nobody asked the bigger
  question. When something feels structurally off, do a gap analysis first —
  that's how the four-renderer split was finally found.
- **Don't claim visual success you can't see.** If the browser tooling can't
  render, say so and mark it unverified.
- **My API key had invisible characters** when pasted from a web page, and got
  briefly pasted into a git-tracked file. Watch for both.
- **Never invent LOR parameter values.** Every settings string must be a
  verbatim-observed form from the purchased sequences with only colors
  substituted. `verify-effect-grammar.mts` enforces this and has caught three
  real defects.

---

## The move (Sept 10, 2026)

Everything came out of OneDrive. The app is now at `C:\dev\lightcanvas\AppRepo`
and my Light-O-Rama folder is at `C:\dev\light-o-rama`. Nothing was lost —
the repo matched GitHub exactly, `.env.local` survived, all five songs
survived, all 8 purchased sequences survived, and all nine verification suites
pass from the new location. Start LightCanvas.bat was pointing at the old
folder; it's fixed and tested.

**Done since:** LOR S6 has been repointed at the new folder (confirmed
Sept 12), and my show's MP3 is now sitting in `C:\dev\light-o-rama\Audio`
so S6 can actually play it.

## The night the project wouldn't open (Sept 13, 2026)

My project sat on "Loading project..." and never finished. Cause: in the
Sept 12 session Claude ran a production build while my dev server was
running, and the two fight over the same folder. My dev server never
recovered and spent two days reloading the project over and over behind the
spinner. **Nothing touched my show** — the data was checked before and after
and it is all there. (I said at the time the database hadn't been written to
since Sept 1 — not quite right: the row's own timestamp is
2026-09-13T02:29:52Z. The point still stands, my show data is intact.)

Fixed properly: builds now go to their own folder so this cannot happen
again, and a load that does not finish now shows a real error with a Try
again button instead of spinning forever. The layout editor had no error
handling at all before this; now all three editor pages share one loader.

If the app ever hangs like that again: close the black window, start
LightCanvas again from the Desktop icon. That is the whole fix.

## Open items, roughly in priority order

1. **Box 3, the AC controller.** The last box I have not powered up myself. The
   guided walkthrough in the app now ends on this — open "Test your light
   boxes" on the Projects page and it takes you to it, with my September
   answers still saved. It does not ask me to power Box 3 on. It asks two
   look-only questions: how is it actually fed (plug hidden somewhere, or
   straight into conduit?), and which breaker kills it. If it is hardwired,
   an electrician fits a cord and plug before anything else happens.
   Nothing needs connecting to its AC outputs just to read its ID. If it
   comes back as anything other than `01`, change the controller, not the
   sequences. Worth remembering: the AC lights worked last season, so this is
   about reading a number nobody wrote down, not about a box that might be
   broken.
2. **Decide the ELOR network setting.** "Use Enhanced LOR" was switched on
   in the Control Panel. It didn't matter at the bench, but it matters when
   the house is wired — a controller that doesn't support it just goes
   quiet, which looks exactly like dead hardware.
3. **Close the curtain-grammar gap** — add a Fireworks effect, re-export,
   open in S6.
4. Buy the 8 MP3s for the purchased sequences (fallback show).
5. **Get a LightCanvas show onto the SD card and run it on the house.** This
   is the one that actually matters — it's never been done with a file my
   app made. The Director and FM transmitter did this all last season, so
   the workflow works; it's my sequence that's unproven on the wire.
6. Lip-sync for the four singing faces — deliberately parked, the most
   impressive thing left undone.
7. Nice-to-haves: scale/rotate props, per-strand rows, richer effect
   vocabulary, waveform zoom-sync.

**Not urgent:** proving which dongle drives which prop. They're labelled
with white bands, so it's quicker to confirm in the yard on deployment day
than by hauling props out of storage.

**Known limits, all disclosed inside the app before export:** twinkle and
sparkle flatten to a color wash on pixel props (LOR has no equivalent); a
chase on a roof string previews per-bulb but exports as one dimmer; meteor
loses its tail; fireworks lose random burst points. Beat analysis freezes the
page for a minute or two after uploading a song.

# LightCanvas Cleanup Package

The goal: one canonical doc system, everything stale out of sight (archived, not deleted), and the new visualizer direction written down where Claude Code can see it. This is split by *who can touch what*, because that matters.

---

## 1. The canonical doc system (what's what)

Five roles. You already have most of these — this just names them.

| Role | The doc | Lives in |
|------|---------|----------|
| **The brain** (live state) | `PROJECT-STATUS.md` | repo root |
| **The briefing** (how to work) | `CLAUDE.md` | repo root |
| **The law** (durable principles) | `CONSTITUTION.md` ← new | repo `docs/` |
| **The plan** (what + when) | `LightCanvas Roadmap v3.xlsx` | parent folder / project |
| **The references** (facts: formats, protocols) | `docs/` reference library | repo `docs/` |
| **Active orders** (current build) | mission briefs (e.g. the Visualizer Mission) | repo `docs/` |

Everything else is either a duplicate, a superseded draft, or a one-time note that's already been applied. It gets archived.

---

## 2. Three places, three owners

- **The repo** — Claude Code's territory. Bounded prompt below.
- **Your Claude project knowledge** — *your* territory. Claude Code can't reach it. Checklist below.
- **Your uploads to chat** — transient. Ignore. They don't persist anywhere that matters.

The mess you're feeling is mostly in the project knowledge, not the repo. That's the manual list in section 4.

---

## 3. Repo cleanup — paste this into Claude Code

> Read `PROJECT-STATUS.md` and `CLAUDE.md` fully before doing anything. This is a documentation + cleanup pass. **Do not change application code except the one model-string edit in step 4. Do not delete any file — archive by moving. Show me your plan before executing, and commit doc changes following the update protocol at the top of CLAUDE.md.**
>
> 1. **Create `docs/_archive/`** if it doesn't exist.
>
> 2. **Reconcile CLAUDE.md against PROJECT-STATUS.md.** The "Known Issues" list in CLAUDE.md is stale. Specifically: issue #3 (auto-sequence / analyze-audio stubs) — those were deleted in Track A per the PROJECT-STATUS update log, so remove that issue. Issue #4 (model string) — see step 4. Sync the rest of CLAUDE.md's issue list to match PROJECT-STATUS §1 "What's still open." Don't annotate — edit to the truth.
>
> 3. **Add `docs/CONSTITUTION.md`** (I'm providing the file). Then add one line near the top of PROJECT-STATUS.md and CLAUDE.md pointing to it as the durable operating law.
>
> 4. **Update the Anthropic model string** in `src/lib/ai/anthropic-provider.ts` (line ~141) from `claude-sonnet-4-5-20250514` to `claude-sonnet-4-6`. This is the only code change in this pass. Leave the mock-fallback logic alone.
>
> 5. **Add the Visualizer Mission brief and its reference images** to `docs/` (I'm providing them — put images in `docs/visual-references/`). Then update PROJECT-STATUS.md §5 and §8 to reflect the visualizer direction: photo-composite scene with AI depth (2.5D) now, Gaussian splatting flagged as phase two, and the smart-template prop system. Read the mission brief for the specifics — do not invent details beyond it. Flag anything in the existing §5 that now conflicts and ask me before overwriting.
>
> 6. **Replace the draft blueprint:** if `docs/LightCanvas_Technical_Blueprint Draft 05.10.pdf` is superseded by a final version I provide, move the draft to `docs/_archive/` and add the final.
>
> 7. **Update the "Last updated" line and Update Log** in PROJECT-STATUS.md. Commit everything together.
>
> Report what you changed, what you archived, and anything you were unsure about. Do not mark this done until `npx tsc --noEmit` and `npx next build` pass.

That's the whole repo side. It's deliberately small — your repo doesn't need much.

---

## 4. Claude project knowledge cleanup — your manual job

Claude Code can't touch these. In the Claude app, open your LightCanvas project, and:

**Remove (these are the retired set — already marked for retirement in PROJECT-STATUS §6):**
- `00-architecture.md` through `19-legal.md` — all 20 Lumen-era spec files (superseded by PROJECT-STATUS + the numbered work is done)
- `ROADMAP.md` — superseded by the v3 Excel
- `OPEN-QUESTIONS.md` — all 23 questions answered
- `LANDING-PAGE.md` — landing was built
- `CORRECTION-layout-tab.md` — already applied
- `hero-house.jsx`, `landing-marketplace.jsx`, `landing-pricing.jsx`, `landing-sections.jsx`, `landing-styles.css`, `LightCanvas_Landing.html`, `styles.css` — landing source, already ported into the repo
- The standalone `Engineering Reference Spec` — fully absorbed by the Blueprint + Timeline spec
- The standalone `Claude Code Prompts` doc — covered by the roadmap (see note above)
- Any duplicate Timeline Effects spec — keep one copy only

**Keep (reference library + canonical):**
- `xLights_File_Format_Reference.docx`, `LOR_File_Format_Reference.docx`
- `lighting-technical-reference.md`, `competitive-landscape.md`
- `LightCanvas_AI_Native_Show_Sequencer_Reference.docx`
- `LightCanvas_Timeline_Effects_Engine_Spec.docx` (one copy)
- `Interesting Ideas & Concepts.docx`
- `LightCanvas_Technical_Blueprint.pdf` (the final, not the draft)
- `LightCanvas Roadmap v3.xlsx`, `LightCanvas Financial Model.xlsx`

**Add:**
- `CONSTITUTION.md` (new)
- The Visualizer Mission brief + reference images
- Whatever the next mission brief turns out to be (AI engine)

---

## 5. The one rule that keeps this safe

Archive, never delete. Everything retired moves to `docs/_archive/` (repo) or just gets removed from project knowledge (the originals still live on your drive). Nothing is destroyed. If we got something wrong, it's recoverable. You + me decide what's what; Claude Code only executes the exact moves.

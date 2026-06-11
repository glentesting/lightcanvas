# LightCanvas Product Constitution

*The product's operating law. Every AI or code agent reads this before making changes. Durable principles — not status, not features. If a principle here ever conflicts with something in PROJECT-STATUS.md, this file wins until a human changes it.*

## Core Identity

LightCanvas is an AI-native holiday light show design and sequencing platform.

The promise is not "a prettier xLights." The promise is: beginner-friendly show creation that still produces real, usable, exportable lighting data.

The product translates human intent into display geometry, timeline effects, pixel frames, controller mapping, validation, and export/playback outputs.

LightCanvas should eventually sit beside xLights, Light-O-Rama, and FPP while reducing the need for users to live inside those tools. It exports industry-standard files (XSQ and LMS now, FSEQ as that path matures) so users can bypass living inside the legacy editors — not so we re-skin them.

## Non-Negotiable Architecture Rules

- Geometry, sequencing, rendering, mapping, and output stay separate. A timeline block is never a controller channel.
- The timeline targets semantic objects: props, fixtures, groups, scenes, beats, sections, and reusable clips.
- The renderer resolves semantic intent into pixel frame buffers.
- The mapping/output layer resolves pixels into ports, universes, channels, protocols, and export files.
- Beginner mode may hide complexity, but the system still models it correctly underneath.
- Every export path validates before output. No "download and hope."
- AI suggestions are inspectable, editable, and reversible.
- No feature is complete until it can be loaded, edited, saved, reopened, validated, and exported without data loss.

## UX Principles

- **Light mode across the application UI.** The one exception is the preview / night canvas, which renders against dark so the lights actually read — the same way a video editor keeps a dark preview monitor inside a bright interface. That's a render surface, not a theme. No user-facing dark-mode toggle anywhere.
- The user thinks in house, props, music, moments, and vibes — not raw channels first.
- Advanced users can still inspect controller, port, universe, channel, and export details.
- AI acts like a calm production assistant: suggest, explain, validate, fix. Not mysterious magic thrown at the timeline.
- Preflight is a first-class product surface, not an afterthought.
- The product reduces panic. Every scary technical issue comes with a plain-English explanation and a recommended fix.

## Data Model Principles

- Versioned project documents. Every saved project carries a `schemaVersion`.
- One canonical display model for props, fixtures, pixel geometry, groups, and layout.
- The display model can anchor to a real house photo/scene — props and light runs are placed against that backdrop, not on a blank grid. Placement positions are part of the canonical model.
- Timeline data stays independent from controller data.
- Controller/hardware profiles stay separate from creative timeline data.
- Export mappings stay explicit and reviewable.
- Generated AI changes stored as patches/history where possible, not opaque overwrites.

## Compatibility Policy

| Target | Policy |
|--------|--------|
| xLights | Primary near-term export target. Export intent to XSQ (+ rgbeffects.xml) cleanly enough that the user never has to rebuild their display by hand. |
| Light-O-Rama | Support the installed base, but be honest about S4/S5 differences, RGB/channel mapping, and effect limitations. Degrade gracefully, never silently. |
| FPP | Critical long-term playback/deployment target. Treat as the playback layer needing sequence files, media, playlist/show package, and controller/network awareness. |
| Controllers | Model Falcon/Kulp/WLED/DDP/E1.31 constraints through profiles and validation. Never fake controller support with labels only. |
| Native LightCanvas format | Remains the editable source of truth. Exports are compiled/translated outputs, never the master project. |

## Do Not Repeat

- Don't mark features complete based only on UI presence.
- Don't let AI coding tools add new routes without updating PROJECT-STATUS.md.
- Don't let storage buckets, DB schema, and API routes drift from each other.
- Don't add controller/export claims before real validation.
- Don't build giant single-file components when smaller ones are safer.
- Don't preserve a past AI decision just because it's already in the repo — and don't delete one just because it looks unfamiliar. Check intent first.

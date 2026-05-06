# V2-02 — Preset System

Build an immutable, versioned effect preset system. This fixes the #1 pain point in xLights: presets that pull in stale settings from a previous session.

## Core principle
A preset stores explicit parameter values. Applying a preset never inherits anything from the current panel state. What's saved is exactly what gets applied. No surprises.

## Preset types

**Effect Preset** — One effect type + explicit parameter values.
```typescript
interface EffectPreset {
  id: string;
  name: string;
  effectType: string;
  parameters: Record<string, unknown>;  // explicit, complete
  version: number;
  compatibleFixtureTypes: string[];  // ['line', 'arch', 'tree', etc.]
  tags: string[];
  createdAt: string;
  isSystem: boolean;  // built-in vs user-created
}
```

**Clip Preset** — Full effect block config (effect + duration + easing + blend mode).

**Scene Preset** — Multi-fixture arrangement (builds on V2-01 Scenes).

## Immutability rules

- Applying a preset creates a new effect block with the preset's stored values
- Editing parameters on an applied preset creates a **local override** — it does not modify the master preset
- The parameter panel shows "Modified from: [Preset Name]" when local overrides exist
- "Save as new preset" / "Update master preset" are explicit user actions, not automatic

## Preset library UI

- New "Presets" tab in the effects palette sidebar
- Presets grouped by category (Color, Motion, Texture, etc.)
- Filter by compatible fixture type — only show presets that work with the selected fixture
- Visual thumbnail showing the preset's effect style
- System presets (built-in) are read-only, shown first
- User presets below, with edit/delete controls

## Built-in presets to ship

At minimum:
- "Christmas Classic" — red/green alternating wash, slow fade
- "Snow Storm" — white twinkle, high density
- "Chase Red" — red chase left-to-right
- "Strobe White" — white strobe, fast
- "Warm Fade" — warm white fade in/out, slow
- "Rainbow Sweep" — color wash cycling through full spectrum

## Acceptance

- Applying a preset always gives exact saved values — no stale settings
- Modifying parameters after applying shows "Modified" indicator
- User can save custom presets
- Presets filter by compatible fixture type
- System presets are read-only
- Preset library persists across sessions (stored in Supabase with user_id)

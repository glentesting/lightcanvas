# V2-01 — Sequencer Enhancements

Build the timeline features that differentiate LightCanvas from legacy sequencers. Implement in this order — each builds on the previous.

## 1. Group Tracks

Let users sequence multiple fixtures as a single track.

### What it is
A Group Track targets a named group of fixtures (e.g., "All Arches," "Windows," "All Outline"). Dropping an effect on a Group Track applies it to every fixture in the group simultaneously.

### Data model addition
```typescript
// Add to project JSONB
fixtureGroups: {
  id: string;
  name: string;
  fixtureIds: string[];  // references fixture IDs
  color: string;         // track color in timeline
}[]

// Add to EffectBlock
targetType: 'fixture' | 'group';
targetId: string;  // fixtureId or fixtureGroupId
```

### UI
- "Add Group" button in the sidebar fixture list
- Checkboxes to select which fixtures belong to the group
- Group tracks appear above individual fixture tracks in the timeline
- Group track has a different visual style (slightly wider, group icon)
- Expanding a group track shows the individual fixture rows underneath (like Premiere's nested sequences)

### Rendering
When a Group Track has an effect block, render that effect to all fixtures in the group. Individual fixture tracks can still have their own effects that override or add to the group effect (resolve conflicts using the same layer logic — group is "lower priority" by default).

## 2. Layer System + Blend Modes

Allow multiple effect layers per fixture (or group) track.

### What it is
Each fixture track can have multiple layers stacked vertically. Effects on higher layers composite over lower layers using a blend mode.

### Data model addition
```typescript
// EffectBlock gets a layerIndex
layerIndex: number;  // 0 = base, 1 = above, etc.
blendMode: 'replace' | 'add' | 'multiply' | 'screen' | 'mask' | 'priority';
opacity: number;  // 0-1
```

### Blend modes
- **Replace** (default): top layer fully replaces lower layers
- **Add**: add color values — brightens, good for sparkles/strobes on top of a wash
- **Multiply**: darken/tint — multiply color values (0–1 range)
- **Screen**: soft additive — `1 - (1-A)(1-B)`
- **Mask**: top layer's brightness limits where lower layer is visible
- **Priority**: used for safety overrides — always wins regardless of order

### UI
- Each fixture track shows "Add layer" button on hover
- Layers stack vertically within the track row — each gets its own thin band
- Layer band shows blend mode indicator + opacity slider on selection
- Default: one layer per track (existing behavior unchanged for current tracks)

### Rendering
Process layers bottom to top. For each frame:
```
layerBuffer = transparent
for each layer (bottom to top):
  clipBuffer = render active effects on this layer
  layerBuffer = blend(layerBuffer, clipBuffer, mode, opacity)
output layerBuffer to pixel frame
```

## 3. Scenes

Reusable multi-fixture arrangements.

### What it is
A Scene is a named, time-bounded arrangement of effects across multiple fixtures that can be dropped anywhere in the timeline. Build your "chorus" once — drop it 4 times at each chorus.

### Data model
```typescript
interface Scene {
  id: string;
  name: string;
  durationMs: number;
  thumbnail?: string;
  tracks: SceneTrack[];  // fixture targets + their effects (relative timing)
}
```

### UI
- "Save as Scene" in the right-click menu when multiple blocks are selected across fixtures
- Scenes appear in a new "Scenes" section in the effects palette sidebar
- Drag a scene from palette → timeline → it expands into all its constituent tracks
- Scenes can be stretched/compressed (with a stretch mode that retimes internal effects proportionally)

## 4. Seamless Loop Handling

Fix the visual "jerk" when looping effects restart.

### What it is
Chase and motion effects have a visible seam when they repeat — the animation jumps back to frame 0 instead of continuing smoothly.

### Implementation
Add a `seamlessLoop` boolean parameter to motion effects (Chase, Wave, Meteor).

When enabled:
- Calculate the phase at the end of the effect block
- Start the next loop from that phase instead of frame 0
- For chase: use modulo arithmetic — `phase = (elapsedMs / cycleDurationMs) % 1`

This is a renderer change in `lib/render/effects/[chase|wave|meteor].ts`.

### UI
Checkbox in the effect parameter panel: "Seamless repeat" (on by default for Chase, Wave).

## 5. Keyframes on Effect Parameters

Allow parameters to change over the duration of a block.

### What it is
Instead of "speed = 40% for this whole block," you can say "speed starts at 20% and ramps to 80% by the end."

### Scope for this slice
Support keyframes on: intensity (brightness), speed, and primary color.

### Data model
```typescript
// Add to EffectBlock
keyframes?: {
  paramKey: 'intensity' | 'speed' | 'color';
  frames: { t: number; value: number | string }[];  // t = 0-1 (relative position in block)
}[]
```

### UI
- Select a block → parameter panel shows a small keyframe strip for supported params
- Click to add a keyframe at the current playhead position within the block
- Drag keyframes to adjust timing
- Simple linear interpolation between keyframes to start

### Rendering
At render time, interpolate keyframe values at the current time position within the block.

## 6. Diagnostic/Validation Track

Show in-timeline warnings for problems.

### What it is
A read-only "Diagnostic" row at the top of the timeline that shows warning flags at specific time positions. Users see problems without leaving the sequencer.

### Warning types
- Block targets a fixture that no longer exists
- Two blocks on the same fixture + same time with conflicting layers
- Effect not supported by the user's export format (e.g., Meteor on a LOR export)
- Render performance warning — too many high-cost effects overlapping

### UI
- Diagnostic track row at top of timeline, initially collapsed
- Expands to show warning flags — click a flag to see the plain-English explanation
- Flag color: orange (warning) or red (will break export)

## 7. AI Suggestion Track

Non-destructive AI proposals.

### What it is
When Lumi generates effects, they appear on a separate "AI Suggestions" lane — not directly on the fixture tracks. User reviews, accepts what they like, rejects the rest.

### UI
- AI Suggestions track appears below all fixture tracks when Lumi has active suggestions
- Suggestion blocks are visually distinct: dashed border, slightly transparent, labeled "Lumi"
- Per-block actions: Accept (moves to fixture track), Reject (removes), "Explain this" (Lumi explains her reasoning)
- "Accept all" / "Reject all" buttons in the AI panel

### Implementation
- AI-generated effects are stored as `aiSuggestions` in project JSONB (not in the main `sequence.tracks`)
- Accepting a suggestion moves it to `sequence.tracks` as a normal effect block
- Rejecting removes it from `aiSuggestions`
- Wrapping accept/reject in a single undo entry

## Acceptance

- Group tracks can be created, fixtures assigned, effects dropped on them
- Group track effects apply to all member fixtures
- Layers can be added to any track — effects stack correctly
- Blend modes (Replace, Add) work visually in preview
- Scenes can be created from selected blocks and dropped onto the timeline
- Seamless loop checkbox eliminates jerk on Chase effect
- Keyframes on intensity interpolate correctly in preview
- Diagnostic track shows warnings for deleted fixture targets
- AI suggestions appear in a separate track — accept/reject works

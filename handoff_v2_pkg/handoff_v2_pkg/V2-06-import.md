# V2-06 — Import (XSQ + LOR)

Let users bring existing xLights and LOR sequences into LightCanvas. This is the single biggest thing that would make experienced hobbyists switch — their existing library comes with them.

## XSQ Import (xLights sequences)

### Entry point
"Import from xLights" option in the dashboard Create menu and in File settings.

### Process
1. User uploads a .xsq file
2. Parse the XML
3. Create a new LightCanvas project
4. Map xLights models → LightCanvas fixtures (by name, then by type+pixelCount similarity)
5. Map xLights effects → LightCanvas effect types (reverse of the export mapping)
6. Import timing tracks as beat grid data
7. Show a summary: "Imported 8 models, 247 effect blocks. 3 effects could not be mapped exactly — shown as placeholders."

### Effect mapping (xLights → LightCanvas)

| xLights | LightCanvas |
|---|---|
| Twinkle | twinkle |
| Chase | chase |
| Fade | fade |
| Strobe | strobe |
| Shimmer | sparkle |
| Color Wash | wash |
| Pulse | pulse |
| Meteor | meteor |
| Fireworks | firework |
| Everything else | "Custom" placeholder block (imported but not editable — displays xLights effect name) |

### Fixtures
If a model name matches an existing fixture in the project → assign effects to that fixture.
If no match → create a new fixture with the model's name, type (guess from xLights DisplayAs), and pixel count.

### Audio
XSQ references audio by filename only. Prompt user to upload the matching audio file after import.

## LOR Import (.lms)

### Entry point
"Import from LOR" option. Accepts .lms files (S4 format).

### Process
1. Parse .lms XML
2. Group RGB channels (linked by RGBChannel attribute) into single fixtures
3. Single-color channels become single-color fixtures
4. Map LOR effects → LightCanvas effects
5. Create project with imported fixtures and effect blocks

### Effect mapping (LOR → LightCanvas)

| LOR effect | LightCanvas |
|---|---|
| intensity (100) | wash |
| intensity (0) | (off — no block) |
| fadeTo (0→100) | fade (in) |
| fadeTo (100→0) | fade (out) |
| shimmer | strobe |
| twinkle | twinkle |

### Audio
LMS references audioFilename — prompt user to upload the matching file.

## Import summary modal

After parsing, before creating the project:
- Show counts: X fixtures, Y effect blocks imported
- Show warnings: "3 effect types could not be mapped and will appear as placeholders"
- Show errors if any: "2 channels had overlapping effects — the later one was kept"
- "Cancel" or "Import"

## Acceptance

- XSQ file imports without crashing the app
- Fixtures are created with correct names and pixel counts
- Effect blocks appear at correct positions in the timeline
- Unmapped xLights effects show as gray placeholder blocks
- LOR .lms imports correctly — RGB channel groups become single fixtures
- Import summary modal shows accurate counts and warnings
- Audio upload prompt appears after import
- Imported project saves to Supabase and appears in dashboard

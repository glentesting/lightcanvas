# RL-04 — LOR Export (.lms)

Build the Light-O-Rama sequence exporter. LOR is ~30-40% of the dedicated hobbyist market. Without .lms export, that entire segment has no path to use LightCanvas. This ships at the same time as the xLights export.

Reference document: `LOR_File_Format_Reference.docx` — read it fully before writing any code. It covers the complete .lms XML structure, every effect type, RGB channel linking, timing model, and the effect translation table.

## What gets exported

A ZIP file containing:
1. `[project-name].lms` — the LOR S4 sequence file
2. `[audio-filename].mp3` — audio downloaded from Supabase
3. `README.txt` — LOR-specific setup instructions

## Pre-export: Unit/Circuit Mapping Step

LOR doesn't use Universe+Channel addressing — it uses Unit number (the controller box) and Circuit number (the output on that box).

Before generating the file, show a mapping screen similar to the xLights fixture name mapper:

**"Set your LOR unit and circuit numbers"**

A table with columns:
- Fixture name (read-only)
- Unit # (editable, default: 1)
- Circuit # (editable, pre-calculated from start channel)
- Type (Single color / RGB — derived from fixture)

Below: "These numbers must match your LOR controller setup. Check your LOR Network Configuration if unsure."

Store the mapping in the project JSON. Pre-fill on subsequent exports.

### Auto-calculation of circuit numbers

Default suggestion: map our Universe+StartChannel to LOR addressing:
- `unit = universe number` (simplification — user corrects if wrong)
- `circuit = start channel` for single-color, or the first of three consecutive circuits for RGB

For RGB fixtures: auto-generate three sequential circuits (R=circuit, G=circuit+1, B=circuit+2).

## LMS File Generation

```xml
<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<sequence
  dacInMilliseconds="[frame rate, default 50]"
  songArtist="[optional]"
  songTitle="[project name]"
  comment="Created by LightCanvas"
  totalCentiseconds="[duration_ms / 10]"
  audioFilename="[audio filename]"
  videoFilename="">
  <channels>
    [channel elements]
  </channels>
</sequence>
```

### Channel generation

For each fixture:

**Single-color fixture:**
```xml
<channel
  color="[RGB integer]"
  centiseconds="[frame rate / 10]"
  deviceType="LOR"
  unit="[mapped unit]"
  circuit="[mapped circuit]"
  name="[fixture name]"
  savedIndex="[0-based sequential index]">
  [effect elements]
</channel>
```

**RGB fixture** (generates 3 linked channels):
```xml
<channel color="16711680" ... name="[name] Red"
  savedIndex="[n]" RGB="Red" RGBChannel="[group index]">
  [red channel effects]
</channel>
<channel color="65280" ... name="[name] Green"
  savedIndex="[n+1]" RGB="Green" RGBChannel="[group index]">
  [green channel effects]
</channel>
<channel color="255" ... name="[name] Blue"
  savedIndex="[n+2]" RGB="Blue" RGBChannel="[group index]">
  [blue channel effects]
</channel>
```

Color integer: `R * 65536 + G * 256 + B`. White = 16777215. Red = 16711680. Green = 65280.

### Effect translation

| LightCanvas effect | LOR output |
|---|---|
| twinkle | `<effect type="twinkle"/>` |
| sparkle | `<effect type="twinkle"/>` |
| strobe | `<effect type="shimmer"/>` |
| fade (in) | `<effect type="fadeTo" startIntensity="0" intensity="100"/>` |
| fade (out) | `<effect type="fadeTo" startIntensity="100" intensity="0"/>` |
| wash / on | `<effect type="intensity" intensity="100"/>` |
| pulse | Alternating fadeTo up + fadeTo down cycles |
| chase | Sequential intensity blocks across fixtures (see note) |
| wave | Staggered fadeTo cycles with timing offsets |
| meteor | Stepping intensity sequence (approximation) |
| firework | Fast fadeTo up then slow fadeTo down |

**Timing:** All times in centiseconds = `Math.round(ms / 10)`.

**Color decomposition for RGB effects:** Break hex color into R/G/B. `intensity = Math.round(channel / 255 * 100)`.

**Chase across multiple fixtures:** Divide the block duration by fixture count. Each fixture gets `duration/N` centiseconds of intensity=100, offset sequentially.

### Pre-export effect degradation warning

Before export, show a summary:
- "X effects export directly to LOR"
- "Y effects will be approximated (Chase, Wave, Meteor, Firework)"
- Expandable list showing exactly which blocks are approximated and how

User acknowledges and clicks "Export anyway" or goes back to simplify.

## README.txt content (LOR)

```
LightCanvas Export — Light-O-Rama
===================================

Files in this ZIP:
  [project].lms     Your LOR sequence file
  [audio].mp3       Your audio file

Steps:
1. Open Light-O-Rama Sequence Editor
2. File > Open > select [project].lms
3. Verify your channel assignments match your LOR controller setup
   (Edit > Channel Properties if anything needs adjusting)
4. Hit Play to preview — or use the LOR Control Panel to run your show
5. If channels don't line up, check Edit > Channel Properties and
   match the Unit/Circuit numbers to your LOR Network Configuration

Need help? Visit: forums.lightorama.com
```

## Acceptance

- Export triggers the unit/circuit mapping screen
- Mapping persists and pre-fills on subsequent exports
- Generated .lms opens in LOR Sequence Editor without errors
- Effects appear on the correct channels at the correct times
- RGB fixtures generate three linked channels with correct RGBChannel values
- Pre-export degradation warning fires and lists approximated effects
- ZIP contains: .lms + audio file + README.txt
- Audio downloaded from Supabase at export time
- Export dialog pre-selects .lms for LOR-profile users
- `dacInMilliseconds` matches the project frame rate setting

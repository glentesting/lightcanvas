# RL-03 — xLights Export (Complete)

Build the complete, production-ready xLights export. The export modal UI exists — this implements the actual logic behind it. This is the most complex export slice and has several interdependent pieces.

## What gets exported

A ZIP file containing:
1. `[project-name].xsq` — the xLights sequence file
2. `[audio-filename].mp3` (or .wav etc.) — audio downloaded from Supabase
3. `xlights_rgbeffects.xml` — the display layout / model definitions file
4. `README.txt` — step-by-step instructions for what to do next

## Pre-export: Fixture Name Mapping Step

Before generating any files, show a mapping screen:

**"Match your fixtures to xLights model names"**

A table with two columns:
- Left: LightCanvas fixture name (read-only, e.g. "Roofline")
- Right: Editable text field pre-filled with the same name

Below the table: "Your xLights sequence won't show effects for fixtures whose names don't match exactly. Fix any differences here."

Store the mapping in the project JSON (`xLights_name_map: { [lightcanvasName]: string }`). Pre-fill from stored mapping on subsequent exports — they only do this once.

"Export" button is disabled until the user has reviewed the table (just scrolled past it — a simple "confirmed" checkbox is fine).

## XSQ File Generation

Valid xLights 2024 XML format. Reference: `xLights_File_Format_Reference.docx` in the project knowledge.

```xml
<?xml version="1.0" encoding="UTF-8"?>
<xsequence version="2.20">
  <head>
    <name>[project name]</name>
    <author>LightCanvas</author>
    <media>[audio filename]</media>
    <sequenceTiming>[frame rate in ms, default 50]</sequenceTiming>
    <sequenceDuration>[duration in ms]</sequenceDuration>
  </head>
  <ElementEffects>
    <!-- one Element per fixture, using the MAPPED name -->
    <Element type="model" name="[mapped fixture name]">
      <EffectLayer>
        <!-- one Effect per block on this fixture's track -->
        <Effect name="[xLights effect name]"
                startTime="[ms]"
                endTime="[ms]"
                settings="" />
      </EffectLayer>
    </Element>
  </ElementEffects>
  <TimingTags>
    <!-- export our beat grid as a timing track -->
    <Timing name="Beats" type="beat">
      <EffectLayer>
        <!-- one Effect per beat interval -->
        <Effect name="On" startTime="[beat start ms]" endTime="[beat end ms]" />
      </EffectLayer>
    </Timing>
  </TimingTags>
</xsequence>
```

### Effect name mapping (our ID → xLights name)

| LightCanvas | xLights |
|---|---|
| twinkle | Twinkle |
| chase | Chase |
| fade | Fade |
| strobe | Strobe |
| sparkle | Shimmer |
| wave | Color Wash |
| pulse | Pulse |
| wash | Color Wash |
| meteor | Meteor |
| firework | Fireworks |

### Frame rate / step time

Add a `sequenceFrameRate` field to project settings. Default: 50ms (20fps — xLights default). Expose in the export dialog as "Sequence frame rate" with a dropdown: 20ms / 25ms / 40ms / 50ms (50ms pre-selected). Include the value in the XSQ `<sequenceTiming>` field.

### Color order

Fixture color order (RGB, GRB, RBG, RGBW) already exists in the properties panel. Wire it through to the XSQ export — include it in the model definition in rgbeffects.xml (see below). This ensures xLights renders colors correctly for each fixture's physical wiring.

## rgbeffects.xml Generation

Generate a production-ready `xlights_rgbeffects.xml` from our fixture data. This gives the user a complete model definition file — not a rough draft, an actual usable file.

```xml
<?xml version="1.0" encoding="UTF-8"?>
<xlights_rgbeffects>
  <models>
    <!-- one modelNode per fixture -->
    <modelNode
      name="[mapped fixture name]"
      DisplayAs="[xLights model type]"
      PixelCount="[pixel count]"
      StartChannel="[start channel]"
      Universe="[universe]"
      Dir="[direction: L or R]"
      StringType="RGB Nodes"
      Antialias="1"
      parm1="[pixel count]"
      parm2="1"
      parm3="1"
      WorldPosX="[canvas X mapped to xLights coord]"
      WorldPosY="[canvas Y mapped to xLights coord]"
      WorldPosZ="0"
      ScaleX="1"
      ScaleY="1"
      ScaleZ="1"
      RotateX="0"
      RotateY="0"
      RotateZ="0"
    />
  </models>
  <modelGroups/>
  <palettes/>
  <perspectives/>
  <settings/>
</xlights_rgbeffects>
```

### Fixture type → xLights DisplayAs mapping

| LightCanvas type | xLights DisplayAs |
|---|---|
| roofline, pathway, line | Single Line |
| arch | Arch |
| bush, mini-tree | Single Line |
| mega-tree | Tree 360 |
| window | Single Line |
| matrix | Matrix |

### Canvas coordinate mapping

xLights uses a 400×400 preview grid by default. Map our canvas coordinates (assume 1000px wide canvas) to xLights coordinates:
- `worldPosX = (fixture.x / canvasWidth) * 400`
- `worldPosY = (1 - fixture.y / canvasHeight) * 400` (Y inverted)

### Controller connection (if hardware profile has controller type)

If the user has set a controller type in their hardware profile, add controller connection attributes:
```xml
CustomColorOrder="[colorOrder]"
parm1="[pixelCount]"
```

Include a comment at the top of the file:
```xml
<!-- Generated by LightCanvas. Controller assignments need to be set in xLights Setup tab. -->
```

## README.txt content (xLights)

```
LightCanvas Export — xLights
=============================

Files in this ZIP:
  [project].xsq          Your sequence file
  [audio].mp3             Your audio file
  xlights_rgbeffects.xml  Your display model definitions

Steps:
1. Create a show directory on your computer (e.g., C:\xLights\MyShow\)
2. Copy ALL files from this ZIP into that directory
3. Open xLights and set your Show Directory to that folder
4. In the Layout tab: click "Load" — your fixtures should appear
   (If model names don't match, edit the name fields to match your xLights layout)
5. In the Sequencer tab: open [project].xsq
6. Click Render > Render All Sequences
7. Open FPP or xSchedule, load the .fseq file that was just generated
8. Hit Play — your show should run!

Need help? Visit: xlights.org/manual or the xLights Facebook group.
```

## Acceptance

- Export triggers the fixture name mapping screen before generating files
- Mapped names persist and pre-fill on subsequent exports
- Generated XSQ opens in xLights without errors
- Effects appear on the correct models at the correct times
- Beat grid appears as a Timing Track in xLights
- rgbeffects.xml opens in xLights and shows all fixtures in the preview
- ZIP contains: .xsq + audio file + rgbeffects.xml + README.txt
- Audio file is downloaded from Supabase at export time (not just a URL reference)
- Frame rate setting in export dialog writes to XSQ sequenceTiming
- Export dialog pre-selects XSQ for xLights-profile users

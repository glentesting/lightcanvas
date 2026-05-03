# 09 — Exports: Lumen JSON, xLights, MP4

Three formats. The export dialog from the prototype lets the user pick one, set options, and download.

## Lumen JSON

Trivial — serialize the project. Add a version string so we can migrate later.

```ts
// lib/exports/lumen-json.ts
export function exportLumenJson(project: Project): Blob {
  const payload = {
    $schema: 'https://lumen.app/schemas/project-v1.json',
    version: '1.0.0',
    exportedAt: new Date().toISOString(),
    project: {
      name: project.name,
      audio: project.audio,
      audioFile: project.audioFile,
      fixtures: project.fixtures,
      groups: project.groups,
      sequence: project.sequence,
      houseTemplate: project.houseTemplate,
    },
  };
  return new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
}
```

Importer (`importLumenJson`) is the reverse — validate with zod, return `Project`.

## xLights `.xsq`

This is the killer feature. xLights sequence files are XML; the format is documented at the xLights wiki and source at `github.com/smeighan/xLights`. We're targeting **xLights 2024 (FSEQ v2.0 / sequence format)** since that's what users actually run.

Two files conceptually:
1. `.xsq` — XML sequence (timing tracks, effects per model)
2. `.fseq` — binary, one frame per `frameTime` (usually 50ms = 20fps), all channel values

Most users open `.xsq` and re-render to `.fseq` inside xLights. Ship the `.xsq` only in v1; document `.fseq` for v2.

### `.xsq` structure (simplified)

```xml
<?xml version="1.0"?>
<xsequence BaseChannel="0" ChanCtrlBasic="0" ChanCtrlColor="0" FixedPointTiming="1" ModelBlending="false">
  <head>
    <author>Lumen</author>
    <version>2024.18</version>
    <songFilename>song.mp3</songFilename>
    <sequenceTiming>50 ms</sequenceTiming>
    <sequenceType>Media</sequenceType>
  </head>
  <DisplayElements>
    <Element collapsed="0" type="model" name="Roofline strip" visible="1"/>
    <!-- one per fixture -->
  </DisplayElements>
  <ElementEffects>
    <Element type="model" name="Roofline strip">
      <EffectLayer>
        <Effect ref="0" name="Color Wash" startTime="0" endTime="4000"
                settings="E_TEXTCTRL_Eff_On_Start=255,E_TEXTCTRL_Eff_On_End=255,..."
                palette="C_BUTTON_Palette1=#0080ff,..." />
        <!-- one per block on this track -->
      </EffectLayer>
    </Element>
  </ElementEffects>
  <TimingTracks>
    <Element type="timing" name="Beats">
      <EffectLayer>
        <Effect label="" startTime="500" endTime="928"/>
        <!-- one per beat -->
      </EffectLayer>
    </Element>
  </TimingTracks>
  <nextid>1</nextid>
</xsequence>
```

### Effect-name mapping

xLights names differ slightly. Map:

| Lumen | xLights |
|---|---|
| twinkle | Twinkle |
| chase | Marquee (with chase=true) |
| fade | On (with ramp) |
| strobe | Strobe |
| sparkle | Galaxy |
| wave | Plasma (or Curtain) |
| pulse | Pulse |
| wash | Color Wash |
| meteor | Meteors |
| firework | Fireworks |

### Implementation

```ts
// lib/exports/xlights.ts
import { create } from 'xmlbuilder2';

export function exportXlights(project: Project): Blob {
  const root = create({ version: '1.0' }).ele('xsequence', {
    BaseChannel: '0', FixedPointTiming: '1', /* … */
  });

  const head = root.ele('head');
  head.ele('author').txt('Lumen').up();
  head.ele('songFilename').txt(project.audioFile ?? '').up();
  head.ele('sequenceTiming').txt('50 ms').up();

  const display = root.ele('DisplayElements');
  for (const fixture of project.fixtures) {
    display.ele('Element', { type: 'model', name: fixture.name, visible: '1' });
  }

  const effects = root.ele('ElementEffects');
  for (const fixture of project.fixtures) {
    const elem = effects.ele('Element', { type: 'model', name: fixture.name });
    const layer = elem.ele('EffectLayer');
    const blocks = project.sequence.blocks.filter(b => b.trackId === fixture.id);
    blocks.forEach((b, i) => {
      layer.ele('Effect', {
        ref: i.toString(),
        name: XLIGHTS_NAME[b.effectId],
        startTime: Math.round(b.start * 1000).toString(),
        endTime: Math.round((b.start + b.duration) * 1000).toString(),
        settings: settingsFor(b),
        palette: paletteFor(b),
      });
    });
  }

  // Timing tracks: Beats + Downbeats
  const timing = root.ele('TimingTracks');
  if (project.audio?.beats) {
    const t = timing.ele('Element', { type: 'timing', name: 'Beats' }).ele('EffectLayer');
    project.audio.beats.forEach((beat, i) => {
      const next = project.audio!.beats[i + 1] ?? beat + 0.5;
      t.ele('Effect', { label: '', startTime: Math.round(beat * 1000), endTime: Math.round(next * 1000) });
    });
  }

  return new Blob([root.end({ prettyPrint: true })], { type: 'application/xml' });
}
```

Test: open the resulting `.xsq` in xLights. The fixtures should appear as models, effects should be on the right layers at the right times, beats should appear as a timing track. Settings strings are the trickiest part — refer to `xLights/sequencer/Effect.cpp` for the exact key names per effect type. **Plan to iterate here based on real xLights testing.**

## MP4 preview render

Capture the canvas-fancy renderer with `MediaRecorder`, mix in the audio.

```ts
// lib/exports/mp4.ts
export async function exportMp4(project: Project, opts: { fps: number }): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = 1600; canvas.height = 900;
  const ctx = canvas.getContext('2d')!;

  const audioCtx = new AudioContext();
  const audioEl = new Audio(project.audioUrl!);
  await audioEl.load();
  const audioSource = audioCtx.createMediaElementSource(audioEl);
  const audioDest = audioCtx.createMediaStreamDestination();
  audioSource.connect(audioDest);
  audioSource.connect(audioCtx.destination);

  const canvasStream = canvas.captureStream(opts.fps);
  const combined = new MediaStream([
    ...canvasStream.getVideoTracks(),
    ...audioDest.stream.getAudioTracks(),
  ]);

  const recorder = new MediaRecorder(combined, { mimeType: 'video/webm;codecs=vp9,opus' });
  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => chunks.push(e.data);

  recorder.start();
  audioEl.play();
  await renderLoop(canvas, project, opts.fps); // drives time from audioEl.currentTime
  recorder.stop();
  await new Promise(r => recorder.onstop = r);

  // Output is webm; transcode to MP4 client-side using ffmpeg.wasm if user picked .mp4
  return new Blob(chunks, { type: 'video/webm' });
}
```

Note: browser `MediaRecorder` output is `.webm`. To deliver true MP4, run `ffmpeg.wasm` in a worker to transcode. Ship `.webm` in v1, label the dialog "Preview video (WebM)" — most users on Windows can play WebM via VLC. Add MP4 transcode in v2.

## Export dialog UX

From the prototype, light overlay only. Sections:
1. **Format** — radio: Lumen JSON / xLights `.xsq` / Preview video (WebM)
2. **Time range** — Whole song (default) / Custom (start/end inputs)
3. **xLights options** (only if format=xLights):
   - Include audio file in same folder (yes/no)
   - Frame rate (20fps / 40fps)
4. **Video options** (only if format=video):
   - Quality (Low/Med/High → bitrate)
   - Resolution (720p / 1080p)
5. Buttons: Cancel / Export

`/api/projects/[id]/export?format=...&start=...&end=...` returns the file with the right `Content-Disposition`.

## Acceptance

- [ ] Export Lumen JSON, re-import, project loads identically
- [ ] Export xLights, open in xLights — fixtures visible as models, beats appear as timing track, at least Color Wash and Twinkle effects show in the right times
- [ ] Export video — WebM file plays with audio, lights match what was on screen
- [ ] Time range works — exporting just 5–15s gives a 10-second result

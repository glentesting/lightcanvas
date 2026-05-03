# 04 — Audio Engine

WaveSurfer.js v7 plays the audio and renders the waveform. Meyda runs once on upload to extract BPM and beats. After analysis, both live in the `audio` JSONB column on the project; we never re-analyze on every load.

## Upload pipeline

1. User picks an MP3 in the sidebar
2. Client requests a signed upload URL from `/api/upload/audio`
3. Client PUTs the file to Supabase Storage
4. Client triggers analysis in a Web Worker (`lib/audio/beat-detector.worker.ts`)
5. Worker posts `{ duration, bpm, beats[], onsets[], loudness[] }` back
6. Client persists `audioUrl` + `audio` to the store; autosave handles DB

```ts
// lib/audio/beat-detector.ts
import Meyda from 'meyda';

export async function analyze(file: File): Promise<AudioAnalysis> {
  const ctx = new OfflineAudioContext(2, 44100 * 600, 44100); // up to 10 min
  const arrayBuffer = await file.arrayBuffer();
  const buffer = await ctx.decodeAudioData(arrayBuffer);

  // 1. Onset detection via spectral flux
  const frameSize = 1024, hopSize = 512;
  const onsets: number[] = [];
  let prevSpectrum: Float32Array | null = null;
  for (let i = 0; i + frameSize < buffer.length; i += hopSize) {
    const frame = buffer.getChannelData(0).slice(i, i + frameSize);
    const features = Meyda.extract(['amplitudeSpectrum', 'rms'], frame) as any;
    if (prevSpectrum) {
      let flux = 0;
      for (let k = 0; k < features.amplitudeSpectrum.length; k++) {
        const diff = features.amplitudeSpectrum[k] - prevSpectrum[k];
        if (diff > 0) flux += diff;
      }
      if (flux > THRESHOLD) onsets.push(i / 44100);
    }
    prevSpectrum = features.amplitudeSpectrum;
  }

  // 2. Estimate BPM via autocorrelation of onset intervals
  const bpm = estimateBpm(onsets);

  // 3. Generate beat grid from BPM, snapped to nearest onset within 50ms
  const beats = generateBeatGrid(bpm, buffer.duration, onsets);

  // 4. Loudness envelope for waveform overlay
  const loudness = computeLoudness(buffer, 50); // 50 samples per second

  return {
    duration: buffer.duration,
    bpm,
    beats,
    downbeats: beats.filter((_, i) => i % 4 === 0),
    onsets,
    loudness,
  };
}
```

The math is non-trivial — use `web-audio-beat-detector` as a reference if needed; just keep all detection client-side, never on the server.

## WaveSurfer setup

```ts
// lib/audio/wavesurfer-config.ts
import WaveSurfer from 'wavesurfer.js';
import RegionsPlugin from 'wavesurfer.js/dist/plugins/regions';
import TimelinePlugin from 'wavesurfer.js/dist/plugins/timeline';

export function makeWavesurfer(container: HTMLElement, audioUrl: string) {
  return WaveSurfer.create({
    container,
    url: audioUrl,
    height: 80,
    waveColor: 'var(--accent-200)',
    progressColor: 'var(--accent-600)',
    cursorColor: 'var(--ink)',
    barWidth: 2,
    barGap: 1,
    barRadius: 1,
    normalize: true,
    backend: 'WebAudio',
    plugins: [
      RegionsPlugin.create(),
      TimelinePlugin.create({ height: 16, timeInterval: 1 }),
    ],
  });
}
```

## Transport bridge

WaveSurfer's `audioprocess` event fires ~30fps with the current time. Pipe it into the transport store:

```ts
ws.on('audioprocess', (t) => useTransportStore.setState({ currentTime: t }));
ws.on('seeking', (t) => useTransportStore.setState({ currentTime: t }));
ws.on('play', () => useTransportStore.setState({ isPlaying: true }));
ws.on('pause', () => useTransportStore.setState({ isPlaying: false }));
```

The transport store's `seek(t)` calls `ws.seekTo(t / duration)`; `play()` calls `ws.play()`, etc. The store wraps WaveSurfer; UI never touches WaveSurfer directly.

## Beat markers + downbeat numbers

Render beat markers as a separate SVG layer inside the timeline, not as WaveSurfer regions (regions are for user selections, beats are a static overlay). Use `audio.beats` for ticks, `audio.downbeats` for numbered markers (1, 2, 3, …).

## Acceptance

- [ ] Upload a 3MB MP3; analysis completes in <10s on a recent laptop
- [ ] Detected BPM is within ±2 of the actual BPM (test with a metronome track)
- [ ] Pressing space toggles play/pause; seeking the waveform updates `currentTime`
- [ ] Refresh: audio plays without re-analyzing (analysis is in DB)
- [ ] Audio file is not playable by an unauthenticated request to its storage path

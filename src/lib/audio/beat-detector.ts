import type { AudioAnalysis } from "./types";

/**
 * Analyze an audio file to extract BPM, beats, onsets, and loudness.
 * Runs client-side using OfflineAudioContext + spectral flux onset detection.
 */
export async function analyzeAudio(file: File): Promise<AudioAnalysis> {
  const arrayBuffer = await file.arrayBuffer();
  const audioCtx = new OfflineAudioContext(1, 1, 44100);
  const buffer = await audioCtx.decodeAudioData(arrayBuffer);

  const sampleRate = buffer.sampleRate;
  const channelData = buffer.getChannelData(0);
  const duration = buffer.duration;

  // --- Onset detection via spectral flux ---
  const frameSize = 1024;
  const hopSize = 512;
  const onsets: number[] = [];

  let prevSpectrum: Float32Array | null = null;
  const fftSize = frameSize;

  // We'll compute amplitude spectrum manually using a simple DFT approach
  // For performance, use the real part of the FFT approximation
  for (let i = 0; i + frameSize < channelData.length; i += hopSize) {
    const frame = channelData.slice(i, i + frameSize);

    // Compute amplitude spectrum via simple magnitude estimation
    const spectrum = computeSpectrum(frame, fftSize);

    if (prevSpectrum) {
      let flux = 0;
      for (let k = 0; k < spectrum.length; k++) {
        const diff = spectrum[k] - prevSpectrum[k];
        if (diff > 0) flux += diff;
      }
      // Adaptive threshold: use mean flux * multiplier
      if (flux > 0.15) {
        const timeInSeconds = i / sampleRate;
        // Avoid double-triggers within 50ms
        if (onsets.length === 0 || timeInSeconds - onsets[onsets.length - 1] > 0.05) {
          onsets.push(timeInSeconds);
        }
      }
    }
    prevSpectrum = spectrum;
  }

  // --- BPM estimation via onset interval autocorrelation ---
  let bpm = estimateBpm(onsets, duration);

  // Tempo octave correction — common heuristic for double/half-time errors
  if (bpm > 160) bpm = Math.round(bpm / 2);
  if (bpm < 60) bpm = Math.round(bpm * 2);

  // --- Generate beat grid from BPM ---
  const beatInterval = 60 / bpm;
  const beats: number[] = [];

  // Find the best offset by aligning to onsets
  let bestOffset = 0;
  let bestScore = 0;
  for (let offset = 0; offset < beatInterval; offset += 0.01) {
    let score = 0;
    for (let t = offset; t < Math.min(duration, 30); t += beatInterval) {
      for (const onset of onsets) {
        if (Math.abs(onset - t) < 0.05) {
          score++;
          break;
        }
      }
    }
    if (score > bestScore) {
      bestScore = score;
      bestOffset = offset;
    }
  }

  for (let t = bestOffset; t < duration; t += beatInterval) {
    beats.push(Math.round(t * 1000) / 1000);
  }

  const downbeats = beats.filter((_, i) => i % 4 === 0);

  // --- Loudness envelope (50 samples/sec) ---
  const loudnessSamplesPerSec = 50;
  const loudness: Array<{ t: number; v: number }> = [];
  const windowSize = Math.floor(sampleRate / loudnessSamplesPerSec);
  for (let i = 0; i < channelData.length; i += windowSize) {
    const end = Math.min(i + windowSize, channelData.length);
    let sum = 0;
    for (let j = i; j < end; j++) {
      sum += channelData[j] * channelData[j];
    }
    const rms = Math.sqrt(sum / (end - i));
    loudness.push({ t: i / sampleRate, v: rms });
  }

  return { duration, bpm, beats, downbeats, onsets, loudness };
}

function computeSpectrum(frame: Float32Array, size: number): Float32Array {
  // Simple magnitude spectrum using DFT on first 64 bins (good enough for onset detection)
  const bins = 64;
  const spectrum = new Float32Array(bins);
  for (let k = 0; k < bins; k++) {
    let re = 0, im = 0;
    for (let n = 0; n < size; n++) {
      const angle = (2 * Math.PI * k * n) / size;
      re += frame[n] * Math.cos(angle);
      im -= frame[n] * Math.sin(angle);
    }
    spectrum[k] = Math.sqrt(re * re + im * im) / size;
  }
  return spectrum;
}

function estimateBpm(onsets: number[], duration: number): number {
  if (onsets.length < 4) return 120; // fallback

  // Compute inter-onset intervals
  const intervals: number[] = [];
  for (let i = 1; i < onsets.length; i++) {
    intervals.push(onsets[i] - onsets[i - 1]);
  }

  // Histogram of intervals mapped to BPM (60-200 range)
  const bpmCounts = new Map<number, number>();
  for (const interval of intervals) {
    if (interval < 0.1) continue; // too short
    // Try multiples/divisions to find BPM in reasonable range
    for (const mult of [1, 2, 4, 0.5, 0.25]) {
      const bpm = Math.round(60 / (interval * mult));
      if (bpm >= 60 && bpm <= 200) {
        bpmCounts.set(bpm, (bpmCounts.get(bpm) || 0) + 1);
      }
    }
  }

  // Find the BPM with the most votes
  let bestBpm = 120;
  let bestCount = 0;
  for (const [bpm, count] of bpmCounts) {
    if (count > bestCount) {
      bestCount = count;
      bestBpm = bpm;
    }
  }

  return bestBpm;
}

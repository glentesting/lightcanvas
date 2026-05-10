import type { AudioAnalysis, AudioSection } from "./types";

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

  // --- Section detection based on energy profile ---
  const sections = detectSections(loudness, duration);

  // --- Spectral features: per-beat bass and high energy ---
  const spectralFeatures = computeSpectralFeatures(channelData, sampleRate, beats, frameSize);

  return { duration, bpm, beats, downbeats, onsets, loudness, sections, spectralFeatures };
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

/**
 * Detect song sections based on energy profile.
 * Uses 4-second windows to compute RMS energy, finds transitions, and labels heuristically.
 */
function detectSections(
  loudness: Array<{ t: number; v: number }>,
  duration: number
): AudioSection[] {
  if (loudness.length === 0 || duration < 8) return [];

  const windowSec = 4;
  const windowCount = Math.max(1, Math.floor(duration / windowSec));
  const energyWindows: number[] = [];

  // Compute average RMS energy in each window
  for (let w = 0; w < windowCount; w++) {
    const tStart = w * windowSec;
    const tEnd = tStart + windowSec;
    const samples = loudness.filter((l) => l.t >= tStart && l.t < tEnd);
    if (samples.length === 0) {
      energyWindows.push(0);
    } else {
      const avg = samples.reduce((s, l) => s + l.v, 0) / samples.length;
      energyWindows.push(avg);
    }
  }

  // Normalize energy curve to 0-1
  const maxE = Math.max(...energyWindows, 0.001);
  const normalized = energyWindows.map((e) => e / maxE);

  // Find significant transitions (>30% change between adjacent windows)
  const transitions: number[] = [0]; // always start with window 0
  for (let i = 1; i < normalized.length; i++) {
    const change = Math.abs(normalized[i] - normalized[i - 1]);
    if (change > 0.3) {
      transitions.push(i);
    }
  }

  // Build sections from transition boundaries
  const sections: AudioSection[] = [];
  const introEnd = Math.floor(windowCount * 0.1);
  const outroStart = Math.floor(windowCount * 0.9);

  // Compute median energy for chorus threshold
  const sorted = [...normalized].sort((a, b) => a - b);
  const medianEnergy = sorted[Math.floor(sorted.length / 2)];
  const chorusThreshold = medianEnergy + (1 - medianEnergy) * 0.4;

  for (let i = 0; i < transitions.length; i++) {
    const wStart = transitions[i];
    const wEnd = i + 1 < transitions.length ? transitions[i + 1] : windowCount;
    const startTime = wStart * windowSec;
    const endTime = Math.min(wEnd * windowSec, duration);

    // Average energy for this section
    let sum = 0;
    let count = 0;
    for (let w = wStart; w < wEnd; w++) {
      sum += normalized[w];
      count++;
    }
    const avgEnergy = count > 0 ? sum / count : 0;

    // Label heuristically
    let label: AudioSection["label"];
    if (wStart <= introEnd && i === 0) {
      label = "intro";
    } else if (wStart >= outroStart) {
      label = "outro";
    } else if (avgEnergy >= chorusThreshold) {
      label = "chorus";
    } else if (avgEnergy < medianEnergy * 0.7) {
      label = "bridge";
    } else {
      label = "verse";
    }

    sections.push({
      label,
      startTime: Math.round(startTime * 100) / 100,
      endTime: Math.round(endTime * 100) / 100,
      avgEnergy: Math.round(avgEnergy * 1000) / 1000,
    });
  }

  return sections;
}

/**
 * Compute per-beat bass and high frequency energy.
 */
function computeSpectralFeatures(
  channelData: Float32Array,
  sampleRate: number,
  beats: number[],
  frameSize: number
): { bassEnergy: number[]; highEnergy: number[] } {
  const bassEnergy: number[] = [];
  const highEnergy: number[] = [];
  const bins = 64;

  for (const beatTime of beats) {
    const sampleStart = Math.floor(beatTime * sampleRate);
    const sampleEnd = Math.min(sampleStart + frameSize, channelData.length);
    if (sampleEnd - sampleStart < frameSize / 2) {
      bassEnergy.push(0);
      highEnergy.push(0);
      continue;
    }

    const frame = channelData.slice(sampleStart, sampleStart + frameSize);
    const spectrum = computeSpectrum(frame, frameSize);

    // Bass: bins 0-7 (~0-340 Hz at 44100/1024)
    let bass = 0;
    for (let k = 0; k < Math.min(8, bins); k++) bass += spectrum[k];
    bass /= 8;

    // High: bins 32-63 (~1400-2750 Hz)
    let high = 0;
    for (let k = 32; k < bins; k++) high += spectrum[k];
    high /= (bins - 32);

    bassEnergy.push(bass);
    highEnergy.push(high);
  }

  // Normalize to 0-1
  const maxBass = Math.max(...bassEnergy, 0.001);
  const maxHigh = Math.max(...highEnergy, 0.001);

  return {
    bassEnergy: bassEnergy.map((v) => Math.round((v / maxBass) * 1000) / 1000),
    highEnergy: highEnergy.map((v) => Math.round((v / maxHigh) * 1000) / 1000),
  };
}

function estimateBpm(onsets: number[], _duration: number): number {
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

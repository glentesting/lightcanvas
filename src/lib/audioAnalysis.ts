import type { SongAnalysis } from '../types/song'

export interface AnalyzedSection {
  name: string
  start: number
  end: number
  energy: number
  vocals: boolean
}

export interface SongAudioAnalysis {
  bpm: number
  beatTimes: number[]
  /** ~200 points, 0–1, aligned linearly over duration */
  bassSeries: number[]
  trebleSeries: number[]
  vocalSeries: number[]
  sections: AnalyzedSection[]
  summary: SongAnalysis
  analyzedAt?: string
}

function mixToMono(buffer: AudioBuffer): Float32Array {
  const { length, numberOfChannels } = buffer
  const out = new Float32Array(length)
  if (numberOfChannels === 0) return out
  for (let c = 0; c < numberOfChannels; c++) {
    const ch = buffer.getChannelData(c)
    for (let i = 0; i < length; i++) out[i] += ch[i] / numberOfChannels
  }
  return out
}

/** One-pole low-pass (energy / bass proxy) */
function lowPassOnePole(x: Float32Array, sr: number, fc: number): Float32Array {
  const out = new Float32Array(x.length)
  const dt = 1 / sr
  const rc = 1 / (2 * Math.PI * fc)
  const alpha = dt / (rc + dt)
  out[0] = x[0] ?? 0
  for (let i = 1; i < x.length; i++) {
    out[i] = alpha * (x[i] ?? 0) + (1 - alpha) * out[i - 1]
  }
  return out
}

/** One-pole high-pass */
function highPassOnePole(x: Float32Array, sr: number, fc: number): Float32Array {
  const low = lowPassOnePole(x, sr, fc)
  const out = new Float32Array(x.length)
  for (let i = 0; i < x.length; i++) out[i] = (x[i] ?? 0) - low[i]
  return out
}

/** Approximate vocal band: high-pass ~280 Hz then low-pass ~4 kHz */
function vocalBandApprox(x: Float32Array, sr: number): Float32Array {
  const hp = highPassOnePole(x, sr, 280)
  return lowPassOnePole(hp, sr, 4000)
}

function frameRms(signal: Float32Array, hop: number): number[] {
  const frames: number[] = []
  for (let start = 0; start < signal.length; start += hop) {
    const end = Math.min(start + hop, signal.length)
    let sum = 0
    for (let i = start; i < end; i++) {
      const v = signal[i] ?? 0
      sum += v * v
    }
    frames.push(Math.sqrt(sum / Math.max(1, end - start)))
  }
  return frames
}

function movingAverage(a: number[], win: number): number[] {
  if (a.length === 0) return []
  const half = Math.floor(win / 2)
  const out: number[] = []
  for (let i = 0; i < a.length; i++) {
    let s = 0
    let n = 0
    for (let j = Math.max(0, i - half); j <= Math.min(a.length - 1, i + half); j++) {
      s += a[j]
      n++
    }
    out.push(s / n)
  }
  return out
}

function normalizeSeries(a: number[]): number[] {
  const mx = Math.max(...a, 1e-12)
  return a.map((v) => v / mx)
}

function downsampleLinear(series: number[], targetLen: number): number[] {
  if (series.length === 0 || targetLen <= 0) return []
  const out: number[] = []
  for (let i = 0; i < targetLen; i++) {
    const t = (i / Math.max(1, targetLen - 1)) * (series.length - 1)
    const j0 = Math.floor(t)
    const j1 = Math.min(series.length - 1, j0 + 1)
    const f = t - j0
    out.push(series[j0] * (1 - f) + series[j1] * f)
  }
  return out
}

function estimateBpmFromOnsets(onsets: number[], sr: number, hop: number): number {
  if (onsets.length < 8) return 120
  const fps = sr / hop
  const minLag = Math.max(2, Math.round((60 / 190) * fps))
  const maxLag = Math.min(onsets.length - 1, Math.round((60 / 65) * fps))
  if (maxLag <= minLag) return 120

  let bestLag = minLag
  let best = 0
  for (let lag = minLag; lag <= maxLag; lag++) {
    let c = 0
    for (let i = lag; i < onsets.length; i++) c += onsets[i] * onsets[i - lag]
    if (c > best) {
      best = c
      bestLag = lag
    }
  }
  const bpm = 60 / (bestLag / fps)
  return Math.round(Math.min(190, Math.max(65, bpm)))
}

function buildBeatTimes(
  duration: number,
  bpm: number,
  onsets: number[],
  sr: number,
  hop: number,
): number[] {
  const interval = 60 / bpm
  const fps = sr / hop
  const beats: number[] = []

  let peakFrame = 0
  let peakVal = 0
  const searchEnd = Math.min(onsets.length, Math.floor((2 * interval + 1) * fps))
  for (let i = 0; i < searchEnd; i++) {
    if (onsets[i] > peakVal) {
      peakVal = onsets[i]
      peakFrame = i
    }
  }
  let t0 = peakFrame / fps
  if (!Number.isFinite(t0) || t0 > interval) t0 = 0

  for (let t = t0; t < duration; t += interval) {
    const frame = Math.round(t * fps)
    const snapWindow = Math.max(1, Math.round(0.04 * fps))
    let best = t
    let bestO = -1
    for (let f = Math.max(0, frame - snapWindow); f <= Math.min(onsets.length - 1, frame + snapWindow); f++) {
      if (onsets[f] > bestO) {
        bestO = onsets[f]
        best = f / fps
      }
    }
    beats.push(Math.min(duration, best))
  }
  return beats
}

function buildSectionsFromEnergy(
  duration: number,
  energy: number[],
  vocalRatio: number[],
  _sr: number,
  _hop: number,
): AnalyzedSection[] {
  if (energy.length < 4 || duration <= 0) {
    return [{ name: 'Full track', start: 0, end: duration, energy: 50, vocals: false }]
  }

  const smooth = movingAverage(energy, Math.max(3, Math.floor(energy.length / 80)))
  const n = smooth.length
  const MIN_SECTION = 10 // seconds
  const MAX_SECTIONS = 12
  const WINDOW = Math.min(20, Math.max(15, duration / 8)) // 15-20s windows

  // Step 1: compute average energy per fixed window
  const windowCount = Math.max(1, Math.floor(duration / WINDOW))
  const windowEnergies: number[] = []
  for (let w = 0; w < windowCount; w++) {
    const wStart = Math.floor((w / windowCount) * n)
    const wEnd = Math.min(n, Math.floor(((w + 1) / windowCount) * n))
    let sum = 0, cnt = 0
    for (let j = wStart; j < wEnd; j++) { sum += smooth[j]; cnt++ }
    windowEnergies.push(cnt > 0 ? sum / cnt : 0)
  }

  // Step 2: find boundaries where energy changes by >15%
  const rawBoundaries = new Set<number>()
  rawBoundaries.add(0)
  rawBoundaries.add(duration)
  for (let w = 1; w < windowEnergies.length; w++) {
    const prev = windowEnergies[w - 1]
    const curr = windowEnergies[w]
    const avg = (prev + curr) / 2 + 1e-10
    if (Math.abs(curr - prev) / avg > 0.15) {
      rawBoundaries.add(Math.round((w / windowCount) * duration * 10) / 10)
    }
  }

  // Step 3: fallback boundaries at 25%, 50%, 75% if too few natural ones
  if (rawBoundaries.size < 5 && duration > 40) {
    rawBoundaries.add(Math.round(duration * 0.25 * 10) / 10)
    rawBoundaries.add(Math.round(duration * 0.5 * 10) / 10)
    rawBoundaries.add(Math.round(duration * 0.75 * 10) / 10)
  }

  // Step 4: sort and merge close boundaries
  let boundaries = Array.from(rawBoundaries).sort((a, b) => a - b)
  const merged: number[] = [boundaries[0]]
  for (let i = 1; i < boundaries.length; i++) {
    if (boundaries[i] - merged[merged.length - 1] >= MIN_SECTION) {
      merged.push(boundaries[i])
    }
  }
  if (merged[merged.length - 1] < duration) merged.push(duration)
  if (merged.length < 2) merged.push(duration)

  // Cap at MAX_SECTIONS
  while (merged.length - 1 > MAX_SECTIONS) {
    // Remove the boundary that creates the shortest section
    let minIdx = 1, minLen = Infinity
    for (let i = 1; i < merged.length - 1; i++) {
      if (merged[i + 1] - merged[i] < minLen || merged[i] - merged[i - 1] < minLen) {
        const shorter = Math.min(merged[i + 1] - merged[i], merged[i] - merged[i - 1])
        if (shorter < minLen) { minLen = shorter; minIdx = i }
      }
    }
    merged.splice(minIdx, 1)
  }

  // Step 5: build sections with energy and vocal stats
  const peakEnergy = Math.max(...smooth, 1e-12)
  const sections: AnalyzedSection[] = []
  for (let i = 0; i < merged.length - 1; i++) {
    const start = merged[i]
    const end = merged[i + 1]
    const i0 = Math.floor((start / duration) * (n - 1))
    const i1 = Math.ceil((end / duration) * (n - 1))
    let eSum = 0, vSum = 0, cnt = 0
    for (let j = Math.max(0, i0); j <= Math.min(n - 1, i1); j++) {
      eSum += smooth[j]
      vSum += vocalRatio[j] ?? 0
      cnt++
    }
    const eMean = cnt ? eSum / cnt : 0
    const vMean = cnt ? vSum / cnt : 0
    const eRank = eMean / peakEnergy
    sections.push({
      name: `Section ${i + 1}`,
      start,
      end,
      energy: Math.round(Math.min(100, Math.max(5, eRank * 100))),
      vocals: vMean > 0.38,
    })
  }

  // Step 6: label by position and energy
  nameSectionsByEnergy(sections, duration)
  return sections
}

function nameSectionsByEnergy(sections: AnalyzedSection[], duration: number): void {
  if (sections.length === 0) return

  // Tag intro/finale by position
  if (sections[0].end <= duration * 0.2) sections[0].name = 'Intro'
  if (sections.length > 1 && sections[sections.length - 1].start >= duration * 0.85)
    sections[sections.length - 1].name = 'Finale'

  // Find median energy for high/low classification
  const energies = sections.map(s => s.energy).sort((a, b) => a - b)
  const median = energies[Math.floor(energies.length / 2)]

  let verseNum = 1
  let chorusNum = 1
  for (const s of sections) {
    if (s.name === 'Intro' || s.name === 'Finale') continue
    if (s.energy >= median + 10) {
      s.name = chorusNum === 1 ? 'Chorus' : `Chorus ${chorusNum}`
      chorusNum++
    } else if (s.energy <= median - 10) {
      s.name = `Verse ${verseNum}`
      verseNum++
    } else {
      // Mid-energy: bridge or build
      const pos = s.start / duration
      if (pos > 0.5 && pos < 0.8) s.name = 'Bridge'
      else s.name = 'Build'
    }
  }
}

function summaryFromMetrics(input: {
  onsetStrength: number
  bassRatio: number
  trebleRatio: number
  vocalRatio: number
  dynamicsRatio: number
}): SongAnalysis {
  const clamp = (n: number) => Math.round(Math.min(98, Math.max(12, n)))
  return {
    beat: clamp(35 + input.onsetStrength * 55),
    bass: clamp(25 + input.bassRatio * 70),
    treble: clamp(25 + input.trebleRatio * 70),
    vocals: clamp(20 + input.vocalRatio * 75),
    dynamics: clamp(25 + input.dynamicsRatio * 70),
  }
}

/**
 * Full decode → metrics. Uses mono mix, band splitting, onset autocorrelation BPM, beat grid, sections.
 */
export function analyzeAudioBuffer(buffer: AudioBuffer): SongAudioAnalysis {
  const sr = buffer.sampleRate
  const duration = buffer.duration
  const mono = mixToMono(buffer)
  const hop = Math.max(1024, Math.floor(sr * 0.023))

  const bassSig = lowPassOnePole(mono, sr, 180)
  const trebleSig = highPassOnePole(mono, sr, 2600)
  const vocalSig = vocalBandApprox(mono, sr)

  const fullRms = frameRms(mono, hop)
  const bassRms = frameRms(bassSig, hop)
  const trebleRms = frameRms(trebleSig, hop)
  const vocalRms = frameRms(vocalSig, hop)

  const onsets: number[] = [0]
  for (let i = 1; i < fullRms.length; i++) {
    onsets.push(Math.max(0, fullRms[i] - fullRms[i - 1]))
  }
  const onsetsSmooth = movingAverage(onsets, 3)

  const bpm = estimateBpmFromOnsets(onsetsSmooth, sr, hop)
  const beatTimes = buildBeatTimes(duration, bpm, onsetsSmooth, sr, hop)

  const mean = (a: number[]) => a.reduce((s, x) => s + x, 0) / Math.max(1, a.length)
  const mf = mean(fullRms) + 1e-10
  const mb = mean(bassRms) / mf
  const mt = mean(trebleRms) / mf

  const vocalRatioFrames = fullRms.map((f, i) => vocalRms[i] / (f + 1e-10))
  const mvocal = mean(vocalRatioFrames)
  const vmax = Math.max(...fullRms, 1e-10)
  const vmin = Math.min(...fullRms.filter((x) => x > 1e-8), vmax)
  const dynamics = (vmax - vmin) / vmax

  let onsetCorr = 0
  const fps = sr / hop
  const lag = Math.round((60 / bpm) * fps)
  if (lag > 0 && lag < onsetsSmooth.length) {
    let c = 0
    for (let i = lag; i < onsetsSmooth.length; i++) c += onsetsSmooth[i] * onsetsSmooth[i - lag]
    const energy = onsetsSmooth.reduce((s, x) => s + x * x, 0) + 1e-10
    onsetCorr = Math.min(1, c / energy)
  }

  const summary = summaryFromMetrics({
    onsetStrength: Math.min(1, onsetCorr * 1.4),
    bassRatio: Math.min(1, mb * 1.1),
    trebleRatio: Math.min(1, mt * 1.1),
    vocalRatio: Math.min(1, mvocal * 0.85),
    dynamicsRatio: Math.min(1, dynamics * 1.05),
  })

  const sections = buildSectionsFromEnergy(duration, fullRms, vocalRatioFrames, sr, hop)

  const TARGET = 200
  const bassSeries = downsampleLinear(normalizeSeries(bassRms), TARGET)
  const trebleSeries = downsampleLinear(normalizeSeries(trebleRms), TARGET)
  const vocalSeries = downsampleLinear(
    normalizeSeries(vocalRatioFrames.map((v) => Math.min(1, v))),
    TARGET,
  )

  return {
    bpm,
    beatTimes,
    bassSeries,
    trebleSeries,
    vocalSeries,
    sections,
    summary,
  }
}

export function analyzeRawAudio(
  channelData: Float32Array[],
  sampleRate: number,
  duration: number,
): SongAudioAnalysis {
  const fakeBuffer = {
    numberOfChannels: channelData.length,
    sampleRate,
    duration,
    length: channelData[0]?.length ?? 0,
    getChannelData: (channel: number) => channelData[channel] ?? new Float32Array(0),
  } as unknown as AudioBuffer
  return analyzeAudioBuffer(fakeBuffer)
}

const PERSIST_FLAT_SERIES_LEN = 200

/**
 * Reconstruct a {@link SongAudioAnalysis} from DB-persisted summary + sections only.
 * Beat grid is empty; band series are flat lines derived from summary (for stable UI).
 */
export function minimalSongAudioAnalysisFromPersisted(
  summary: SongAnalysis,
  bpm: number,
  sections: AnalyzedSection[],
): SongAudioAnalysis {
  const flat = (pct: number) =>
    Array.from({ length: PERSIST_FLAT_SERIES_LEN }, () => Math.min(1, Math.max(0, pct / 100)))
  return {
    bpm,
    beatTimes: [],
    bassSeries: flat(summary.bass),
    trebleSeries: flat(summary.treble),
    vocalSeries: flat(summary.vocals),
    sections,
    summary,
  }
}

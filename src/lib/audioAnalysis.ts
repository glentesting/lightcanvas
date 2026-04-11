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

const SECTION_NAMES = [
  'Intro',
  'Verse 1',
  'Pre-Chorus',
  'Chorus',
  'Breakdown',
  'Verse 2',
  'Bridge',
  'Finale',
]

function buildSectionsFromEnergy(
  duration: number,
  energy: number[],
  vocalRatio: number[],
  sr: number,
  hop: number,
): AnalyzedSection[] {
  const fps = sr / hop
  if (energy.length < 4 || duration <= 0) {
    return [
      {
        name: 'Full track',
        start: 0,
        end: duration,
        energy: 50,
        vocals: false,
      },
    ]
  }

  const smooth = movingAverage(energy, Math.max(3, Math.floor(energy.length / 80)))
  const n = smooth.length

  const valleys: number[] = []
  for (let i = 2; i < n - 2; i++) {
    const v = smooth[i]
    if (
      v <= smooth[i - 1] &&
      v <= smooth[i + 1] &&
      v < smooth[i - 2] * 0.92 &&
      v < smooth[i + 2] * 0.92
    ) {
      valleys.push(i)
    }
  }

  const minGap = Math.max(2, Math.floor(4 * fps))

  const splits: number[] = [0]
  let last = 0
  for (const v of valleys) {
    if (v - last >= minGap) {
      splits.push(v)
      last = v
    }
  }
  splits.push(n - 1)

  let boundaries = splits.map((f) => (f / Math.max(1, n - 1)) * duration)
  boundaries = [0, ...Array.from(new Set(boundaries.filter((b) => b > 0 && b < duration))), duration].sort(
    (a, b) => a - b,
  )

  const minDur = Math.max(4, duration * 0.06)
  const merged: number[] = [boundaries[0]]
  for (let i = 1; i < boundaries.length; i++) {
    if (boundaries[i] - merged[merged.length - 1] < minDur) continue
    merged.push(boundaries[i])
  }
  if (merged[merged.length - 1] < duration) merged.push(duration)
  if (merged.length < 2) merged.push(duration)

  const sections: AnalyzedSection[] = []
  for (let i = 0; i < merged.length - 1; i++) {
    const start = merged[i]
    const end = merged[i + 1]
    const i0 = Math.floor((start / duration) * (n - 1))
    const i1 = Math.ceil((end / duration) * (n - 1))
    let eSum = 0
    let vSum = 0
    let cnt = 0
    for (let j = Math.max(0, i0); j <= Math.min(n - 1, i1); j++) {
      eSum += smooth[j]
      vSum += vocalRatio[j] ?? 0
      cnt++
    }
    const eMean = cnt ? eSum / cnt : 0
    const vMean = cnt ? vSum / cnt : 0
    const eRank = eMean / (Math.max(...smooth, 1e-12) + 1e-12)
    sections.push({
      name: SECTION_NAMES[Math.min(i, SECTION_NAMES.length - 1)] ?? `Section ${i + 1}`,
      start,
      end,
      energy: Math.round(Math.min(100, Math.max(5, eRank * 100))),
      vocals: vMean > 0.38,
    })
  }

  nameSectionsByEnergy(sections)
  return sections
}

function nameSectionsByEnergy(sections: AnalyzedSection[]): void {
  if (sections.length === 0) return
  sections[0].name = 'Intro'
  sections[sections.length - 1].name = 'Finale'
  if (sections.length <= 2) return

  let best = 1
  for (let i = 1; i < sections.length - 1; i++) {
    if (sections[i].energy > sections[best].energy) best = i
  }
  sections[best].name = 'Chorus'

  let pre = -1
  for (let i = 1; i < sections.length - 1; i++) {
    if (i === best) continue
    if (pre < 0 || sections[i].energy > sections[pre].energy) pre = i
  }
  if (pre >= 0 && pre !== best) sections[pre].name = 'Pre-Chorus'

  let vi = 1
  for (let i = 1; i < sections.length - 1; i++) {
    if (i === best || i === pre) continue
    if (sections[i].name === 'Intro' || sections[i].name === 'Finale') continue
    sections[i].name = vi === 1 ? 'Verse 1' : vi === 2 ? 'Verse 2' : `Section ${i + 1}`
    vi++
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

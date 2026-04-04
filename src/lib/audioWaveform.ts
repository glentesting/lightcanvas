/**
 * Decode audio with Web Audio API and build normalized peak envelopes (0–1) for visualization.
 */
export async function decodeAudioToPeaks(arrayBuffer: ArrayBuffer, barCount = 128): Promise<number[]> {
  const ctx = new AudioContext()
  try {
    const audioBuffer = await ctx.decodeAudioData(arrayBuffer.slice(0))
    return peaksFromAudioBuffer(audioBuffer, barCount)
  } finally {
    void ctx.close()
  }
}

function peaksFromAudioBuffer(audioBuffer: AudioBuffer, barCount: number): number[] {
  const { length, numberOfChannels } = audioBuffer
  if (length === 0 || numberOfChannels === 0) {
    return Array.from({ length: barCount }, () => 0)
  }

  const mix = new Float32Array(length)
  for (let c = 0; c < numberOfChannels; c++) {
    const ch = audioBuffer.getChannelData(c)
    for (let i = 0; i < length; i++) {
      mix[i] += ch[i] / numberOfChannels
    }
  }

  const samplesPerBar = Math.max(1, Math.floor(length / barCount))
  const peaks: number[] = []

  for (let b = 0; b < barCount; b++) {
    const start = b * samplesPerBar
    const end = Math.min(start + samplesPerBar, length)
    let max = 0
    for (let i = start; i < end; i++) {
      const v = Math.abs(mix[i] ?? 0)
      if (v > max) max = v
    }
    peaks.push(max)
  }

  const peakMax = Math.max(...peaks, 1e-8)
  return peaks.map((p) => p / peakMax)
}

export async function loadWaveformPeaksFromUrl(signedUrl: string, barCount = 128): Promise<number[]> {
  const res = await fetch(signedUrl)
  if (!res.ok) {
    throw new Error(`Failed to download audio (${res.status})`)
  }
  const buf = await res.arrayBuffer()
  return decodeAudioToPeaks(buf, barCount)
}

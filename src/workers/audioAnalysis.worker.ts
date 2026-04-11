import { analyzeRawAudio } from '../lib/audioAnalysis'

self.onmessage = (e: MessageEvent) => {
  const { type, channelData, sampleRate, duration } = e.data
  if (type !== 'analyze') return
  try {
    const result = analyzeRawAudio(channelData, sampleRate, duration)
    self.postMessage({ type: 'result', result })
  } catch (err) {
    self.postMessage({
      type: 'error',
      message: err instanceof Error ? err.message : 'Analysis failed',
    })
  }
}

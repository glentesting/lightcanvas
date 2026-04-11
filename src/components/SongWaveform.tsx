import { useEffect, useState } from 'react'
import type { Song } from '../types/song'
import { loadWaveformPeaksFromUrl } from '../lib/audioWaveform'
import { getSongAudioSignedUrl } from '../lib/phase1Repository'

const BAR_COUNT = 140

export function SongWaveform({ song, compact, height }: { song: Song; compact?: boolean; height?: number }) {
  const [peaks, setPeaks] = useState<number[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    if (!song.storagePath || !song.storageBucket) {
      setPeaks(null)
      setErr(null)
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)
    setErr(null)
    setPeaks(null)

    void (async () => {
      try {
        const url = await getSongAudioSignedUrl(song)
        if (!url) throw new Error('Could not get audio URL')
        const p = await loadWaveformPeaksFromUrl(url, BAR_COUNT)
        if (!cancelled) setPeaks(p)
      } catch (e) {
        if (!cancelled) setErr(e instanceof Error ? e.message : 'Waveform failed')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [song.id, song.storagePath, song.storageBucket])

  const h = height ?? 128
  const hClass = height ? '' : 'h-32'
  const hStyle = height ? { height: h } : undefined
  const borderClass = compact ? '' : 'rounded-xl border border-zinc-800'
  const padClass = compact ? 'px-1 py-0.5' : 'p-3'

  if (!song.storagePath || !song.storageBucket) {
    return (
      <div
        className={`flex items-center justify-center ${borderClass} ${compact ? '' : 'border-dashed border-zinc-700'} bg-zinc-900 px-4 text-center text-sm text-zinc-400 ${hClass}`}
        style={hStyle}
      >
        {compact ? '' : 'No uploaded audio file for this track — waveform appears after you add a file from Song Library.'}
      </div>
    )
  }

  if (loading) {
    return (
      <div
        className={`flex items-center justify-center ${borderClass} bg-zinc-900 text-sm text-zinc-400 ${hClass}`}
        style={hStyle}
      >
        {compact ? '…' : 'Decoding waveform…'}
      </div>
    )
  }

  if (err) {
    if (compact) return <div className="h-full bg-zinc-900" style={hStyle} />
    return (
      <div className="rounded-xl border border-brand-red/50 bg-brand-red/10 px-4 py-3 text-sm text-brand-red">
        {err}
      </div>
    )
  }

  if (!peaks?.length) return compact ? <div className="bg-zinc-900" style={hStyle} /> : null

  return (
    <div
      className={`flex items-end gap-px ${borderClass} bg-zinc-900 ${padClass} ${hClass}`}
      style={hStyle}
    >
      {peaks.map((p, i) => (
        <div
          key={i}
          className="min-w-px flex-1 rounded-full bg-brand-green/90"
          style={{ height: `${Math.max(3, p * 100)}%` }}
        />
      ))}
    </div>
  )
}

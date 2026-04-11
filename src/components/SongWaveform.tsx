import { useEffect, useState } from 'react'
import type { Song } from '../types/song'
import { loadWaveformPeaksFromUrl } from '../lib/audioWaveform'
import { getSongAudioSignedUrl } from '../lib/phase1Repository'

const BAR_COUNT = 140

export function SongWaveform({ song }: { song: Song }) {
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

  if (!song.storagePath || !song.storageBucket) {
    return (
      <div className="flex h-32 items-center justify-center rounded-xl border border-dashed border-zinc-700 bg-zinc-900 px-4 text-center text-sm text-zinc-400">
        No uploaded audio file for this track — waveform appears after you add a file from Song Library.
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex h-32 items-center justify-center rounded-xl bg-zinc-900 text-sm text-zinc-400">
        Decoding waveform…
      </div>
    )
  }

  if (err) {
    return (
      <div className="rounded-xl border border-brand-red/50 bg-brand-red/10 px-4 py-3 text-sm text-brand-red">
        {err}
      </div>
    )
  }

  if (!peaks?.length) return null

  return (
    <div className="flex h-32 items-end gap-px rounded-xl border border-zinc-800 bg-zinc-900 p-3">
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

import { motion } from 'framer-motion'
import { AudioLines, Music4, Trash2, Upload } from 'lucide-react'
import type { ChangeEvent, ComponentType, MouseEvent, RefObject } from 'react'
import type { SongAudioAnalysis } from '../../../lib/audioAnalysis'
import type { Song } from '../../../types/song'
import { SongWaveform } from '../../SongWaveform'
import { formatTime } from '../utils'
import { Button } from '../shared/Button'
import { Card } from '../shared/Card'
import { CardHeader } from '../shared/CardHeader'
import { Stat } from '../shared/Stat'

export interface SongsWorkspaceProps {
  songs: Song[]
  selectedSong: Song
  selectedSongId: string | null
  setSelectedSongId: (id: string) => void
  songFileInputRef: RefObject<HTMLInputElement | null>
  handleSongFileChange: (e: ChangeEvent<HTMLInputElement>) => void
  triggerSongFilePicker: () => void
  songUploading: boolean
  songUploadError: string | null
  songDeleteError: string | null
  handleDeleteSong: (song: Song, ev: MouseEvent) => void | Promise<void>
  songAnalyses: Record<string, SongAudioAnalysis>
  analysisItems: [string, string, string][]
  SongLibraryInlineAudio: ComponentType<{ song: Song }>
  SongWorkspaceAudio: ComponentType<{ song: Song }>
  AnalysisBeatStrip: ComponentType<{ beatTimes: number[]; duration: number }>
  AnalysisBandRows: ComponentType<Pick<SongAudioAnalysis, 'bassSeries' | 'trebleSeries' | 'vocalSeries'>>
}

export function SongsWorkspace({
  songs,
  selectedSong,
  selectedSongId,
  setSelectedSongId,
  songFileInputRef,
  handleSongFileChange,
  triggerSongFilePicker,
  songUploading,
  songUploadError,
  songDeleteError,
  handleDeleteSong,
  songAnalyses,
  analysisItems,
  SongLibraryInlineAudio,
  SongWorkspaceAudio,
  AnalysisBeatStrip,
  AnalysisBandRows,
}: SongsWorkspaceProps) {
  return (
    <motion.div
      key="songs"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      className="flex w-full min-w-0 max-w-full flex-col gap-6"
    >
      <Card className="w-full min-w-0">
        <CardHeader
          title="Song Library"
          description="Per-song workspaces with fake ingest and analysis readiness."
          icon={Music4}
        />
        <div className="space-y-4 p-6">
          <input
            ref={songFileInputRef}
            type="file"
            accept="audio/mpeg,audio/mp3,audio/wav,audio/x-wav,audio/mp4,audio/x-m4a,audio/*"
            className="hidden"
            onChange={(e) => void handleSongFileChange(e)}
          />
          <div className="rounded-2xl border-2 border-dashed border-brand-green/35 bg-brand-green/5 p-6 text-center">
            <Upload className="mx-auto h-8 w-8 text-brand-green" />
            <div className="mt-3 font-medium text-slate-900">Upload a song</div>
            <div className="mt-1 text-sm text-slate-600">
              Choose an MP3 or other audio file from your computer. It is stored in your Supabase bucket
              and linked from your library.
            </div>
            <div className="mt-4">
              <Button disabled={songUploading} onClick={triggerSongFilePicker}>
                {songUploading ? 'Uploading…' : 'Choose audio file'}
              </Button>
            </div>
            {songUploadError ? (
              <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
                {songUploadError}
              </div>
            ) : null}
            {songDeleteError ? (
              <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
                {songDeleteError}
              </div>
            ) : null}
          </div>
          <div className="space-y-3">
            {songs.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-600">
                No songs in your library yet. Upload an audio file above — it will be saved to your
                account.
              </div>
            ) : (
              songs.map((song) => (
                <div
                  key={song.id}
                  className={`flex items-stretch overflow-hidden rounded-2xl border transition ${
                    selectedSongId === song.id
                      ? 'border-brand-green bg-brand-green/5 ring-1 ring-brand-green/25'
                      : 'border-slate-200 bg-white hover:bg-slate-50'
                  }`}
                >
                  <button
                    type="button"
                    className="min-w-0 flex-1 p-4 text-left"
                    onClick={() => setSelectedSongId(song.id)}
                  >
                    <div className="flex min-w-0 items-center justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-medium leading-snug text-slate-900" title={song.title}>
                          {song.title}
                        </div>
                        <div className="mt-1 text-sm leading-relaxed text-slate-500">
                          {song.originalFilename ? (
                            <span className="line-clamp-2 block" title={song.originalFilename}>
                              {song.originalFilename}
                            </span>
                          ) : null}
                          <span
                            className="mt-0.5 block truncate text-slate-500"
                            title={`${formatTime(song.duration)} · ${song.bpm != null ? `${song.bpm} BPM` : '— BPM'} · ${song.key}`}
                          >
                            {formatTime(song.duration)} · {song.bpm != null ? `${song.bpm} BPM` : '— BPM'} ·{' '}
                            {song.key}
                          </span>
                        </div>
                      </div>
                      <div className="shrink-0 rounded-full bg-brand-red px-3 py-1 text-xs whitespace-nowrap text-white shadow-brand-red-soft">
                        {song.status}
                      </div>
                    </div>
                  </button>
                  <div className="flex min-w-0 max-w-full flex-col items-stretch justify-center gap-2 border-l border-slate-200 bg-white/80 px-2 py-2 sm:min-w-[200px] sm:max-w-[min(320px,42vw)]">
                    {song.storagePath ? (
                      <div className="min-w-0" onClick={(e) => e.stopPropagation()}>
                        <SongLibraryInlineAudio song={song} />
                      </div>
                    ) : null}
                    <Button
                      variant="ghost"
                      className="shrink-0 self-end px-3 text-brand-red hover:bg-red-50"
                      aria-label={`Delete ${song.title}`}
                      onClick={(e) => void handleDeleteSong(song, e)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </Card>
      <Card className="w-full min-w-0">
        <CardHeader
          title="Selected Song Workspace"
          description="Deeper fake analysis metadata to show scope."
          icon={AudioLines}
        />
        <div className="space-y-6 p-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Stat
              label="Track"
              value={selectedSong.title.replace(/\.(mp3|wav|m4a)$/i, '')}
              sub="Current workspace"
              valueTruncate
            />
            <Stat label="Duration" value={formatTime(selectedSong.duration)} sub="Sequence length" />
            <Stat
              label="Tempo"
              value={selectedSong.bpm != null ? selectedSong.bpm : '—'}
              sub={selectedSong.key}
            />
            <Stat label="Energy" value={selectedSong.energy} sub="Overall feel" />
          </div>
          {selectedSong.originalFilename ? (
            <p className="text-sm text-slate-600">
              <span className="font-medium text-brand-green">Original file:</span> {selectedSong.originalFilename}
            </p>
          ) : null}
          {selectedSong.storagePath && selectedSong.storageBucket ? (
            <p className="break-all text-xs text-slate-500">
              Storage:{' '}
              <code className="rounded bg-slate-100 px-1 py-0.5">
                {selectedSong.storageBucket}/{selectedSong.storagePath}
              </code>
            </p>
          ) : null}
          <SongWorkspaceAudio song={selectedSong} />
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <div className="text-sm font-medium text-brand-green">Amplitude waveform</div>
            <div className="mt-1 text-sm text-slate-500">
              Built from your uploaded file: the audio is fetched, decoded with the Web Audio API, and
              peaks are shown across the timeline.
            </div>
            <div className="mt-4">
              <SongWaveform song={selectedSong} />
            </div>
          </div>
          {songAnalyses[selectedSong.id] ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="text-sm font-medium text-slate-900">
                Real audio analysis (Web Audio · last Rebuild)
              </div>
              <p className="mt-1 text-xs text-slate-500">
                Tempo {songAnalyses[selectedSong.id].bpm} BPM · beat times, band envelopes, and sections
                derived from the decoded file.
              </p>
              <AnalysisBeatStrip
                beatTimes={songAnalyses[selectedSong.id].beatTimes}
                duration={selectedSong.duration}
              />
              <div className="mt-5">
                <AnalysisBandRows
                  bassSeries={songAnalyses[selectedSong.id].bassSeries}
                  trebleSeries={songAnalyses[selectedSong.id].trebleSeries}
                  vocalSeries={songAnalyses[selectedSong.id].vocalSeries}
                />
              </div>
              <div className="mt-5">
                <div className="mb-2 text-xs font-medium text-slate-600">Sections (energy-based)</div>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {songAnalyses[selectedSong.id].sections.map((s) => (
                    <div
                      key={`${s.name}-${s.start}`}
                      className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm"
                    >
                      <div className="font-medium text-slate-900">{s.name}</div>
                      <div className="mt-1 text-slate-600">
                        {formatTime(s.start)} – {formatTime(s.end)} · energy {s.energy}
                        {s.vocals ? ' · vocals est.' : ''}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : null}
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {analysisItems.map(([title, metric, desc]) => (
              <div
                key={title}
                className="flex min-h-full min-w-0 flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div className="font-medium text-slate-900">{title}</div>
                <div className="mt-2 text-sm font-semibold text-slate-800">{metric}</div>
                <div className="mt-3 flex-1 text-sm leading-relaxed text-slate-600">{desc}</div>
              </div>
            ))}
          </div>
        </div>
      </Card>
    </motion.div>
  )
}

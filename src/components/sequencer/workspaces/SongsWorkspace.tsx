import { useState } from 'react'
import { motion } from 'framer-motion'
import { ChevronDown, Sparkles, Trash2, Upload } from 'lucide-react'
import type { ChangeEvent, ComponentType, MouseEvent, RefObject } from 'react'
import type { SongAudioAnalysis } from '../../../lib/audioAnalysis'
import type { Song } from '../../../types/song'
import { SongWaveform } from '../../SongWaveform'
import { Button } from '../shared/Button'
import { PLACEHOLDER_SONG } from '../types'
import { formatTime } from '../utils'

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
  runAudioAnalysis: () => void | Promise<void>
  songAnalysisBusy: boolean
}

const sectionLabel = 'mb-3 block text-xs font-medium uppercase tracking-[0.14em] text-slate-500'

export function SongsWorkspace({
  songs, selectedSong, selectedSongId, setSelectedSongId,
  songFileInputRef, handleSongFileChange, triggerSongFilePicker,
  songUploading, songUploadError, songDeleteError, handleDeleteSong,
  songAnalyses, analysisItems,
  SongLibraryInlineAudio, SongWorkspaceAudio, AnalysisBeatStrip, AnalysisBandRows,
  runAudioAnalysis, songAnalysisBusy,
}: SongsWorkspaceProps) {
  const [analysisOpen, setAnalysisOpen] = useState(true)
  const analysis = songAnalyses[selectedSong.id]

  return (
    <motion.div key="songs" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}
      className="w-full min-w-0 max-w-full space-y-8 rounded-2xl border border-slate-200/90 bg-white p-6 shadow-[0_12px_40px_-16px_rgba(15,23,42,0.1)]">

      <section className="flex flex-col gap-5 rounded-2xl border border-slate-200/90 bg-gradient-to-br from-white to-slate-50/80 p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold tracking-tight text-slate-900">Run AI analysis</h2>
          <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-slate-600">
            Decodes the selected song, detects tempo, beat grid, bass/treble/vocal emphasis, and section boundaries. Results
            power sequencing and the timeline.
          </p>
        </div>
        <Button
          className="shrink-0 px-6 py-3 text-[15px] shadow-brand-soft transition duration-150"
          disabled={
            songAnalysisBusy ||
            selectedSong.id === PLACEHOLDER_SONG.id ||
            !selectedSong.storagePath ||
            !selectedSong.storageBucket
          }
          onClick={() => void runAudioAnalysis()}
        >
          <Sparkles className="h-4 w-4" />
          {songAnalysisBusy ? 'Analyzing…' : 'Run AI analysis'}
        </Button>
      </section>

      <section className="rounded-xl border border-slate-200 bg-slate-50 p-4 md:p-5">
        <h2 className="mb-2 text-sm font-semibold text-slate-900">What this tab is for</h2>
        <p className="text-sm leading-relaxed text-slate-700">
          Upload tracks here. LightCanvas runs <strong>AI-driven audio analysis</strong>—beat grid, bass map, treble map,
          vocal emphasis, and dynamic range—and stores those signals on the song. That analysis is the input to automatic
          sequencing, the AI tab, and the timeline: better analysis means better light timing across your whole display.
        </p>
      </section>

      {/* Upload + Song list */}
      <section>
        <h2 className={sectionLabel}>Song Library</h2>
        <input ref={songFileInputRef} type="file" accept="audio/mpeg,audio/mp3,audio/wav,audio/x-wav,audio/mp4,audio/x-m4a,audio/*" className="hidden" onChange={(e) => void handleSongFileChange(e)} />

        <div className="flex items-center gap-3 border-b border-slate-200 pb-4">
          <button type="button" disabled={songUploading} onClick={triggerSongFilePicker}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-brand-green/60 hover:text-brand-green disabled:opacity-50">
            <Upload className="h-3.5 w-3.5" /> {songUploading ? 'Uploading...' : 'Upload audio file'}
          </button>
          {songUploadError && <span className="text-sm text-brand-red">{songUploadError}</span>}
          {songDeleteError && <span className="text-sm text-brand-red">{songDeleteError}</span>}
        </div>

        <div className="mt-1">
          {songs.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-500">No songs yet. Upload an audio file to get started.</p>
          ) : (
            songs.map((song) => (
              <div key={song.id}
                className={`group flex items-center border-b border-slate-200 last:border-b-0 ${
                  selectedSongId === song.id ? 'border-l-2 border-l-brand-green bg-slate-100' : 'border-l-2 border-l-transparent hover:bg-slate-50'
                }`}>
                <button type="button" className="min-w-0 flex-1 py-3 pl-3 pr-2 text-left" onClick={() => setSelectedSongId(song.id)}>
                  <div className="flex items-center gap-2">
                    <span className={`truncate text-sm ${selectedSongId === song.id ? 'font-semibold text-slate-900' : 'text-slate-700'}`}>{song.title}</span>
                    <span className="shrink-0 rounded bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-700">{song.status}</span>
                  </div>
                  <div className="mt-1 text-xs text-slate-500">
                    {formatTime(song.duration)} · {song.bpm != null ? `${song.bpm} BPM` : '—'} · {song.key}
                  </div>
                </button>
                <div className="flex shrink-0 items-center gap-1 px-2">
                  {song.storagePath && (
                    <div className="min-w-0" onClick={(e) => e.stopPropagation()}><SongLibraryInlineAudio song={song} /></div>
                  )}
                  <button type="button" aria-label={`Delete ${song.title}`}
                    className="p-1.5 text-brand-red transition hover:text-brand-red-dark"
                    onClick={(e) => void handleDeleteSong(song, e)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {/* Selected song details */}
      <section>
        <h2 className={sectionLabel}>Selected Song</h2>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div><div className="text-xs text-slate-500">Track</div><div className="mt-1 truncate text-sm font-medium text-slate-900">{selectedSong.title.replace(/\.(mp3|wav|m4a)$/i, '')}</div></div>
            <div><div className="text-xs text-slate-500">Duration</div><div className="mt-1 text-sm font-medium text-slate-900">{formatTime(selectedSong.duration)}</div></div>
            <div><div className="text-xs text-slate-500">Tempo</div><div className="mt-1 text-sm font-medium text-slate-900">{selectedSong.bpm ?? '—'} BPM · {selectedSong.key}</div></div>
            <div><div className="text-xs text-slate-500">Energy</div><div className="mt-1 text-sm font-medium text-slate-900">{selectedSong.energy}</div></div>
          </div>

          <SongWorkspaceAudio song={selectedSong} />

          {/* Waveform — full width */}
          <div className="-mx-5 w-[calc(100%+2.5rem)] px-5">
            <div className="text-xs font-medium uppercase tracking-wide text-slate-500">Waveform</div>
            <div className="mt-2 w-full min-w-0">
              <SongWaveform song={selectedSong} />
            </div>
          </div>

          {/* Analysis — collapsible */}
          {analysis && (
            <div className="border-t border-slate-200 pt-4">
              <button type="button" onClick={() => setAnalysisOpen((o) => !o)}
                className="flex w-full items-center justify-between text-left text-xs font-medium uppercase tracking-[0.12em] text-slate-500 hover:text-slate-900">
                Audio Analysis · {analysis.bpm} BPM · {analysis.beatTimes.length} beats
                <ChevronDown className={`h-3.5 w-3.5 transition-transform ${analysisOpen ? 'rotate-180' : ''}`} />
              </button>
              {analysisOpen && (
                <div className="mt-3 space-y-4">
                  <AnalysisBeatStrip beatTimes={analysis.beatTimes} duration={selectedSong.duration} />
                  <AnalysisBandRows bassSeries={analysis.bassSeries} trebleSeries={analysis.trebleSeries} vocalSeries={analysis.vocalSeries} />
                  <div>
                    <div className="mb-1.5 text-xs text-slate-500">Sections</div>
                    <div className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
                      {analysis.sections.map((s) => (
                        <div key={`${s.name}-${s.start}`} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">
                          <span className="font-medium text-slate-900">{s.name}</span> · {formatTime(s.start)}–{formatTime(s.end)} · energy {s.energy}{s.vocals ? ' · vocals' : ''}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Analysis metrics — drives sequencing */}
          <div>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-slate-600">
              Analysis outputs (feed the sequencing engine)
            </h3>
            <div className="grid grid-cols-1 gap-3 border-t border-slate-200 pt-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
              {analysisItems.map(([title, metric, desc]) => (
                <div key={title} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <div className="text-xs font-medium text-slate-800">{title}</div>
                  <div className="mt-1 text-base font-semibold tabular-nums text-slate-900">{metric}</div>
                  <div className="mt-2 text-xs leading-snug text-slate-600">{desc}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </motion.div>
  )
}

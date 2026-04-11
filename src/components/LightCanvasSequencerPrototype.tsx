import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type MouseEvent,
} from 'react'
import { useAuth } from '../contexts/AuthContext'
import {
  analyzeAudioBuffer,
  minimalSongAudioAnalysisFromPersisted,
  type SongAudioAnalysis,
} from '../lib/audioAnalysis'
import { CopilotApiUnavailableError, requestCopilotApply } from '../lib/copilotApplyApi'
import { mapClaudeEventsToTimeline, requestClaudeSequence } from '../lib/generateSequenceApi'
import { getAudioDurationFromFile } from '../lib/getAudioDurationFromFile'
import {
  deleteSongFromLibrary,
  getOrCreateDisplayProfile,
  getSongAudioSignedUrl,
  loadSongs,
  persistDisplayProfile,
  persistSongAudioAnalysis,
  updateProfilePhotoUrl,
  updateSongStatus,
  uploadSongFromFile,
} from '../lib/phase1Repository'
import { supabase } from '../lib/supabaseClient'
import type { DisplayProp } from '../types/display'
import type { Song, SongSectionSnapshot } from '../types/song'
import type { TabValue } from './sequencer/types'
import { getDefaultCanvasPlacementForPropType, type HouseTemplateId } from './HouseTemplates'
import { SequencerShell } from './sequencer/SequencerShell'

const effectOptions = [
  'Mouth Sync',
  'Pulse',
  'Sweep',
  'Twinkle',
  'Chase',
  'Hold',
  'Color Pop',
  'Shimmer',
  'Fan',
  'Ripple',
]

interface Section {
  name: string
  start: number
  end: number
  energy: number
  vocals: boolean
}

interface TimelineEvent {
  id: string
  propId: string
  propName: string
  section: string
  start: number
  end: number
  intensity: number
  smoothness: number
  effect: string
  note: string
}

interface ChatMessage {
  id: number
  role: 'user' | 'assistant'
  text: string
}

/** Used when the user has no songs yet so timeline math still runs. */
const PLACEHOLDER_SONG: Song = {
  id: '__none__',
  title: 'No songs yet',
  duration: 180,
  bpm: 120,
  key: '—',
  energy: '—',
  status: '—',
  analysis: { beat: 0, bass: 0, treble: 0, vocals: 0, dynamics: 0 },
}

function buildSections(duration: number): Section[] {
  const raw: [string, number, number, boolean][] = [
    ['Intro', 0.12, 24, false],
    ['Verse 1', 0.2, 48, true],
    ['Pre-Chorus', 0.12, 63, true],
    ['Chorus', 0.18, 89, true],
    ['Breakdown', 0.12, 41, false],
    ['Verse 2', 0.14, 58, true],
    ['Finale', 0.12, 100, true],
  ]
  let cursor = 0
  return raw.map((item, i) => {
    const [name, ratio, energy, vocals] = item
    const len =
      i === raw.length - 1 ? duration - cursor : Math.max(8, Math.round(duration * ratio))
    const start = cursor
    const end = Math.min(duration, cursor + len)
    cursor = end
    return { name, start, end, energy, vocals }
  })
}

function buildEvents(
  displayProps: DisplayProp[],
  complexity: number,
  sections: Section[],
): TimelineEvent[] {
  const events: TimelineEvent[] = []
  displayProps.forEach((prop, pIndex) => {
    sections.forEach((section, sIndex) => {
      const chunk = Math.max(
        4,
        Math.round((section.end - section.start) / (complexity > 70 ? 3 : 2)),
      )
      let cursor = section.start
      while (cursor < section.end) {
        const end = Math.min(section.end, cursor + chunk)
        let effect = 'Hold'
        if (prop.type === 'Talking Face') effect = section.vocals ? 'Mouth Sync' : 'Hold'
        else if (prop.type === 'Mega Tree') effect = section.energy >= 80 ? 'Sweep' : 'Twinkle'
        else if (prop.type === 'Ground Stakes')
          effect = section.energy >= 60 ? 'Pulse' : 'Color Pop'
        else if (prop.type === 'Roofline') effect = section.energy >= 80 ? 'Chase' : 'Shimmer'
        else effect = effectOptions[(pIndex + sIndex) % effectOptions.length] ?? 'Hold'
        events.push({
          id: `${prop.id}-${cursor}-${end}`,
          propId: prop.id,
          propName: prop.name,
          section: section.name,
          start: cursor,
          end,
          intensity: Math.min(100, Math.round(section.energy * 0.72 + complexity * 0.28)),
          smoothness:
            prop.type === 'Talking Face' ? 82 : prop.type === 'Ground Stakes' ? 34 : 58,
          effect,
          note:
            prop.type === 'Talking Face'
              ? section.vocals
                ? 'Fake phoneme pass anchors mouth-open / mouth-closed states.'
                : 'Face held idle while instrumental section plays.'
              : prop.type === 'Mega Tree'
                ? 'Pattern density rises with phrase intensity and section lift.'
                : prop.type === 'Ground Stakes'
                  ? 'Pulse grouping follows bass transient clusters.'
                  : 'Accent behavior follows high-level phrase boundaries.',
        })
        cursor = end
      }
    })
  })
  return events
}

function resolveSectionsForSequence(
  song: Song,
  analyses: Record<string, SongAudioAnalysis>,
): Section[] {
  const fromAnalysis = analyses[song.id]?.sections
  if (fromAnalysis?.length) {
    return fromAnalysis.map((s) => ({
      name: s.name,
      start: s.start,
      end: s.end,
      energy: s.energy,
      vocals: s.vocals,
    }))
  }
  if (song.persistedSections?.length) {
    return song.persistedSections.map((s) => ({
      name: s.name,
      start: s.start,
      end: s.end,
      energy: s.energy,
      vocals: s.vocals,
    }))
  }
  return buildSections(song.duration)
}

function AnalysisBeatStrip({ beatTimes, duration }: { beatTimes: number[]; duration: number }) {
  const cap = 200
  const beats = beatTimes.slice(0, cap)
  const d = Math.max(duration, 0.001)
  return (
    <div className="mt-1">
      <div className="mb-2 text-xs font-medium text-slate-600">
        Beat grid ({beatTimes.length} beats · first {beats.length} shown)
      </div>
      <div className="relative h-8 w-full overflow-hidden rounded-xl bg-slate-100">
        {beats.map((t, i) => (
          <div
            key={i}
            className="absolute bottom-0 top-0 w-px bg-brand-green/90"
            style={{ left: `${(t / d) * 100}%` }}
          />
        ))}
      </div>
    </div>
  )
}

function AnalysisBandRows({
  bassSeries,
  trebleSeries,
  vocalSeries,
}: Pick<SongAudioAnalysis, 'bassSeries' | 'trebleSeries' | 'vocalSeries'>) {
  const rows: [string, number[]][] = [
    ['Bass energy over time', bassSeries],
    ['Treble energy over time', trebleSeries],
    ['Vocal presence (estimate)', vocalSeries],
  ]
  return (
    <div className="space-y-4">
      {rows.map(([label, series]) => (
        <div key={label}>
          <div className="mb-1.5 text-xs font-medium text-slate-600">{label}</div>
          <div className="flex h-12 w-full items-end gap-px rounded-xl bg-slate-100 p-1.5">
            {series.map((v, i) => (
              <div
                key={i}
                className="min-w-px flex-1 rounded-sm bg-brand-green/85"
                style={{ height: `${Math.max(6, v * 100)}%` }}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

function SongWorkspaceAudio({ song }: { song: Song }) {
  const [src, setSrc] = useState<string | null>(null)

  useEffect(() => {
    if (!song.storagePath) {
      setSrc(null)
      return
    }
    let cancelled = false
    void getSongAudioSignedUrl(song).then((url) => {
      if (!cancelled) setSrc(url)
    })
    return () => {
      cancelled = true
    }
  }, [song.id, song.storagePath, song.storageBucket])

  if (!song.storagePath) return null
  if (!src) {
    return <p className="text-sm text-slate-500">Preparing audio preview…</p>
  }
  return <audio controls className="mt-3 w-full max-w-xl rounded-xl" src={src} />
}

/** Inline player for Song Library rows — same signed URL as workspace preview, no new tab. */
function SongLibraryInlineAudio({ song }: { song: Song }) {
  const [src, setSrc] = useState<string | null>(null)

  useEffect(() => {
    if (!song.storagePath) {
      setSrc(null)
      return
    }
    let cancelled = false
    void getSongAudioSignedUrl(song).then((url) => {
      if (!cancelled) setSrc(url ?? null)
    })
    return () => {
      cancelled = true
    }
  }, [song.id, song.storagePath, song.storageBucket])

  if (!song.storagePath) return null
  if (!src) {
    return (
      <span className="block px-1 text-center text-xs text-slate-500 whitespace-nowrap">
        Loading…
      </span>
    )
  }
  return (
    <audio
      controls
      preload="metadata"
      className="w-full min-w-[180px] max-w-[min(280px,50vw)]"
      src={src}
    />
  )
}

export default function LightCanvasSequencerPrototype() {
  const { user, signOut } = useAuth()
  const [activeTab, setActiveTab] = useState<TabValue>('setup')
  const [controllers, setControllers] = useState(3)
  const [channelsPerController, setChannelsPerController] = useState(16)
  const [propsState, setPropsState] = useState<DisplayProp[]>([])
  const undoStackRef = useRef<DisplayProp[][]>([])
  const pushUndo = () => {
    undoStackRef.current = [...undoStackRef.current.slice(-19), propsState]
  }
  const undo = useCallback(() => {
    const stack = undoStackRef.current
    if (stack.length === 0) return
    const prev = stack[stack.length - 1]
    undoStackRef.current = stack.slice(0, -1)
    setPropsState(prev)
  }, [])
  const canUndo = undoStackRef.current.length > 0
  const [displayHouseType, setDisplayHouseType] = useState<HouseTemplateId>('two-story')
  const [timelineSongId, setTimelineSongId] = useState<string | null>(null)
  const [timelineSequenceSource, setTimelineSequenceSource] = useState<'formula' | 'stored'>('stored')
  const [songAnalysisBusy, setSongAnalysisBusy] = useState(false)
  const [profileId, setProfileId] = useState<string | null>(null)
  const [photoUrl, setPhotoUrl] = useState<string | null>(null)
  const [displayConfigReady, setDisplayConfigReady] = useState(false)
  const [songs, setSongs] = useState<Song[]>([])
  const [selectedSongId, setSelectedSongId] = useState<string | null>(null)
  const [analysisProgress, setAnalysisProgress] = useState(91)
  const [playing, setPlaying] = useState(false)
  const [complexity, setComplexity] = useState(62)
  const [selectedPropId, setSelectedPropId] = useState<string | null>(null)
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null)
  const [newPropName, setNewPropName] = useState('')
  const [newPropType, setNewPropType] = useState('Smart Pixel')
  const [newPropChannels, setNewPropChannels] = useState(8)
  const songFileInputRef = useRef<HTMLInputElement>(null)
  const [songUploadError, setSongUploadError] = useState<string | null>(null)
  const [songUploading, setSongUploading] = useState(false)
  const [songDeleteError, setSongDeleteError] = useState<string | null>(null)
  const [songAnalyses, setSongAnalyses] = useState<Record<string, SongAudioAnalysis>>({})
  const [rebuildAnalyzing, setRebuildAnalyzing] = useState(false)
  const [rebuildPhase, setRebuildPhase] = useState<'idle' | 'decode' | 'sequence'>('idle')
  const [sequenceEventsBySong, setSequenceEventsBySong] = useState<Record<string, TimelineEvent[]>>(
    {},
  )

  const [previewTime, setPreviewTime] = useState(0)
  const [copilotBusy, setCopilotBusy] = useState(false)
  const [chatInput, setChatInput] = useState('')
  const [chat, setChat] = useState<ChatMessage[]>([
    {
      id: 1,
      role: 'assistant',
      text: 'Ask for changes in plain English — for example, “make the finale bigger” or “clean up the face track.”',
    },
  ])

  const selectedSong =
    songs.find((s) => s.id === selectedSongId) ?? songs[0] ?? PLACEHOLDER_SONG
  const sections = useMemo((): Section[] => {
    const stored = songAnalyses[selectedSong.id]?.sections
    if (stored?.length) {
      return stored.map((s) => ({
        name: s.name,
        start: s.start,
        end: s.end,
        energy: s.energy,
        vocals: s.vocals,
      }))
    }
    return buildSections(selectedSong.duration)
  }, [selectedSong.id, selectedSong.duration, songAnalyses])
  const formulaEvents = useMemo(
    () => buildEvents(propsState, complexity, sections),
    [propsState, complexity, sections],
  )

  const claudeEventsForSong = sequenceEventsBySong[selectedSong.id]
  const events = useMemo((): TimelineEvent[] => {
    if (claudeEventsForSong?.length) return claudeEventsForSong
    return formulaEvents
  }, [claudeEventsForSong, formulaEvents])

  const timelineSong = useMemo(() => {
    const id = timelineSongId ?? selectedSongId
    return songs.find((s) => s.id === id) ?? selectedSong
  }, [songs, timelineSongId, selectedSongId, selectedSong])

  const sectionsTimeline = useMemo(
    () => resolveSectionsForSequence(timelineSong, songAnalyses),
    [timelineSong, songAnalyses],
  )

  const formulaTimelineEvents = useMemo(
    () => buildEvents(propsState, complexity, sectionsTimeline),
    [propsState, complexity, sectionsTimeline],
  )

  const storedTimeline = sequenceEventsBySong[timelineSong.id]
  const timelineEvents = useMemo((): TimelineEvent[] => {
    if (timelineSequenceSource === 'stored' && storedTimeline?.length) return storedTimeline
    return formulaTimelineEvents
  }, [timelineSequenceSource, storedTimeline, formulaTimelineEvents])

  const displayEvents = activeTab === 'timeline' ? timelineEvents : events

  const patchTimelineEvent = useCallback(
    (id: string, patch: Partial<TimelineEvent>) => {
      const sid = timelineSong.id
      setSequenceEventsBySong((prev) => {
        const sections = resolveSectionsForSequence(timelineSong, songAnalyses)
        const formula = buildEvents(propsState, complexity, sections)
        const useStored = timelineSequenceSource === 'stored' && prev[sid]?.length
        const base = useStored ? prev[sid]! : formula
        const next = base.map((e) => (e.id === id ? { ...e, ...patch } : e))
        return { ...prev, [sid]: next }
      })
    },
    [timelineSong, songAnalyses, propsState, complexity, timelineSequenceSource],
  )

  const selectedProp =
    propsState.length === 0
      ? undefined
      : (propsState.find((p) => p.id === selectedPropId) ?? propsState[0])
  const propEvents = displayEvents.filter((e) => e.propId === selectedProp?.id)
  const selectedEvent =
    displayEvents.find((e) => e.id === selectedEventId) ?? propEvents[0] ?? null
  const totalChannels = controllers * channelsPerController
  const usedChannels = propsState.reduce((sum, p) => sum + p.channels, 0)
  const remainingChannels = totalChannels - usedChannels

  // Ctrl+Z undo
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        const tag = (e.target as HTMLElement)?.tagName?.toLowerCase()
        if (tag === 'input' || tag === 'textarea' || tag === 'select') return
        e.preventDefault()
        undo()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [undo])

  useEffect(() => {
    if (!playing) return
    const dur = Math.max(0.001, selectedSong.duration)
    const t0 = performance.now()
    let raf = 0
    const tick = () => {
      setPreviewTime(((performance.now() - t0) / 1000) % dur)
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [playing, selectedSong.duration])

  useEffect(() => {
    const uid = user?.id
    if (!uid || !supabase) {
      setDisplayConfigReady(true)
      setProfileId(null)
      setPropsState([])
      setSongs([])
      return
    }

    let cancelled = false
    setDisplayConfigReady(false)
    setProfileId(null)

    void (async () => {
      try {
        const profile = await getOrCreateDisplayProfile(uid)
        if (cancelled) return
        setProfileId(profile.id)
        setControllers(profile.controllers)
        setChannelsPerController(profile.channels_per_controller)
        setPhotoUrl(profile.photo_url)

        setPropsState([])

        const songList = await loadSongs(uid)
        if (cancelled) return
        setSongs(songList)
      } catch (err) {
        console.error('Failed to load workspace from Supabase', err)
      } finally {
        if (!cancelled) setDisplayConfigReady(true)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [user?.id])

  useEffect(() => {
    if (propsState.length === 0) {
      setSelectedPropId(null)
      return
    }
    setSelectedPropId((cur) =>
      cur != null && propsState.some((p) => p.id === cur) ? cur : propsState[0].id,
    )
  }, [propsState])

  useEffect(() => {
    if (songs.length === 0) {
      setSelectedSongId(null)
      return
    }
    setSelectedSongId((cur) =>
      cur != null && songs.some((s) => s.id === cur) ? cur : songs[0].id,
    )
  }, [songs])

  /** Hydrate in-memory analysis from Supabase when a row has saved metrics (skip replacing a fresh decode). */
  useEffect(() => {
    setSongAnalyses((prev) => {
      const next = { ...prev }
      for (const s of songs) {
        if (!s.analysisSaved) continue
        const existing = next[s.id]
        if (existing && existing.beatTimes.length > 0) continue
        const sectionSource: SongSectionSnapshot[] = s.persistedSections?.length
          ? s.persistedSections
          : buildSections(s.duration)
        const sectionsForAnalysis = sectionSource.map((sec) => ({
          name: sec.name,
          start: sec.start,
          end: sec.end,
          energy: sec.energy,
          vocals: sec.vocals,
        }))
        const bpmVal = s.bpm ?? 120
        next[s.id] = minimalSongAudioAnalysisFromPersisted(s.analysis, bpmVal, sectionsForAnalysis)
      }
      return next
    })
  }, [songs])

  useEffect(() => {
    if (selectedSong.id === PLACEHOLDER_SONG.id) {
      setAnalysisProgress(91)
      return
    }
    if (selectedSong.analysisSaved) setAnalysisProgress(100)
    else setAnalysisProgress(26)
  }, [selectedSong.id, selectedSong.analysisSaved])

  useEffect(() => {
    if (!user?.id || !supabase || !displayConfigReady || !profileId) return

    const handle = window.setTimeout(() => {
      void persistDisplayProfile(profileId, {
        controllers,
        channels_per_controller: channelsPerController,
        props: propsState,
      }).then(({ error }) => {
        if (error) console.error('Failed to save display profile', error)
      })
    }, 400)

    return () => window.clearTimeout(handle)
  }, [
    user?.id,
    displayConfigReady,
    profileId,
    controllers,
    channelsPerController,
    propsState,
  ])

  useEffect(() => {
    if (propEvents.length === 0) return
    const stillValid = propEvents.some((e) => e.id === selectedEventId)
    if (!stillValid) {
      setSelectedEventId(propEvents[0]?.id ?? null)
    }
  }, [propEvents, selectedEventId])

  const addProp = () => {
    if (!newPropName.trim()) return
    pushUndo()
    const nextStart = propsState.length
      ? Math.max(...propsState.map((p) => p.start + p.channels))
      : 1
    const controllerIndex = (propsState.length % Math.max(1, controllers)) + 1
    const placement = getDefaultCanvasPlacementForPropType(newPropType, displayHouseType, propsState.length)
    const created: DisplayProp = {
      id: crypto.randomUUID(),
      name: newPropName,
      type: newPropType,
      controller: `Controller ${String.fromCharCode(64 + controllerIndex)}`,
      channels: Number(newPropChannels),
      start: nextStart,
      priority: 'General',
      notes: `Fake detailed mapping note for ${newPropType}. LightCanvas would recommend how this prop behaves during verses, choruses, and finales.`,
      canvasX: placement.canvasX,
      canvasY: placement.canvasY,
      houseType: placement.houseType,
      color: '#ffe8c0',
    }
    setPropsState((prev) => [...prev, created])
    setSelectedPropId(created.id)
    setNewPropName('')
    setNewPropType('Smart Pixel')
    setNewPropChannels(8)
  }

  const quickAddProp = (type: string, x: number, y: number, houseType: string, opts?: { angle?: number; length?: number }) => {
    pushUndo()
    const count = propsState.filter((p) => p.type === type).length + 1
    const name = `${type} ${count}`
    const defaultChannels: Record<string, number> = {
      Roofline: 16, Arches: 8, 'Mini Tree': 4, 'Mega Tree': 16,
      'Talking Face': 8, 'Ground Stakes': 4, Matrix: 16, 'Smart Pixel': 8,
    }
    const channels = defaultChannels[type] ?? 8
    const nextStart = propsState.length
      ? Math.max(...propsState.map((p) => p.start + p.channels))
      : 1
    const controllerIndex = (propsState.length % Math.max(1, controllers)) + 1
    const created: DisplayProp = {
      id: crypto.randomUUID(),
      name,
      type,
      controller: `Controller ${String.fromCharCode(64 + controllerIndex)}`,
      channels,
      start: nextStart,
      priority: 'General',
      notes: '',
      canvasX: x,
      canvasY: y,
      houseType,
      angle: opts?.angle,
      length: opts?.length,
      color: '#ffe8c0',
    }
    setPropsState((prev) => [...prev, created])
    setSelectedPropId(created.id)
  }

  const updatePropColor = (id: string, color: string) => {
    pushUndo()
    setPropsState((prev) => prev.map((p) => (p.id === id ? { ...p, color } : p)))
  }

  const moveProp = (id: string, x: number, y: number) => {
    setPropsState((prev) => prev.map((p) => (p.id === id ? { ...p, canvasX: x, canvasY: y } : p)))
  }

  const resizeProp = (id: string, length: number, angle: number) => {
    setPropsState((prev) => prev.map((p) => (p.id === id ? { ...p, length, angle } : p)))
  }

  const removeProp = (id: string) => {
    pushUndo()
    const remaining = propsState.filter((p) => p.id !== id)
    setPropsState(remaining)
    if (remaining.length === 0) setSelectedPropId(null)
    else if (selectedPropId === id || !remaining.some((p) => p.id === selectedPropId))
      setSelectedPropId(remaining[0].id)
  }

  const triggerSongFilePicker = () => {
    setSongUploadError(null)
    songFileInputRef.current?.click()
  }

  const handleSongFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    const uid = user?.id
    if (!file || !uid || !supabase) return

    const name = file.name.toLowerCase()
    const looksAudio =
      file.type.startsWith('audio/') ||
      name.endsWith('.mp3') ||
      name.endsWith('.wav') ||
      name.endsWith('.m4a')
    if (!looksAudio) {
      setSongUploadError('Please choose an audio file (MP3, WAV, or M4A).')
      return
    }

    setSongUploading(true)
    setSongUploadError(null)
    try {
      const duration = await getAudioDurationFromFile(file)
      const { song, error } = await uploadSongFromFile(uid, file, duration)
      if (error || !song) {
        setSongUploadError(error?.message ?? 'Upload failed.')
        return
      }
      setSongs((prev) => [
        ...prev,
        {
          ...song,
          analysis: { beat: 0, bass: 0, treble: 0, vocals: 0, dynamics: 0 },
        },
      ])
      setSelectedSongId(song.id)
      setAnalysisProgress(26)
      setActiveTab('songs')
    } catch (err) {
      setSongUploadError(err instanceof Error ? err.message : 'Could not read that file.')
    } finally {
      setSongUploading(false)
    }
  }

  useEffect(() => {
    if (activeTab === 'timeline' && selectedSongId) {
      setTimelineSongId((prev) => prev ?? selectedSongId)
    }
  }, [activeTab, selectedSongId])

  const runAudioAnalysis = useCallback(async () => {
    const song = songs.find((s) => s.id === selectedSongId) ?? selectedSong
    if (song.id === PLACEHOLDER_SONG.id) return
    if (!song.storagePath || !song.storageBucket) {
      setSongUploadError('Upload an audio file for this song before running analysis.')
      return
    }
    const sid = song.id
    setSongUploadError(null)
    setSongAnalysisBusy(true)
    setAnalysisProgress(28)
    try {
      const url = await getSongAudioSignedUrl(song)
      if (!url) throw new Error('No audio URL')
      const res = await fetch(url)
      if (!res.ok) throw new Error(`Audio fetch failed (${res.status})`)
      const raw = await res.arrayBuffer()
      const ctx = new AudioContext()
      let decoded: AudioBuffer
      try {
        decoded = await ctx.decodeAudioData(raw.slice(0))
      } finally {
        void ctx.close()
      }
      setAnalysisProgress(72)
      const result = analyzeAudioBuffer(decoded)
      setSongAnalyses((prev) => ({ ...prev, [sid]: result }))
      const persistedSections: SongSectionSnapshot[] = result.sections.map((sec) => ({
        name: sec.name,
        start: sec.start,
        end: sec.end,
        energy: sec.energy,
        vocals: sec.vocals,
      }))
      void persistSongAudioAnalysis(sid, {
        beat_confidence: result.summary.beat,
        bass_strength: result.summary.bass,
        treble_strength: result.summary.treble,
        vocal_confidence: result.summary.vocals,
        dynamics: result.summary.dynamics,
        detected_bpm: result.bpm,
        sections: result.sections,
      }).then(({ error }) => {
        if (error) console.error('persistSongAudioAnalysis', error)
      })
      setSongs((prev) =>
        prev.map((s) =>
          s.id === sid
            ? {
                ...s,
                bpm: result.bpm,
                analysis: result.summary,
                analysisSaved: true,
                persistedSections,
              }
            : s,
        ),
      )
      setAnalysisProgress(100)
    } catch (e) {
      console.error(e)
      setSongUploadError(e instanceof Error ? e.message : 'Analysis failed')
    } finally {
      setSongAnalysisBusy(false)
    }
  }, [songs, selectedSongId, selectedSong])

  const handleDeleteSong = async (song: Song, ev: MouseEvent) => {
    ev.stopPropagation()
    if (!window.confirm(`Remove "${song.title}" from your library? This cannot be undone.`)) return
    setSongDeleteError(null)
    const { error } = await deleteSongFromLibrary(song)
    if (error) {
      setSongDeleteError(error.message)
      return
    }
    setSongs((prev) => prev.filter((s) => s.id !== song.id))
    setSongAnalyses((prev) => {
      const next = { ...prev }
      delete next[song.id]
      return next
    })
    setSequenceEventsBySong((prev) => {
      const next = { ...prev }
      delete next[song.id]
      return next
    })
  }

  const runAi = () => {
    if (selectedSong.id === PLACEHOLDER_SONG.id) {
      console.log('[LightCanvas] runAi: skipped (placeholder song — add a song to the library)')
      return
    }
    const sid = selectedSong.id
    const hasFile = Boolean(selectedSong.storagePath && selectedSong.storageBucket)
    const hasPersistedOrRuntimeAnalysis =
      Boolean(selectedSong.analysisSaved) || Boolean(songAnalyses[sid]?.sections?.length)

    console.log('[LightCanvas] runAi: entry', {
      songId: sid,
      hasFile,
      storagePath: selectedSong.storagePath ?? null,
      storageBucket: selectedSong.storageBucket ?? null,
      analysisSaved: Boolean(selectedSong.analysisSaved),
      songAnalysesHasSections: Boolean(songAnalyses[sid]?.sections?.length),
      hasPersistedOrRuntimeAnalysis,
      propsCount: propsState.length,
    })

    const finishRebuild = (
      analysisPatch: Song['analysis'],
      bpmPatch: number | null | undefined,
      assistantText: string,
      opts?: {
        persistAnalysis?: boolean
        persistedSections?: SongSectionSnapshot[]
      },
    ) => {
      if (opts?.persistAnalysis) {
        void persistSongAudioAnalysis(sid, {
          beat_confidence: analysisPatch.beat,
          bass_strength: analysisPatch.bass,
          treble_strength: analysisPatch.treble,
          vocal_confidence: analysisPatch.vocals,
          dynamics: analysisPatch.dynamics,
          detected_bpm: bpmPatch ?? 120,
          sections: (opts.persistedSections ?? []).map((sec) => ({
            name: sec.name,
            start: sec.start,
            end: sec.end,
            energy: sec.energy,
            vocals: sec.vocals,
          })),
        }).then(({ error }) => {
          if (error) console.error('persistSongAudioAnalysis', error)
        })
      } else {
        void updateSongStatus(sid, { status: 'Ready' }).then(({ error }) => {
          if (error) console.error(error)
        })
      }
      setAnalysisProgress(100)
      setSongs((prev) =>
        prev.map((s) =>
          s.id === sid
            ? {
                ...s,
                status: 'Ready',
                ...(bpmPatch != null ? { bpm: bpmPatch } : {}),
                analysis: analysisPatch,
                ...(opts?.persistAnalysis
                  ? {
                      analysisSaved: true,
                      persistedSections: opts.persistedSections,
                    }
                  : {}),
              }
            : s,
        ),
      )
      setChat((prev) => [
        ...prev,
        { id: Date.now(), role: 'assistant', text: assistantText },
      ])
    }

    const runClaudeForSong = async (
      analysis: Song['analysis'],
      bpm: number,
      sectionList: Section[],
      durationSeconds: number,
    ) => {
      if (propsState.length === 0) {
        console.warn(
          '[LightCanvas] runClaudeForSong: skipped — no display props (Claude API not called). Add props in Display Setup.',
        )
        setChat((prev) => [
          ...prev,
          {
            id: Date.now(),
            role: 'assistant',
            text: 'Add at least one display prop in Display Setup before generating a sequence with Claude.',
          },
        ])
        return
      }
      console.log('[LightCanvas] runClaudeForSong: calling requestClaudeSequence', {
        songId: sid,
        bpm,
        sectionCount: sectionList.length,
        propsCount: propsState.length,
      })
      setRebuildPhase('sequence')
      try {
        const raw = await requestClaudeSequence({
          songDurationSeconds: durationSeconds,
          analysis,
          bpm,
          sections: sectionList,
          props: propsState,
        })
        const mapped = mapClaudeEventsToTimeline(raw, propsState) as TimelineEvent[]
        setSequenceEventsBySong((prev) => ({ ...prev, [sid]: mapped }))
        setChat((prev) => [
          ...prev,
          {
            id: Date.now(),
            role: 'assistant',
            text: `Claude generated ${mapped.length} timeline events from your analysis and display props.`,
          },
        ])
      } catch (e) {
        console.error('Claude sequence failed', e)
        setSequenceEventsBySong((prev) => {
          const next = { ...prev }
          delete next[sid]
          return next
        })
        const msg = e instanceof Error ? e.message : 'Unknown error'
        setChat((prev) => [
          ...prev,
          {
            id: Date.now(),
            role: 'assistant',
            text: `Sequence generation failed (${msg}). Timeline is using the built-in draft until you try again.`,
          },
        ])
      }
    }

    if (!hasFile) {
      console.log(
        '[LightCanvas] runAi: branch = no uploaded audio file — fake rebuild only (Claude not used; needs storagePath + storageBucket)',
      )
      setSequenceEventsBySong((prev) => {
        const next = { ...prev }
        delete next[sid]
        return next
      })
      finishRebuild(
        { beat: 92, bass: 84, treble: 71, vocals: 94, dynamics: 88 },
        undefined,
        'Rebuilt the first-pass sequence. Finale intensity is higher, transitions are smoother, and the talking face now gets cleaner phrase blocks.',
      )
      return
    }

    if (hasPersistedOrRuntimeAnalysis) {
      console.log(
        '[LightCanvas] runAi: branch = existing analysis (saved or in-memory) — Claude only, no audio decode',
      )
      setRebuildAnalyzing(true)
      setRebuildPhase('sequence')
      void (async () => {
        try {
          const sectionList = resolveSectionsForSequence(selectedSong, songAnalyses)
          const bpm = selectedSong.bpm ?? songAnalyses[sid]?.bpm ?? 120
          await runClaudeForSong(selectedSong.analysis, bpm, sectionList, selectedSong.duration)
        } finally {
          setRebuildAnalyzing(false)
          setRebuildPhase('idle')
        }
      })()
      return
    }

    console.log(
      '[LightCanvas] runAi: branch = first-time analysis — will decode audio, persist analysis, then call Claude',
    )
    setRebuildAnalyzing(true)
    setRebuildPhase('decode')
    setAnalysisProgress(40)
    void (async () => {
      try {
        const url = await getSongAudioSignedUrl(selectedSong)
        if (!url) throw new Error('No audio URL')
        const res = await fetch(url)
        if (!res.ok) throw new Error(`Audio fetch failed (${res.status})`)
        const raw = await res.arrayBuffer()
        const ctx = new AudioContext()
        let decoded: AudioBuffer
        try {
          decoded = await ctx.decodeAudioData(raw.slice(0))
        } finally {
          void ctx.close()
        }
        setAnalysisProgress(75)
        const result = analyzeAudioBuffer(decoded)
        setSongAnalyses((prev) => ({ ...prev, [sid]: result }))
        const persistedSections: SongSectionSnapshot[] = result.sections.map((sec) => ({
          name: sec.name,
          start: sec.start,
          end: sec.end,
          energy: sec.energy,
          vocals: sec.vocals,
        }))
        const sectionList: Section[] = result.sections.map((s) => ({
          name: s.name,
          start: s.start,
          end: s.end,
          energy: s.energy,
          vocals: s.vocals,
        }))
        finishRebuild(
          result.summary,
          result.bpm,
          'Analyzed your uploaded audio (tempo, beat grid, bass/treble/vocal bands, dynamics) and section boundaries from energy. Sequence draft updated from those signals.',
          { persistAnalysis: true, persistedSections },
        )
        setRebuildPhase('sequence')
        await runClaudeForSong(result.summary, result.bpm, sectionList, selectedSong.duration)
      } catch (e) {
        console.error('Audio analysis failed', e)
        finishRebuild(
          { beat: 55, bass: 50, treble: 50, vocals: 50, dynamics: 50 },
          selectedSong.bpm,
          'Audio analysis failed (decode or network). Applied a neutral fallback; try Rebuild again or confirm the file in Supabase Storage.',
        )
      } finally {
        setRebuildAnalyzing(false)
        setRebuildPhase('idle')
      }
    })()
  }

  const applyCopilot = async () => {
    if (!chatInput.trim() || copilotBusy) return
    const prompt = chatInput.trim()
    if (selectedSong.id === PLACEHOLDER_SONG.id) {
      setChat((prev) => [
        ...prev,
        { id: Date.now() + 1, role: 'user', text: prompt },
        {
          id: Date.now() + 2,
          role: 'assistant',
          text: 'Add a song to the library first so the copilot can target a real track.',
        },
      ])
      setChatInput('')
      return
    }
    if (propsState.length === 0) {
      setChat((prev) => [
        ...prev,
        { id: Date.now() + 1, role: 'user', text: prompt },
        {
          id: Date.now() + 2,
          role: 'assistant',
          text: 'Add at least one display prop in Display Setup before applying sequence changes.',
        },
      ])
      setChatInput('')
      return
    }

    setCopilotBusy(true)
    try {
      const result = await requestCopilotApply({
        userMessage: prompt,
        complexity,
        songDurationSeconds: selectedSong.duration,
        bpm: selectedSong.bpm ?? 120,
        analysis: selectedSong.analysis,
        sections: sections.map((s) => ({
          name: s.name,
          start: s.start,
          end: s.end,
          energy: s.energy,
          vocals: s.vocals,
        })),
        props: propsState,
        currentEvents: events,
      })
      if (result.set_complexity != null) setComplexity(result.set_complexity)
      if (result.events?.length) {
        const mapped = mapClaudeEventsToTimeline(result.events, propsState)
        setSequenceEventsBySong((prev) => ({ ...prev, [selectedSong.id]: mapped }))
      }
      setChat((prev) => [
        ...prev,
        { id: Date.now() + 1, role: 'user', text: prompt },
        { id: Date.now() + 2, role: 'assistant', text: result.assistant_message },
      ])
      setChatInput('')
    } catch (e) {
      const hint =
        e instanceof CopilotApiUnavailableError
          ? e.message
          : e instanceof Error
            ? e.message
            : 'Request failed'
      setChat((prev) => [
        ...prev,
        { id: Date.now() + 1, role: 'user', text: prompt },
        {
          id: Date.now() + 2,
          role: 'assistant',
          text: hint,
        },
      ])
    } finally {
      setCopilotBusy(false)
    }
  }

  const exportPayload = useMemo(
    () =>
      JSON.stringify(
        {
          app: 'LightCanvas Prototype',
          song: selectedSong.title,
          songMeta: {
            bpm: selectedSong.bpm,
            key: selectedSong.key,
            duration: selectedSong.duration,
          },
          display: { controllers, channelsPerController, props: propsState },
          sections,
          events: events.slice(0, 20),
          exportTarget: 'Mock FSEQ / xLights package',
          note: 'Truncated preview payload for prototype display.',
        },
        null,
        2,
      ),
    [selectedSong, controllers, channelsPerController, propsState, sections, events],
  )

  const analysisItems: [string, string, string][] = [
    [
      'Beat grid',
      `${selectedSong.analysis.beat}% confidence`,
      'Used to create timing windows for pulses, sweeps, and phrase-aligned accents.',
    ],
    [
      'Bass map',
      `${selectedSong.analysis.bass}% strength`,
      'Used to decide where low-end props like stakes or floods should hit.',
    ],
    [
      'Treble map',
      `${selectedSong.analysis.treble}% strength`,
      'Used for sparkle layers, shimmer, and upper-frequency ornamentation.',
    ],
    [
      'Vocal track',
      `${selectedSong.analysis.vocals}% confidence`,
      'Drives face sync, phrase emphasis, and spoken / sung focal moments.',
    ],
    [
      'Dynamic range',
      `${selectedSong.analysis.dynamics}%`,
      'Used to distinguish verses, builds, quiet sections, and explosive chorus lifts.',
    ],
  ]

  return (
    <SequencerShell
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      rebuildAnalyzing={rebuildAnalyzing}
      rebuildPhase={rebuildPhase}
      runAi={runAi}
      controllers={controllers}
      channelsPerController={channelsPerController}
      usedChannels={usedChannels}
      totalChannels={totalChannels}
      selectedSong={selectedSong}
      analysisProgress={analysisProgress}
      signOut={signOut}
      userEmail={user?.email}
      setControllers={setControllers}
      setChannelsPerController={setChannelsPerController}
      propsState={propsState}
      selectedPropId={selectedPropId}
      setSelectedPropId={setSelectedPropId}
      remainingChannels={remainingChannels}
      newPropName={newPropName}
      setNewPropName={setNewPropName}
      newPropType={newPropType}
      setNewPropType={setNewPropType}
      newPropChannels={newPropChannels}
      setNewPropChannels={setNewPropChannels}
      addProp={addProp}
      removeProp={removeProp}
      quickAddProp={quickAddProp}
      updatePropColor={updatePropColor}
      moveProp={moveProp}
      resizeProp={resizeProp}
      songs={songs}
      selectedSongId={selectedSongId}
      setSelectedSongId={setSelectedSongId}
      songFileInputRef={songFileInputRef}
      handleSongFileChange={handleSongFileChange}
      triggerSongFilePicker={triggerSongFilePicker}
      songUploading={songUploading}
      songUploadError={songUploadError}
      songDeleteError={songDeleteError}
      handleDeleteSong={handleDeleteSong}
      songAnalyses={songAnalyses}
      analysisItems={analysisItems}
      SongLibraryInlineAudio={SongLibraryInlineAudio}
      SongWorkspaceAudio={SongWorkspaceAudio}
      AnalysisBeatStrip={AnalysisBeatStrip}
      AnalysisBandRows={AnalysisBandRows}
      complexity={complexity}
      setComplexity={setComplexity}
      sections={sections}
      propEvents={propEvents}
      selectedEventId={selectedEventId}
      setSelectedEventId={setSelectedEventId}
      selectedEvent={selectedEvent}
      events={events}
      exportPayload={exportPayload}
      playing={playing}
      setPlaying={setPlaying}
      chat={chat}
      chatInput={chatInput}
      setChatInput={setChatInput}
      applyCopilot={applyCopilot}
      copilotBusy={copilotBusy}
      previewTime={previewTime}
      sequenceEventsForPreview={events}
      patchTimelineEvent={patchTimelineEvent}
      displayHouseType={displayHouseType}
      setDisplayHouseType={setDisplayHouseType}
      timelineSong={timelineSong}
      timelineEvents={timelineEvents}
      timelineSongId={timelineSongId}
      setTimelineSongId={setTimelineSongId}
      timelineSequenceSource={timelineSequenceSource}
      setTimelineSequenceSource={setTimelineSequenceSource}
      runAudioAnalysis={runAudioAnalysis}
      songAnalysisBusy={songAnalysisBusy}
      photoUrl={photoUrl}
      onPhotoReady={(url: string) => {
        setPhotoUrl(url)
        if (profileId) void updateProfilePhotoUrl(profileId, url)
      }}
      undo={undo}
      canUndo={canUndo}
    />
  )
}

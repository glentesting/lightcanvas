import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type MouseEvent,
  type MouseEventHandler,
  type ReactNode,
} from 'react'
import { useAuth } from '../contexts/AuthContext'
import {
  analyzeAudioBuffer,
  minimalSongAudioAnalysisFromPersisted,
  type SongAudioAnalysis,
} from '../lib/audioAnalysis'
import { mapClaudeEventsToTimeline, requestClaudeSequence } from '../lib/generateSequenceApi'
import { getAudioDurationFromFile } from '../lib/getAudioDurationFromFile'
import {
  deleteSongFromLibrary,
  getOrCreateDisplayProfile,
  getSongAudioSignedUrl,
  loadDisplayProps,
  loadSongs,
  persistDisplayProfile,
  persistSongAudioAnalysis,
  updateSongStatus,
  uploadSongFromFile,
} from '../lib/phase1Repository'
import { supabase } from '../lib/supabaseClient'
import type { DisplayProp } from '../types/display'
import type { Song, SongSectionSnapshot } from '../types/song'
import { LightCanvasWordmark } from './LightCanvasWordmark'
import { SongWaveform } from './SongWaveform'
import { AnimatePresence, motion } from 'framer-motion'
import type { LucideIcon } from 'lucide-react'
import {
  ArrowRight,
  AudioLines,
  Bot,
  Cable,
  CheckCircle2,
  Download,
  Lightbulb,
  MessageSquare,
  Mic2,
  Music4,
  Pause,
  Play,
  Plus,
  Settings2,
  SlidersHorizontal,
  Sparkles,
  Trash2,
  Upload,
  Volume2,
  Wand2,
} from 'lucide-react'

function Button({
  children,
  onClick,
  className = '',
  variant = 'primary',
  disabled = false,
}: {
  children: ReactNode
  onClick?: MouseEventHandler<HTMLButtonElement>
  className?: string
  variant?: 'primary' | 'secondary' | 'ghost'
  disabled?: boolean
}) {
  const styles =
    variant === 'secondary'
      ? 'bg-white text-brand-green border-2 border-brand-green/35 hover:bg-brand-green/10'
      : variant === 'ghost'
        ? 'bg-transparent text-slate-700 hover:bg-brand-green/10'
        : 'bg-brand-green text-white hover:bg-brand-green-dark shadow-brand-soft'
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${styles} ${className}`}
    >
      {children}
    </button>
  )
}

function Progress({ value }: { value: number }) {
  return (
    <div className="h-3 w-full overflow-hidden rounded-full bg-slate-200">
      <div
        className="h-full rounded-full bg-brand-green transition-all duration-300"
        style={{ width: `${value}%` }}
      />
    </div>
  )
}

function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-[26px] border border-slate-200 bg-white shadow-lg shadow-slate-200/60 ${className}`}
    >
      {children}
    </div>
  )
}

function CardHeader({
  title,
  description,
  icon: Icon,
}: {
  title: string
  description?: string
  icon?: LucideIcon
}) {
  return (
    <div className="border-b border-slate-100 px-6 pb-5 pt-6">
      <div className="flex items-start gap-3">
        {Icon ? (
          <div className="mt-0.5 shrink-0 rounded-xl bg-slate-100 p-2.5 text-slate-700">
            <Icon className="h-5 w-5" />
          </div>
        ) : null}
        <div className="min-w-0 flex-1">
          <div className="text-lg font-semibold leading-snug text-slate-900 md:text-xl">{title}</div>
          {description ? (
            <div className="mt-1.5 text-sm leading-relaxed text-slate-600">{description}</div>
          ) : null}
        </div>
      </div>
    </div>
  )
}

function Stat({
  label,
  value,
  sub,
  valueTruncate = false,
}: {
  label: string
  value: ReactNode
  sub?: ReactNode
  /** Single-line ellipsis — use for long titles in tight grid cells */
  valueTruncate?: boolean
}) {
  return (
    <div className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="text-xs uppercase tracking-[0.16em] text-slate-500">{label}</div>
      <div
        className={`mt-2 text-2xl font-semibold text-slate-900 tabular-nums ${
          valueTruncate ? 'truncate whitespace-nowrap' : 'break-words'
        }`}
        title={typeof value === 'string' ? value : undefined}
      >
        {value}
      </div>
      {sub ? <div className="mt-1 text-sm leading-snug text-slate-600">{sub}</div> : null}
    </div>
  )
}

function PillTabs<T extends string>({
  tabs,
  value,
  onChange,
}: {
  tabs: { value: T; label: string }[]
  value: T
  onChange: (v: T) => void
}) {
  return (
    <div className="grid h-auto w-full grid-cols-2 gap-2 rounded-2xl bg-slate-200/70 p-2 md:grid-cols-5">
      {tabs.map((tab) => (
        <button
          key={tab.value}
          type="button"
          onClick={() => onChange(tab.value)}
          className={`rounded-xl px-3 py-2.5 text-sm font-medium transition ${
            value === tab.value
              ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-200/80'
              : 'text-slate-600 hover:bg-slate-100/90'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}

function SliderRow({
  label,
  value,
  onChange,
  min = 0,
  max = 100,
}: {
  label: string
  value: number
  onChange: (n: number) => void
  min?: number
  max?: number
}) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-sm">
        <span className="text-slate-600">{label}</span>
        <span className="font-medium text-brand-green">{value}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full"
      />
    </div>
  )
}

const tabs = [
  { value: 'setup' as const, label: 'Display Setup' },
  { value: 'songs' as const, label: 'Song Library' },
  { value: 'ai' as const, label: 'AI Sequencing' },
  { value: 'timeline' as const, label: 'Timeline' },
  { value: 'export' as const, label: 'Export' },
]

type TabValue = (typeof tabs)[number]['value']

const propTypes = [
  'Talking Face',
  'Mega Tree',
  'Ground Stakes',
  'Roofline',
  'Matrix',
  'Arches',
  'Smart Pixel',
  'AC Traditional',
]

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

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${String(s).padStart(2, '0')}`
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

function LightPreview({ playing }: { playing: boolean }) {
  const [tick, setTick] = useState(0)
  useEffect(() => {
    if (!playing) return
    const id = setInterval(() => setTick((t) => t + 1), 180)
    return () => clearInterval(id)
  }, [playing])
  return (
    <div className="rounded-[28px] border border-slate-200 bg-slate-950 p-5 shadow-inner">
      <div className="grid grid-cols-12 gap-3">
        <div className="col-span-3 flex flex-col justify-end gap-3">
          <div
            className={`mx-auto h-20 w-20 rounded-full border-4 ${
              playing && tick % 2 === 0
                ? 'border-brand-green bg-brand-green/25 shadow-brand-soft'
                : 'border-slate-700 bg-slate-800'
            }`}
          />
          <div className="text-center text-xs text-slate-400">Singing Face</div>
        </div>
        <div className="col-span-6 flex flex-col items-center justify-end">
          <div className="flex h-36 items-end gap-1">
            {Array.from({ length: 18 }).map((_, i) => {
              const active = playing ? ((tick + i) % 5) + 2 : 2
              const height = `${active * 12 + (i % 4) * 8}%`
              return (
                <div
                  key={i}
                  className="w-3 rounded-t-full bg-brand-green shadow-[0_0_18px_rgba(112,173,71,0.5)] transition-all duration-150"
                  style={{ height }}
                />
              )
            })}
          </div>
          <div className="mt-3 text-xs text-slate-400">Mega Tree</div>
        </div>
        <div className="col-span-3 flex flex-col justify-end gap-2">
          <div className="grid grid-cols-4 gap-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className={`h-4 rounded-full transition-all duration-150 ${
                  playing && (tick + i) % 2 === 0
                    ? 'bg-brand-red shadow-brand-red-soft'
                    : 'bg-slate-700'
                }`}
              />
            ))}
          </div>
          <div className="text-center text-xs text-slate-400">Ground Stakes</div>
        </div>
      </div>
      <div className="mt-5 rounded-2xl border border-brand-green/25 bg-slate-900/85 p-3 ring-1 ring-brand-red/20">
        <div className="mb-2 text-left text-xs uppercase tracking-[0.16em] text-brand-green/90">
          Playback preview
        </div>
        <div className="flex h-14 items-end gap-1 overflow-hidden rounded-xl bg-slate-950 p-2">
          {Array.from({ length: 36 }).map((_, i) => {
            const h = playing ? 18 + (((tick * 7) + i * 13) % 65) : 20 + (i % 5) * 5
            return (
              <div
                key={i}
                className="flex-1 rounded-full bg-white/80 transition-all duration-150"
                style={{ height: `${h}%` }}
              />
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default function LightCanvasSequencerPrototype() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState<TabValue>('setup')
  const [controllers, setControllers] = useState(3)
  const [channelsPerController, setChannelsPerController] = useState(16)
  const [propsState, setPropsState] = useState<DisplayProp[]>([])
  const [profileId, setProfileId] = useState<string | null>(null)
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

  const [chatInput, setChatInput] = useState('')
  const [chat, setChat] = useState<ChatMessage[]>([
    {
      id: 1,
      role: 'assistant',
      text: 'Loaded a demo sequence plan. Vocals are prioritized to the talking face, chorus energy goes to the mega tree, and bass pulses are routed to ground stakes.',
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
  const selectedProp =
    propsState.length === 0
      ? undefined
      : (propsState.find((p) => p.id === selectedPropId) ?? propsState[0])
  const propEvents = events.filter((e) => e.propId === selectedProp?.id)
  const selectedEvent =
    events.find((e) => e.id === selectedEventId) ?? propEvents[0] ?? null
  const totalChannels = controllers * channelsPerController
  const usedChannels = propsState.reduce((sum, p) => sum + p.channels, 0)
  const remainingChannels = totalChannels - usedChannels

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

        const props = await loadDisplayProps(profile.id)
        if (cancelled) return
        setPropsState(props)

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
    const nextStart = propsState.length
      ? Math.max(...propsState.map((p) => p.start + p.channels))
      : 1
    const controllerIndex = (propsState.length % Math.max(1, controllers)) + 1
    const created: DisplayProp = {
      id: crypto.randomUUID(),
      name: newPropName,
      type: newPropType,
      controller: `Controller ${String.fromCharCode(64 + controllerIndex)}`,
      channels: Number(newPropChannels),
      start: nextStart,
      priority: 'General',
      notes: `Fake detailed mapping note for ${newPropType}. LightCanvas would recommend how this prop behaves during verses, choruses, and finales.`,
    }
    setPropsState((prev) => [...prev, created])
    setSelectedPropId(created.id)
    setNewPropName('')
    setNewPropType('Smart Pixel')
    setNewPropChannels(8)
  }

  const removeProp = (id: string) => {
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

  const applyCopilot = () => {
    if (!chatInput.trim()) return
    const prompt = chatInput.trim()
    const lower = prompt.toLowerCase()
    let reply = 'Adjusted the sequence draft based on your request.'
    if (lower.includes('finale'))
      reply = 'Boosted finale density and gave the mega tree a larger finishing sweep pattern.'
    else if (lower.includes('bass'))
      reply = 'Increased bass emphasis so ground stakes fire more often in high-energy sections.'
    else if (lower.includes('face') || lower.includes('vocal'))
      reply = 'Cleaned up the talking face track and strengthened vocal phrase syncing.'
    else if (lower.includes('simple') || lower.includes('cleaner')) {
      setComplexity(44)
      reply = 'Reduced sequence complexity for a cleaner beginner-friendly result.'
    } else if (lower.includes('bigger') || lower.includes('intense')) {
      setComplexity(82)
      reply = 'Increased sequence density for a more aggressive, higher-energy show.'
    }
    setChat((prev) => [
      ...prev,
      { id: Date.now() + 1, role: 'user', text: prompt },
      { id: Date.now() + 2, role: 'assistant', text: reply },
    ])
    setChatInput('')
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
    <div className="w-full bg-gradient-to-b from-slate-50 via-white to-slate-100 pb-6 text-slate-900">
      <div className="mx-auto max-w-7xl p-6 md:p-10">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 overflow-hidden rounded-[28px] border border-slate-200 bg-white/90 shadow-xl shadow-slate-300/40 backdrop-blur-sm"
        >
          <div className="grid gap-8 p-8 md:grid-cols-[1.2fr_0.8fr] md:gap-10 md:p-10">
            <div className="min-w-0">
              <div className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                Full sequencing prototype
              </div>
              <LightCanvasWordmark
                as="h1"
                className="mt-4 text-4xl font-semibold tracking-tight text-slate-900 md:text-5xl"
              />
              <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600 md:text-lg">
                Playable LightCanvas workspace: display setup, song library, AI sequencing, timeline,
                and export — with real uploads and account-backed display data where wired.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Button disabled={rebuildAnalyzing} onClick={runAi}>
                  <Sparkles className="h-4 w-4" />{' '}
                  {rebuildAnalyzing
                    ? rebuildPhase === 'sequence'
                      ? 'Generating sequence…'
                      : 'Analyzing…'
                    : 'Rebuild Sequence'}
                </Button>
              </div>
            </div>
            <div className="grid min-w-0 grid-cols-2 gap-3 sm:gap-4">
              <Stat label="Controllers" value={controllers} sub={`${channelsPerController} ch each`} />
              <Stat label="Props mapped" value={propsState.length} sub={`${usedChannels}/${totalChannels} ch used`} />
              <Stat
                label="Song"
                value={selectedSong.bpm != null ? selectedSong.bpm : '—'}
                sub={`${selectedSong.key} · ${formatTime(selectedSong.duration)}`}
              />
              <Stat label="AI readiness" value={`${analysisProgress}%`} sub={selectedSong.status} />
            </div>
          </div>
        </motion.div>

        <div className="min-w-0 w-full max-w-full space-y-6">
            <PillTabs tabs={tabs} value={activeTab} onChange={setActiveTab} />
            <AnimatePresence mode="wait">
              {activeTab === 'setup' && (
                <motion.div
                  key="setup"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  className="grid w-full min-w-0 max-w-full gap-6 lg:grid-cols-[0.92fr_1.08fr] lg:items-start"
                >
                  <Card>
                    <CardHeader
                      title="Guided Display Setup"
                      description="Define controllers, channel capacity, props, and fake smart recommendations."
                      icon={Cable}
                    />
                    <div className="space-y-6 p-6">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <div className="mb-2 text-sm font-medium text-slate-700">Controllers</div>
                          <input
                            type="number"
                            min={1}
                            value={controllers}
                            onChange={(e) => setControllers(Number(e.target.value || 1))}
                            className="w-full rounded-xl border border-slate-300 px-3 py-2"
                          />
                        </div>
                        <div>
                          <div className="mb-2 text-sm font-medium text-slate-700">
                            Channels / Controller
                          </div>
                          <input
                            type="number"
                            min={1}
                            value={channelsPerController}
                            onChange={(e) => setChannelsPerController(Number(e.target.value || 1))}
                            className="w-full rounded-xl border border-slate-300 px-3 py-2"
                          />
                        </div>
                      </div>
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-sm font-medium">Capacity usage</div>
                            <div className="text-sm text-slate-500">
                              Remaining channels: {remainingChannels}
                            </div>
                          </div>
                          <div className="rounded-full bg-brand-green px-3 py-1 text-xs text-white shadow-brand-soft">
                            {usedChannels}/{totalChannels}
                          </div>
                        </div>
                        <div className="mt-4">
                          <Progress
                            value={Math.min(100, (usedChannels / Math.max(1, totalChannels)) * 100)}
                          />
                        </div>
                      </div>
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <div className="text-sm font-medium text-slate-700">Add a prop</div>
                        <div className="mt-3 grid gap-3 md:grid-cols-3">
                          <input
                            value={newPropName}
                            onChange={(e) => setNewPropName(e.target.value)}
                            placeholder="Prop name"
                            className="rounded-xl border border-slate-300 px-3 py-2"
                          />
                          <select
                            value={newPropType}
                            onChange={(e) => setNewPropType(e.target.value)}
                            className="rounded-xl border border-slate-300 px-3 py-2"
                          >
                            {propTypes.map((type) => (
                              <option key={type}>{type}</option>
                            ))}
                          </select>
                          <input
                            type="number"
                            min={1}
                            value={newPropChannels}
                            onChange={(e) => setNewPropChannels(Number(e.target.value || 1))}
                            className="rounded-xl border border-slate-300 px-3 py-2"
                          />
                        </div>
                        <div className="mt-3">
                          <Button onClick={addProp}>
                            <Plus className="h-4 w-4" /> Add Prop
                          </Button>
                        </div>
                      </div>
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm leading-7 text-slate-600">
                        <div className="font-medium text-brand-green">Fake scope details</div>
                        <div className="mt-2">
                          This area demonstrates what the real app would eventually handle: controller
                          families, channel banks, prop grouping, recommended output assignments,
                          conflict detection, and suggested sequencing roles for each prop type.
                        </div>
                      </div>
                    </div>
                  </Card>
                  <Card>
                    <CardHeader
                      title="Prop Mapping Suggestions"
                      description="Believable fake detail for what LightCanvas would recommend per prop."
                      icon={Settings2}
                    />
                    <div className="h-[min(520px,65vh)] space-y-3 overflow-y-auto p-6 pr-4">
                      {propsState.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-brand-green/35 bg-brand-green/5 p-8 text-center text-sm leading-6 text-slate-600">
                          <p className="font-medium text-brand-green">No props yet</p>
                          <p className="mt-2">
                            Add props using the form on the left. Your list is saved to your account
                            automatically.
                          </p>
                        </div>
                      ) : (
                        propsState.map((prop) => (
                          <button
                            key={prop.id}
                            type="button"
                            onClick={() => setSelectedPropId(prop.id)}
                            className={`w-full rounded-2xl border p-4 text-left transition ${
                              selectedPropId === prop.id
                                ? 'border-brand-green bg-brand-green/5 ring-1 ring-brand-green/25'
                                : 'border-slate-200 bg-white hover:bg-slate-50'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <div className="text-base font-semibold">{prop.name}</div>
                                <div className="mt-1 flex flex-wrap gap-2 text-xs text-slate-500">
                                  <span className="rounded-full border border-slate-200 px-2 py-1">
                                    {prop.type}
                                  </span>
                                  <span className="rounded-full border border-slate-200 px-2 py-1">
                                    {prop.controller}
                                  </span>
                                  <span className="rounded-full border border-slate-200 px-2 py-1">
                                    Channels {prop.start}-{prop.start + prop.channels - 1}
                                  </span>
                                  <span className="rounded-full border border-slate-200 px-2 py-1">
                                    Priority: {prop.priority}
                                  </span>
                                </div>
                              </div>
                              <Button
                                variant="ghost"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  removeProp(prop.id)
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                            <div className="mt-3 rounded-xl bg-slate-50 p-3 text-sm leading-6 text-slate-600">
                              {prop.notes}
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  </Card>
                </motion.div>
              )}

              {activeTab === 'songs' && (
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
                          Choose an MP3 or other audio file from your computer. It is stored in your
                          Supabase bucket and linked from your library.
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
                            No songs in your library yet. Upload an audio file above — it will be
                            saved to your account.
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
                                    <div
                                      className="truncate font-medium leading-snug text-slate-900"
                                      title={song.title}
                                    >
                                      {song.title}
                                    </div>
                                    <div className="mt-1 text-sm leading-relaxed text-slate-500">
                                      {song.originalFilename ? (
                                        <span className="line-clamp-2 block" title={song.originalFilename}>
                                          {song.originalFilename}
                                        </span>
                                      ) : null}
                                      <span className="mt-0.5 block truncate text-slate-500" title={`${formatTime(song.duration)} · ${song.bpm != null ? `${song.bpm} BPM` : '— BPM'} · ${song.key}`}>
                                        {formatTime(song.duration)} ·{' '}
                                        {song.bpm != null ? `${song.bpm} BPM` : '— BPM'} · {song.key}
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
                        <Stat
                          label="Duration"
                          value={formatTime(selectedSong.duration)}
                          sub="Sequence length"
                        />
                        <Stat
                          label="Tempo"
                          value={selectedSong.bpm != null ? selectedSong.bpm : '—'}
                          sub={selectedSong.key}
                        />
                        <Stat label="Energy" value={selectedSong.energy} sub="Overall feel" />
                      </div>
                      {selectedSong.originalFilename ? (
                        <p className="text-sm text-slate-600">
                          <span className="font-medium text-brand-green">Original file:</span>{' '}
                          {selectedSong.originalFilename}
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
                          Built from your uploaded file: the audio is fetched, decoded with the Web
                          Audio API, and peaks are shown across the timeline.
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
                            Tempo {songAnalyses[selectedSong.id].bpm} BPM · beat times, band envelopes,
                            and sections derived from the decoded file.
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
                            <div className="mb-2 text-xs font-medium text-slate-600">
                              Sections (energy-based)
                            </div>
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
              )}

              {activeTab === 'ai' && (
                <motion.div
                  key="ai"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  className="grid w-full min-w-0 max-w-full gap-6 lg:grid-cols-[1fr_1fr] lg:items-start"
                >
                  <Card>
                    <CardHeader
                      title="AI Auto-Sequencing"
                      description="Controls and fake depth around how the real sequencing engine would think."
                      icon={Wand2}
                    />
                    <div className="space-y-6 p-6">
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-sm font-medium">Analysis pipeline</div>
                            <div className="text-sm text-slate-500">
                              Beat, bass, treble, vocals, phrasing, dynamic range, transition shaping.
                            </div>
                          </div>
                          <div className="rounded-full bg-brand-green px-3 py-1 text-xs text-white shadow-brand-soft">
                            {analysisProgress}%
                          </div>
                        </div>
                        <div className="mt-4">
                          <Progress value={analysisProgress} />
                        </div>
                      </div>
                      <SliderRow label="Sequence complexity" value={complexity} onChange={setComplexity} />
                      <SliderRow label="Face sync priority" value={88} onChange={() => {}} />
                      <SliderRow label="Bass reactivity" value={72} onChange={() => {}} />
                      <SliderRow label="Transition smoothness" value={61} onChange={() => {}} />
                      <SliderRow label="Finale escalation" value={90} onChange={() => {}} />
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm leading-7 text-slate-600">
                        <div className="font-medium text-brand-green">Fake scope details</div>
                        <div className="mt-2">
                          In a real build, this panel would let the user choose between sequencing
                          styles, phrase density, effect families, safety rails for beginners, more
                          advanced layering rules, and whether the AI should favor clarity,
                          spectacle, or controller efficiency.
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-3">
                        <Button disabled={rebuildAnalyzing} onClick={runAi}>
                          <Sparkles className="h-4 w-4" />{' '}
                          {rebuildAnalyzing
                            ? rebuildPhase === 'sequence'
                              ? 'Generating sequence…'
                              : 'Analyzing…'
                            : 'Rebuild Full Sequence'}
                        </Button>
                        <Button variant="secondary">Re-analyze Audio</Button>
                        <Button variant="secondary">Re-map Props</Button>
                      </div>
                    </div>
                  </Card>
                  <Card>
                    <CardHeader
                      title="Talking Face Sync"
                      description="Dedicated fake detail for vocal-to-mouth sequencing."
                      icon={Mic2}
                    />
                    <div className="space-y-5 p-6">
                      <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-3">
                        <Stat
                          label="Assigned Prop"
                          value={propsState.find((p) => p.type === 'Talking Face')?.name ?? 'None'}
                          sub="Vocal lead"
                        />
                        <Stat
                          label="Vocal Confidence"
                          value={`${selectedSong.analysis.vocals}%`}
                          sub="Phrase detect"
                        />
                        <Stat
                          label="Mode"
                          value="Phrase + Mouth"
                          sub="Prototype logic"
                          valueTruncate
                        />
                      </div>
                      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                        <div className="font-medium text-brand-red">Detected vocal phrase windows</div>
                        <div className="mt-4 space-y-3">
                          {sections
                            .filter((s) => s.vocals)
                            .map((s) => (
                              <div
                                key={s.name + s.start}
                                className="flex items-center justify-between rounded-xl bg-slate-50 p-3 text-sm"
                              >
                                <span className="font-medium">
                                  {formatTime(s.start)} – {formatTime(s.end)}
                                </span>
                                <span className="text-slate-500">{s.name} · fake mouth cue block</span>
                              </div>
                            ))}
                        </div>
                      </div>
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm leading-7 text-slate-600">
                        <div className="font-medium text-brand-green">Fake scope details</div>
                        <div className="mt-2">
                          The real version would support phoneme approximation, face presets, hold
                          states between phrases, alternate mouth maps, and phrase cleanup rules for
                          noisy vocals or overlapping instrumentation.
                        </div>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              )}

              {activeTab === 'timeline' && (
                <motion.div
                  key="timeline"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  className="grid w-full min-w-0 max-w-full gap-6 lg:grid-cols-[1.08fr_0.92fr] lg:items-start"
                >
                  <Card>
                    <CardHeader
                      title="Visual Timeline Editor"
                      description="Playable fake timeline blocks to demonstrate editing depth."
                      icon={SlidersHorizontal}
                    />
                    <div className="space-y-5 p-6">
                      <div className="flex flex-wrap gap-2">
                        {propsState.length === 0 ? (
                          <p className="text-sm text-slate-600">
                            Add at least one prop in{' '}
                            <span className="font-medium text-brand-green">Display Setup</span> to edit
                            timelines.
                          </p>
                        ) : (
                          propsState.map((prop) => (
                            <Button
                              key={prop.id}
                              onClick={() => setSelectedPropId(prop.id)}
                              variant={selectedPropId === prop.id ? 'primary' : 'secondary'}
                            >
                              {prop.name}
                            </Button>
                          ))
                        )}
                      </div>
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <div className="mb-3 text-xs uppercase tracking-[0.16em] text-slate-500">
                          Section map
                        </div>
                        <div className="relative h-14 overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-brand-green/15">
                          {sections.map((section) => {
                            const left = `${(section.start / selectedSong.duration) * 100}%`
                            const width = `${((section.end - section.start) / selectedSong.duration) * 100}%`
                            return (
                              <div
                                key={section.name + section.start}
                                className="absolute top-0 h-full border-r border-slate-200 p-2 text-[11px] text-slate-600"
                                style={{ left, width }}
                              >
                                <div className="truncate font-medium">{section.name}</div>
                                <div>{formatTime(section.start)}</div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                      <div className="space-y-3">
                        {propsState.length === 0 ? (
                          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-600">
                            No timeline blocks until you add props to your display.
                          </div>
                        ) : null}
                        {propEvents.map((event) => {
                          const left = `${(event.start / selectedSong.duration) * 100}%`
                          const width = `${Math.max(5, ((event.end - event.start) / selectedSong.duration) * 100)}%`
                          return (
                            <button
                              key={event.id}
                              type="button"
                              onClick={() => setSelectedEventId(event.id)}
                              className={`relative flex h-14 w-full items-center rounded-2xl border bg-white px-3 text-left shadow-sm ${
                                selectedEventId === event.id
                                  ? 'border-brand-green ring-1 ring-brand-green/30'
                                  : 'border-slate-200'
                              }`}
                            >
                              <div className="absolute left-3 right-3 top-1/2 h-4 -translate-y-1/2 rounded-full bg-slate-100" />
                              <div
                                className="absolute top-1/2 h-4 -translate-y-1/2 rounded-full bg-gradient-to-r from-brand-green to-brand-green-dark/90"
                                style={{
                                  left: `calc(${left} + 12px)`,
                                  width: `calc(${width} - 8px)`,
                                }}
                              />
                              <div className="relative z-10 flex w-full items-center justify-between text-sm">
                                <span className="font-medium">{event.effect}</span>
                                <span className="text-slate-500">
                                  {formatTime(event.start)}–{formatTime(event.end)}
                                </span>
                              </div>
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  </Card>
                  <Card>
                    <CardHeader
                      title="Effect Inspector"
                      description="Selected block detail to make scope feel real."
                      icon={Lightbulb}
                    />
                    <div className="space-y-5 p-6">
                      {selectedEvent ? (
                        <>
                          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                            <div className="text-sm text-slate-500">Selected prop</div>
                            <div className="mt-1 text-lg font-semibold">{selectedEvent.propName}</div>
                            <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
                              <span className="rounded-full border border-slate-200 px-2 py-1">
                                {selectedEvent.section}
                              </span>
                              <span className="rounded-full border border-slate-200 px-2 py-1">
                                {formatTime(selectedEvent.start)}–{formatTime(selectedEvent.end)}
                              </span>
                              <span className="rounded-full border border-slate-200 px-2 py-1">
                                {selectedEvent.effect}
                              </span>
                            </div>
                          </div>
                          <SliderRow
                            label="Intensity"
                            value={selectedEvent.intensity}
                            onChange={() => {}}
                          />
                          <SliderRow
                            label="Smoothness"
                            value={selectedEvent.smoothness}
                            onChange={() => {}}
                          />
                          <div>
                            <div className="mb-2 text-sm font-medium text-slate-700">Effect Type</div>
                            <select
                              key={selectedEvent.id}
                              defaultValue={selectedEvent.effect}
                              className="w-full rounded-xl border border-slate-300 px-3 py-2"
                            >
                              {effectOptions.map((opt) => (
                                <option key={opt}>{opt}</option>
                              ))}
                            </select>
                          </div>
                          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm leading-7 text-slate-600">
                            <div className="font-medium text-brand-green">Block note</div>
                            <div className="mt-2">{selectedEvent.note}</div>
                          </div>
                        </>
                      ) : (
                        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                          Select a timeline block to inspect it.
                        </div>
                      )}
                    </div>
                  </Card>
                </motion.div>
              )}

              {activeTab === 'export' && (
                <motion.div
                  key="export"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  className="grid w-full min-w-0 max-w-full grid-cols-1 gap-6 lg:grid-cols-2 lg:items-start"
                >
                  <Card className="min-w-0">
                    <CardHeader
                      title="Export Sequence"
                      description="Fake but concrete handoff settings to show what the real output layer might include."
                      icon={Download}
                    />
                    <div className="min-w-0 space-y-5 p-6">
                      <div className="min-w-0">
                        <div className="mb-2 text-sm font-medium text-slate-700">Export Format</div>
                        <select className="w-full min-w-0 rounded-xl border border-slate-300 px-3 py-2">
                          <option>FSEQ</option>
                          <option>xLights-compatible package</option>
                          <option>LOR-oriented channel map bundle</option>
                        </select>
                      </div>
                      <div className="grid min-w-0 gap-3 text-sm leading-normal text-slate-600">
                        <div className="min-w-0 rounded-xl border border-slate-200 bg-slate-50 p-3 break-words">
                          Song: {selectedSong.title}
                        </div>
                        <div className="min-w-0 rounded-xl border border-slate-200 bg-slate-50 p-3">
                          Props mapped: {propsState.length}
                        </div>
                        <div className="min-w-0 rounded-xl border border-slate-200 bg-slate-50 p-3">
                          Controller capacity: {totalChannels} channels
                        </div>
                        <div className="min-w-0 rounded-xl border border-slate-200 bg-slate-50 p-3">
                          Talking face sync included: Yes
                        </div>
                        <div className="min-w-0 rounded-xl border border-slate-200 bg-slate-50 p-3">
                          Timeline events in current draft: {events.length}
                        </div>
                      </div>
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-pretty text-sm leading-relaxed text-slate-600">
                        <div className="font-medium text-brand-green">Fake scope details</div>
                        <div className="mt-2 text-pretty leading-relaxed">
                          A real export layer would handle format translation, channel flattening,
                          effect serialization, controller compatibility checks, timing precision, and
                          playback package creation for FPP or xLights workflows.
                        </div>
                      </div>
                      <Button>
                        <Download className="h-4 w-4" /> Export Mock Sequence
                      </Button>
                    </div>
                  </Card>
                  <Card className="min-w-0">
                    <CardHeader
                      title="Payload Preview"
                      description="A believable object-model preview of the prototype's exported data."
                      icon={Sparkles}
                    />
                    <div className="min-w-0 p-6">
                      <pre className="max-h-[520px] min-w-0 overflow-auto rounded-2xl border border-brand-green/30 bg-slate-950 p-4 text-xs leading-6 text-slate-100 shadow-[inset_0_0_0_1px_rgba(192,0,0,0.12)]">
                        {exportPayload}
                      </pre>
                    </div>
                  </Card>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="grid w-full min-w-0 gap-6 lg:grid-cols-2 lg:items-start">
              <Card className="min-w-0">
                <CardHeader
                  title="Live show preview"
                  description="Reactive visual playback for the current sequence draft."
                  icon={Volume2}
                />
                <div className="space-y-4 px-6 pb-6 pt-4">
                  <Button variant="secondary" onClick={() => setPlaying((p) => !p)}>
                    {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                    {playing ? 'Pause' : 'Preview'}
                  </Button>
                  <LightPreview playing={playing} />
                  <div className="space-y-3">
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm leading-relaxed text-slate-600">
                      <span className="font-medium text-slate-800">Talking face:</span> reserved for
                      vocal phrases and highlighted lyrical moments.
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm leading-relaxed text-slate-600">
                      <span className="font-medium text-slate-800">Mega tree:</span> denser patterns
                      in high-energy sections and finale lifts.
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm leading-relaxed text-slate-600">
                      <span className="font-medium text-slate-800">Ground stakes:</span> low-end
                      pulsing and beat-driven movement.
                    </div>
                  </div>
                </div>
              </Card>
              <Card className="min-w-0">
                <CardHeader
                  title="AI Copilot"
                  description="Conversational layer for quick sequence tweaks (prototype)."
                  icon={Bot}
                />
                <div className="space-y-3 px-6 pb-5 pt-3">
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                    <Button
                      variant="secondary"
                      className="text-xs sm:text-sm"
                      onClick={() => setChatInput('Make the finale bigger')}
                    >
                      Bigger finale
                    </Button>
                    <Button
                      variant="secondary"
                      className="text-xs sm:text-sm"
                      onClick={() => setChatInput('Make the face sync cleaner')}
                    >
                      Cleaner face
                    </Button>
                    <Button
                      variant="secondary"
                      className="text-xs sm:text-sm"
                      onClick={() => setChatInput('Increase bass pulses')}
                    >
                      More bass
                    </Button>
                  </div>
                  <div className="h-[200px] space-y-2 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 p-2">
                    {chat.map((msg) => (
                      <div
                        key={msg.id}
                        className={`rounded-lg p-2 text-xs leading-relaxed ${
                          msg.role === 'assistant'
                            ? 'border border-slate-200 bg-white text-slate-700 shadow-sm'
                            : 'bg-slate-900 text-white'
                        }`}
                      >
                        <div className="mb-0.5 flex items-center gap-1.5 text-[10px] uppercase tracking-wide opacity-70">
                          {msg.role === 'assistant' ? (
                            <Bot className="h-3 w-3 shrink-0" />
                          ) : (
                            <MessageSquare className="h-3 w-3 shrink-0" />
                          )}
                          {msg.role}
                        </div>
                        {msg.text}
                      </div>
                    ))}
                  </div>
                  <textarea
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Tell the copilot what to change..."
                    className="min-h-[72px] w-full resize-y rounded-xl border border-slate-300 px-3 py-2 text-sm leading-relaxed outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                  />
                  <Button className="w-full" onClick={applyCopilot}>
                    <ArrowRight className="h-4 w-4" /> Apply Copilot change
                  </Button>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
                      <p className="text-xs leading-relaxed text-slate-600">
                        Interactive prototype demo. Not yet: true phoneme mouth mapping or real
                        FSEQ/LOR export.
                      </p>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
        </div>
      </div>
    </div>
  )
}

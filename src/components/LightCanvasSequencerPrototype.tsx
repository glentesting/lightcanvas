import {
  useEffect,
  useMemo,
  useState,
  type MouseEventHandler,
  type ReactNode,
} from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import type { LucideIcon } from 'lucide-react'
import {
  AudioLines,
  Bot,
  Cable,
  Download,
  Lightbulb,
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
      ? 'bg-white text-slate-900 border border-slate-300 hover:bg-slate-50'
      : variant === 'ghost'
        ? 'bg-transparent text-slate-700 hover:bg-slate-100'
        : 'bg-slate-900 text-white hover:opacity-90'
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
        className="h-full rounded-full bg-slate-900 transition-all duration-300"
        style={{ width: `${value}%` }}
      />
    </div>
  )
}

function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-[28px] border border-slate-200 bg-white shadow-xl ${className}`}>
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
    <div className="border-b border-slate-100 px-6 py-5">
      <div className="flex items-start gap-3">
        {Icon ? (
          <div className="rounded-2xl bg-slate-100 p-3">
            <Icon className="h-5 w-5" />
          </div>
        ) : null}
        <div>
          <div className="text-xl font-semibold text-slate-900">{title}</div>
          {description ? (
            <div className="mt-1 text-sm leading-6 text-slate-500">{description}</div>
          ) : null}
        </div>
      </div>
    </div>
  )
}

function Stat({ label, value, sub }: { label: string; value: ReactNode; sub?: ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="text-xs uppercase tracking-[0.16em] text-slate-500">{label}</div>
      <div className="mt-2 text-2xl font-semibold text-slate-900">{value}</div>
      {sub ? <div className="mt-1 text-sm text-slate-600">{sub}</div> : null}
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
    <div className="grid grid-cols-2 gap-2 rounded-2xl bg-slate-200/70 p-2 md:grid-cols-5">
      {tabs.map((tab) => (
        <button
          key={tab.value}
          type="button"
          onClick={() => onChange(tab.value)}
          className={`rounded-xl px-3 py-2 text-sm font-medium transition ${
            value === tab.value ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:bg-slate-100'
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
        <span className="font-medium text-slate-900">{value}</span>
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

interface DisplayProp {
  id: number
  name: string
  type: string
  controller: string
  channels: number
  start: number
  priority: string
  notes: string
}

interface SongAnalysis {
  beat: number
  bass: number
  treble: number
  vocals: number
  dynamics: number
}

interface Song {
  id: number
  title: string
  duration: number
  bpm: number
  key: string
  energy: string
  status: string
  analysis: SongAnalysis
}

interface Section {
  name: string
  start: number
  end: number
  energy: number
  vocals: boolean
}

interface TimelineEvent {
  id: string
  propId: number
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

const initialProps: DisplayProp[] = [
  {
    id: 1,
    name: 'Singing Santa Face',
    type: 'Talking Face',
    controller: 'Controller A',
    channels: 8,
    start: 1,
    priority: 'Vocals',
    notes: 'Primary vocal prop. Reserved for mouth cues and phrase emphasis.',
  },
  {
    id: 2,
    name: 'Front Yard Mega Tree',
    type: 'Mega Tree',
    controller: 'Controller B',
    channels: 16,
    start: 9,
    priority: 'Chorus / Finale',
    notes: 'High-energy visual anchor for choruses, lifts, and big endings.',
  },
  {
    id: 3,
    name: 'Ground Stakes',
    type: 'Ground Stakes',
    controller: 'Controller A',
    channels: 8,
    start: 25,
    priority: 'Bass',
    notes: 'Handles bass pulses, downbeats, and low-end movement.',
  },
  {
    id: 4,
    name: 'Roofline',
    type: 'Roofline',
    controller: 'Controller C',
    channels: 12,
    start: 33,
    priority: 'Accent',
    notes: 'Frames transitions and gives broad house outline movement.',
  },
]

const initialSongs: Song[] = [
  {
    id: 1,
    title: 'Carol of the Bells.mp3',
    duration: 178,
    bpm: 132,
    key: 'E minor',
    energy: 'High',
    status: 'Ready',
    analysis: { beat: 92, bass: 84, treble: 71, vocals: 94, dynamics: 88 },
  },
  {
    id: 2,
    title: 'Jingle Bell Rock.mp3',
    duration: 131,
    bpm: 118,
    key: 'G major',
    energy: 'Medium',
    status: 'Uploaded',
    analysis: { beat: 56, bass: 49, treble: 64, vocals: 67, dynamics: 53 },
  },
]

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
  song: Song,
  complexity: number,
): TimelineEvent[] {
  const sections = buildSections(song.duration)
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
                ? 'border-emerald-300 bg-emerald-200/30'
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
                  className="w-3 rounded-t-full bg-emerald-300 shadow-[0_0_18px_rgba(110,231,183,0.45)] transition-all duration-150"
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
                    ? 'bg-cyan-300 shadow-[0_0_16px_rgba(103,232,249,0.5)]'
                    : 'bg-slate-700'
                }`}
              />
            ))}
          </div>
          <div className="text-center text-xs text-slate-400">Ground Stakes</div>
        </div>
      </div>
      <div className="mt-5 rounded-2xl border border-slate-800 bg-slate-900/80 p-3">
        <div className="mb-2 text-left text-xs uppercase tracking-[0.16em] text-slate-500">
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
  const [activeTab, setActiveTab] = useState<TabValue>('setup')
  const [controllers, setControllers] = useState(3)
  const [channelsPerController, setChannelsPerController] = useState(16)
  const [propsState, setPropsState] = useState<DisplayProp[]>(initialProps)
  const [songs, setSongs] = useState<Song[]>(initialSongs)
  const [selectedSongId, setSelectedSongId] = useState(1)
  const [analysisProgress, setAnalysisProgress] = useState(91)
  const [playing, setPlaying] = useState(false)
  const [complexity, setComplexity] = useState(62)
  const [selectedPropId, setSelectedPropId] = useState(1)
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null)
  const [newPropName, setNewPropName] = useState('')
  const [newPropType, setNewPropType] = useState('Smart Pixel')
  const [newPropChannels, setNewPropChannels] = useState(8)
  const [chatInput, setChatInput] = useState('')
  const [chat, setChat] = useState<ChatMessage[]>([
    {
      id: 1,
      role: 'assistant',
      text: 'Loaded a demo sequence plan. Vocals are prioritized to the talking face, chorus energy goes to the mega tree, and bass pulses are routed to ground stakes.',
    },
  ])

  const selectedSong = songs.find((s) => s.id === selectedSongId) ?? songs[0]
  const sections = useMemo(() => buildSections(selectedSong.duration), [selectedSong])
  const events = useMemo(
    () => buildEvents(propsState, selectedSong, complexity),
    [propsState, selectedSong, complexity],
  )
  const selectedProp = propsState.find((p) => p.id === selectedPropId) ?? propsState[0]
  const propEvents = events.filter((e) => e.propId === selectedProp?.id)
  const selectedEvent =
    events.find((e) => e.id === selectedEventId) ?? propEvents[0] ?? null
  const totalChannels = controllers * channelsPerController
  const usedChannels = propsState.reduce((sum, p) => sum + p.channels, 0)
  const remainingChannels = totalChannels - usedChannels

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
      id: Date.now(),
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

  const removeProp = (id: number) => {
    const remaining = propsState.filter((p) => p.id !== id)
    setPropsState(remaining)
    if (remaining.length) setSelectedPropId(remaining[0].id)
  }

  const addSong = () => {
    const id = Date.now()
    setSongs((prev) => [
      ...prev,
      {
        id,
        title: `New Upload ${prev.length + 1}.mp3`,
        duration: 187,
        bpm: 124,
        key: 'A minor',
        energy: 'Medium-High',
        status: 'Uploaded',
        analysis: { beat: 51, bass: 46, treble: 57, vocals: 63, dynamics: 58 },
      },
    ])
    setSelectedSongId(id)
    setAnalysisProgress(26)
    setActiveTab('songs')
  }

  const runAi = () => {
    setAnalysisProgress(100)
    setSongs((prev) =>
      prev.map((s) =>
        s.id === selectedSongId
          ? {
              ...s,
              status: 'Ready',
              analysis: { beat: 92, bass: 84, treble: 71, vocals: 94, dynamics: 88 },
            }
          : s,
      ),
    )
    setChat((prev) => [
      ...prev,
      {
        id: Date.now(),
        role: 'assistant',
        text: 'Rebuilt the first-pass sequence. Finale intensity is higher, transitions are smoother, and the talking face now gets cleaner phrase blocks.',
      },
    ])
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
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-100 text-slate-900">
      <div className="mx-auto max-w-7xl px-6 py-10">
        <div className="mb-8 grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <Card className="p-8">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="text-sm uppercase tracking-[0.2em] text-slate-500">
                  Full Sequencing Prototype
                </div>
                <h1 className="mt-2 text-4xl font-semibold tracking-tight md:text-5xl">
                  LightCanvas
                </h1>
                <p className="mt-3 max-w-3xl text-base leading-7 text-slate-600 md:text-lg">
                  An in-depth playable prototype of the LightCanvas facefront sequencing UI. This
                  version is for exploring scope, controls, fake data depth, sequencing behavior, and
                  how each major section would work in a fuller product.
                </p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <Button onClick={runAi}>
                    <Sparkles className="h-4 w-4" /> Rebuild Sequence
                  </Button>
                  <Button variant="secondary" onClick={() => setPlaying((p) => !p)}>
                    {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                    {playing ? 'Pause Preview' : 'Play Preview'}
                  </Button>
                </div>
              </div>
              <div className="grid min-w-[260px] grid-cols-2 gap-3">
                <Stat label="Controllers" value={controllers} sub={`${channelsPerController} channels each`} />
                <Stat label="Props" value={propsState.length} sub={`${usedChannels}/${totalChannels} channels used`} />
                <Stat
                  label="Song"
                  value={selectedSong.bpm}
                  sub={`${selectedSong.key} · ${formatTime(selectedSong.duration)}`}
                />
                <Stat label="AI Readiness" value={`${analysisProgress}%`} sub={selectedSong.status} />
              </div>
            </div>
          </Card>
          <Card className="p-6">
            <div className="text-xs uppercase tracking-[0.18em] text-slate-500">Prototype Intent</div>
            <div className="mt-3 text-xl font-semibold">What this version is for</div>
            <div className="mt-4 space-y-3 text-sm leading-7 text-slate-600">
              <div className="rounded-2xl bg-slate-50 p-4">
                Explore a fuller product surface, not just a guided story demo.
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                Show fake but believable sequence data, song analysis, prop mapping, and export
                structure.
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                Play with deeper controls so the scope of the real app becomes obvious.
              </div>
            </div>
          </Card>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.32fr_0.68fr]">
          <div className="space-y-6">
            <PillTabs tabs={tabs} value={activeTab} onChange={setActiveTab} />
            <AnimatePresence mode="wait">
              {activeTab === 'setup' && (
                <motion.div
                  key="setup"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  className="grid gap-6 lg:grid-cols-[0.92fr_1.08fr]"
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
                          <div className="rounded-full bg-slate-900 px-3 py-1 text-xs text-white">
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
                        <div className="font-medium text-slate-900">Fake scope details</div>
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
                    <div className="max-h-[650px] space-y-3 overflow-auto p-6">
                      {propsState.map((prop) => (
                        <button
                          key={prop.id}
                          type="button"
                          onClick={() => setSelectedPropId(prop.id)}
                          className={`w-full rounded-2xl border p-4 text-left transition ${
                            selectedPropId === prop.id
                              ? 'border-slate-900 bg-slate-50'
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
                      ))}
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
                  className="grid gap-6 lg:grid-cols-[0.86fr_1.14fr]"
                >
                  <Card>
                    <CardHeader
                      title="Song Library"
                      description="Per-song workspaces with fake ingest and analysis readiness."
                      icon={Music4}
                    />
                    <div className="space-y-4 p-6">
                      <div className="rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 p-6 text-center">
                        <Upload className="mx-auto h-8 w-8 text-slate-600" />
                        <div className="mt-3 font-medium">Simulated MP3 upload</div>
                        <div className="mt-1 text-sm text-slate-500">
                          Adds a new fake song object with partial analysis.
                        </div>
                        <div className="mt-4">
                          <Button onClick={addSong}>Mock Upload Song</Button>
                        </div>
                      </div>
                      <div className="space-y-3">
                        {songs.map((song) => (
                          <button
                            key={song.id}
                            type="button"
                            onClick={() => setSelectedSongId(song.id)}
                            className={`w-full rounded-2xl border p-4 text-left transition ${
                              selectedSongId === song.id
                                ? 'border-slate-900 bg-slate-50'
                                : 'border-slate-200 bg-white hover:bg-slate-50'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <div className="font-medium">{song.title}</div>
                                <div className="mt-1 text-sm text-slate-500">
                                  {formatTime(song.duration)} · {song.bpm} BPM · {song.key}
                                </div>
                              </div>
                              <div className="rounded-full bg-slate-900 px-3 py-1 text-xs text-white">
                                {song.status}
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  </Card>
                  <Card>
                    <CardHeader
                      title="Selected Song Workspace"
                      description="Deeper fake analysis metadata to show scope."
                      icon={AudioLines}
                    />
                    <div className="space-y-6 p-6">
                      <div className="grid gap-4 md:grid-cols-4">
                        <Stat
                          label="Track"
                          value={selectedSong.title.replace('.mp3', '')}
                          sub="Current workspace"
                        />
                        <Stat
                          label="Duration"
                          value={formatTime(selectedSong.duration)}
                          sub="Sequence length"
                        />
                        <Stat label="Tempo" value={selectedSong.bpm} sub={selectedSong.key} />
                        <Stat label="Energy" value={selectedSong.energy} sub="Overall feel" />
                      </div>
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                        <div className="text-sm font-medium text-slate-900">
                          Waveform / structure proxy
                        </div>
                        <div className="mt-1 text-sm text-slate-500">
                          This fake panel represents song parsing, phrase segmentation, section
                          detection, and timing markers.
                        </div>
                        <div className="mt-4 flex h-32 items-end gap-1 rounded-2xl bg-white p-3 shadow-sm">
                          {Array.from({ length: 48 }).map((_, i) => {
                            const h = 18 + ((i * 17) % 78)
                            return (
                              <div
                                key={i}
                                className="flex-1 rounded-full bg-slate-900/85"
                                style={{ height: `${h}%` }}
                              />
                            )
                          })}
                        </div>
                      </div>
                      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                        {analysisItems.map(([title, metric, desc]) => (
                          <div key={title} className="rounded-2xl border border-slate-200 bg-white p-4">
                            <div className="font-medium text-slate-900">{title}</div>
                            <div className="mt-1 text-sm font-medium text-slate-700">{metric}</div>
                            <div className="mt-2 text-sm leading-6 text-slate-500">{desc}</div>
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
                  className="grid gap-6 lg:grid-cols-[1fr_1fr]"
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
                          <div className="rounded-full bg-slate-900 px-3 py-1 text-xs text-white">
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
                        <div className="font-medium text-slate-900">Fake scope details</div>
                        <div className="mt-2">
                          In a real build, this panel would let the user choose between sequencing
                          styles, phrase density, effect families, safety rails for beginners, more
                          advanced layering rules, and whether the AI should favor clarity,
                          spectacle, or controller efficiency.
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-3">
                        <Button onClick={runAi}>
                          <Sparkles className="h-4 w-4" /> Rebuild Full Sequence
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
                      <div className="grid gap-4 md:grid-cols-3">
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
                        <Stat label="Mode" value="Phrase + Mouth" sub="Prototype logic" />
                      </div>
                      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                        <div className="font-medium text-slate-900">Detected vocal phrase windows</div>
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
                        <div className="font-medium text-slate-900">Fake scope details</div>
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
                  className="grid gap-6 lg:grid-cols-[1.08fr_0.92fr]"
                >
                  <Card>
                    <CardHeader
                      title="Visual Timeline Editor"
                      description="Playable fake timeline blocks to demonstrate editing depth."
                      icon={SlidersHorizontal}
                    />
                    <div className="space-y-5 p-6">
                      <div className="flex flex-wrap gap-2">
                        {propsState.map((prop) => (
                          <Button
                            key={prop.id}
                            onClick={() => setSelectedPropId(prop.id)}
                            variant={selectedPropId === prop.id ? 'primary' : 'secondary'}
                          >
                            {prop.name}
                          </Button>
                        ))}
                      </div>
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <div className="mb-3 text-xs uppercase tracking-[0.16em] text-slate-500">
                          Section map
                        </div>
                        <div className="relative h-14 overflow-hidden rounded-xl bg-white shadow-sm">
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
                        {propEvents.map((event) => {
                          const left = `${(event.start / selectedSong.duration) * 100}%`
                          const width = `${Math.max(5, ((event.end - event.start) / selectedSong.duration) * 100)}%`
                          return (
                            <button
                              key={event.id}
                              type="button"
                              onClick={() => setSelectedEventId(event.id)}
                              className={`relative flex h-14 w-full items-center rounded-2xl border bg-white px-3 text-left shadow-sm ${
                                selectedEventId === event.id ? 'border-slate-900' : 'border-slate-200'
                              }`}
                            >
                              <div className="absolute left-3 right-3 top-1/2 h-4 -translate-y-1/2 rounded-full bg-slate-100" />
                              <div
                                className="absolute top-1/2 h-4 -translate-y-1/2 rounded-full bg-slate-900/85"
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
                            <div className="font-medium text-slate-900">Block note</div>
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
                  className="grid gap-6 lg:grid-cols-[0.92fr_1.08fr]"
                >
                  <Card>
                    <CardHeader
                      title="Export Sequence"
                      description="Fake but concrete handoff settings to show what the real output layer might include."
                      icon={Download}
                    />
                    <div className="space-y-5 p-6">
                      <div>
                        <div className="mb-2 text-sm font-medium text-slate-700">Export Format</div>
                        <select className="w-full rounded-xl border border-slate-300 px-3 py-2">
                          <option>FSEQ</option>
                          <option>xLights-compatible package</option>
                          <option>LOR-oriented channel map bundle</option>
                        </select>
                      </div>
                      <div className="grid gap-3 text-sm text-slate-600">
                        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                          Song: {selectedSong.title}
                        </div>
                        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                          Props mapped: {propsState.length}
                        </div>
                        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                          Controller capacity: {totalChannels} channels
                        </div>
                        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                          Talking face sync included: Yes
                        </div>
                        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                          Timeline events in current draft: {events.length}
                        </div>
                      </div>
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm leading-7 text-slate-600">
                        <div className="font-medium text-slate-900">Fake scope details</div>
                        <div className="mt-2">
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
                  <Card>
                    <CardHeader
                      title="Payload Preview"
                      description="A believable object-model preview of the prototype's exported data."
                      icon={Sparkles}
                    />
                    <div className="p-6">
                      <pre className="max-h-[520px] overflow-auto rounded-2xl bg-slate-950 p-4 text-xs leading-6 text-slate-100">
                        {exportPayload}
                      </pre>
                    </div>
                  </Card>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader
                title="Live Show Preview"
                description="A reactive fake visual playback window for the current sequence."
                icon={Volume2}
              />
              <div className="space-y-4 p-6">
                <LightPreview playing={playing} />
                <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-1">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                    <span className="font-medium text-slate-900">Talking face:</span> reserved for
                    vocal phrases and highlighted lyrical moments.
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                    <span className="font-medium text-slate-900">Mega tree:</span> receives denser
                    patterns in high-energy sections and finale lifts.
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                    <span className="font-medium text-slate-900">Ground stakes:</span> represent
                    low-end pulsing and beat-driven movement.
                  </div>
                </div>
              </div>
            </Card>
            <Card>
              <CardHeader
                title="AI Copilot"
                description="A fake conversational layer for making quick sequence changes."
                icon={Bot}
              />
              <div className="space-y-4 p-6">
                <div className="flex flex-wrap gap-2">
                  <Button variant="secondary" onClick={() => setChatInput('Make the finale bigger')}>
                    Bigger finale
                  </Button>
                  <Button variant="secondary" onClick={() => setChatInput('Increase bass pulses')}>
                    More bass
                  </Button>
                  <Button variant="secondary" onClick={() => setChatInput('Make the face sync cleaner')}>
                    Cleaner face sync
                  </Button>
                </div>
                <div className="max-h-[360px] space-y-3 overflow-auto rounded-2xl border border-slate-200 bg-slate-50 p-3">
                  {chat.map((msg) => (
                    <div
                      key={msg.id}
                      className={`rounded-2xl p-3 text-sm leading-6 ${
                        msg.role === 'assistant'
                          ? 'border border-slate-200 bg-white text-slate-700'
                          : 'bg-slate-900 text-white'
                      }`}
                    >
                      <div className="mb-1 text-[11px] uppercase tracking-[0.16em] opacity-70">
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
                  className="min-h-[110px] w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none"
                />
                <Button className="w-full" onClick={applyCopilot}>
                  <Bot className="h-4 w-4" /> Apply Copilot Change
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}

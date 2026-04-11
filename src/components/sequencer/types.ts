import type { DisplayProp } from '../../types/display'
import type { Song } from '../../types/song'

export interface Section {
  name: string
  start: number
  end: number
  energy: number
  vocals: boolean
}

export interface TimelineEvent {
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

export interface ChatMessage {
  id: number
  role: 'user' | 'assistant'
  text: string
}

export type TabValue = 'setup' | 'songs' | 'ai' | 'timeline' | 'export'

export const sequencerTabs: { value: TabValue; label: string }[] = [
  { value: 'setup', label: 'Display Setup' },
  { value: 'songs', label: 'Music' },
  { value: 'ai', label: 'Sequencing' },
  { value: 'timeline', label: 'Timeline' },
  { value: 'export', label: 'Export' },
]

import { CHRISTMAS_PROP_TYPES, HALLOWEEN_PROP_TYPES, SHARED_PROP_TYPES } from '../../holidays'

export const propTypes: string[] = [
  ...CHRISTMAS_PROP_TYPES,
  ...HALLOWEEN_PROP_TYPES,
  ...SHARED_PROP_TYPES,
]

export const effectOptions = [
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

export const PLACEHOLDER_SONG: Song = {
  id: '__none__',
  title: 'No songs yet',
  duration: 180,
  bpm: 120,
  key: '—',
  energy: '—',
  status: '—',
  analysis: { beat: 0, bass: 0, treble: 0, vocals: 0, dynamics: 0 },
}

export type DisplayPropList = DisplayProp[]

export interface SongAnalysis {
  beat: number
  bass: number
  treble: number
  vocals: number
  dynamics: number
}

/** Section snapshot stored in DB JSONB and used to hydrate timeline/workspace. */
export interface SongSectionSnapshot {
  name: string
  start: number
  end: number
  energy: number
  vocals: boolean
}

export interface Song {
  id: string
  title: string
  duration: number
  /** Null until analyzed */
  bpm: number | null
  key: string
  energy: string
  status: string
  analysis: SongAnalysis
  /** True when analysis metrics were loaded from Supabase (skip re-decode on Rebuild). */
  analysisSaved?: boolean
  /** Sections from persisted analysis, if any. */
  persistedSections?: SongSectionSnapshot[]
  /** Supabase Storage bucket (e.g. song-audio) when file is stored */
  storageBucket?: string | null
  /** Object path within bucket */
  storagePath?: string | null
  /** Original client filename */
  originalFilename?: string | null
}

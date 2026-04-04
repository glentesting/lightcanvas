export interface SongAnalysis {
  beat: number
  bass: number
  treble: number
  vocals: number
  dynamics: number
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
  /** Supabase Storage bucket (e.g. song-audio) when file is stored */
  storageBucket?: string | null
  /** Object path within bucket */
  storagePath?: string | null
  /** Original client filename */
  originalFilename?: string | null
}

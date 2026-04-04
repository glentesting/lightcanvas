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
  bpm: number
  key: string
  energy: string
  status: string
  analysis: SongAnalysis
}

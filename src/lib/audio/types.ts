export interface AudioAnalysis {
  duration: number;
  bpm: number;
  beats: number[];
  downbeats: number[];
  onsets: number[];
  loudness: Array<{ t: number; v: number }>;
}

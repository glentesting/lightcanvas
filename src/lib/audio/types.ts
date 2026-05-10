export interface AudioSection {
  label: "intro" | "verse" | "chorus" | "bridge" | "outro";
  startTime: number;
  endTime: number;
  avgEnergy: number;
}

export interface AudioAnalysis {
  duration: number;
  bpm: number;
  beats: number[];
  downbeats: number[];
  onsets: number[];
  loudness: Array<{ t: number; v: number }>;
  sections?: AudioSection[];
  spectralFeatures?: {
    bassEnergy: number[]; // per-beat bass energy (0-1)
    highEnergy: number[]; // per-beat high freq energy (0-1)
  };
}

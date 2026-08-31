import { create } from "zustand";

/**
 * Whoever owns the actual audio element (WaveSurfer on the timeline page,
 * the play bar on the designer) registers here so seeks from anywhere —
 * clicking the timeline ruler, scrubbing — move the real audio, which then
 * publishes the time back through setCurrentTime.
 */
let seekHandler: ((t: number) => void) | null = null;

export function registerSeekHandler(fn: ((t: number) => void) | null): void {
  seekHandler = fn;
}

export function requestSeek(t: number): void {
  if (seekHandler) seekHandler(t);
  else useTransportStore.getState().setCurrentTime(t);
}

interface TransportState {
  isPlaying: boolean;
  currentTime: number;
  loopRange: [number, number] | null;
  zoom: number;
  scrollX: number;

  play: () => void;
  pause: () => void;
  toggle: () => void;
  seek: (t: number) => void;
  setZoom: (z: number) => void;
  setScrollX: (x: number) => void;
  setCurrentTime: (t: number) => void;
  setPlaying: (playing: boolean) => void;
}

export const useTransportStore = create<TransportState>((set) => ({
  isPlaying: false,
  currentTime: 0,
  loopRange: null,
  zoom: 50,
  scrollX: 0,

  play: () => set({ isPlaying: true }),
  pause: () => set({ isPlaying: false }),
  toggle: () => set((s) => ({ isPlaying: !s.isPlaying })),
  seek: (t) => set({ currentTime: t }),
  setZoom: (z) => set({ zoom: z }),
  setScrollX: (x) => set({ scrollX: x }),
  setCurrentTime: (t) => set({ currentTime: t }),
  setPlaying: (playing) => set({ isPlaying: playing }),
}));

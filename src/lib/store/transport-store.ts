import { create } from "zustand";

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

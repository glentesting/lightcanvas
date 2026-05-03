export function secondsToPx(s: number, zoom: number): number {
  return s * zoom;
}

export function pxToSeconds(x: number, zoom: number): number {
  return x / zoom;
}

export function snapToBeat(t: number, beats: number[], threshold = 0.06): number {
  if (beats.length === 0) return t;
  let nearest = beats[0];
  let best = Math.abs(t - beats[0]);
  for (const b of beats) {
    const d = Math.abs(t - b);
    if (d < best) {
      best = d;
      nearest = b;
    }
  }
  return best <= threshold ? nearest : t;
}

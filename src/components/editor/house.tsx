"use client";

interface LightState {
  color: string;
  intensity: number;
  outline?: boolean;
}

interface HouseLights {
  roofline?: LightState | null;
  windows?: LightState | null;
  bushes?: LightState | null;
  megaTree?: LightState | null;
  miniTrees?: LightState | null;
  arches?: LightState | null;
}

interface HouseProps {
  width?: number;
  height?: number;
  lights?: HouseLights | null;
  snow?: boolean;
  time?: number;
  id?: string;
}

export default function House({ width = 720, height = 420, lights = null, snow = false, time = 0, id = "house" }: HouseProps) {
  const L = lights || {};
  const tw = (i: number, base = 0.6) => base + 0.4 * Math.sin(time * 4 + i * 1.7);
  // Prefix for gradient IDs to avoid SVG ID collisions when multiple House instances exist
  const p = id;

  return (
    <svg viewBox="0 0 720 420" width={width} height={height} style={{ display: "block" }}>
      <defs>
        <linearGradient id={`${p}-sky`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#1a2440" />
          <stop offset="1" stopColor="#0d1426" />
        </linearGradient>
        <linearGradient id={`${p}-grass`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#2a3a2c" />
          <stop offset="1" stopColor="#1a2820" />
        </linearGradient>
        <linearGradient id={`${p}-wall`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#e9e2d3" />
          <stop offset="1" stopColor="#d4ccba" />
        </linearGradient>
        <linearGradient id={`${p}-wall2`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#dcd3c0" />
          <stop offset="1" stopColor="#c5bca8" />
        </linearGradient>
        <linearGradient id={`${p}-roof`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#5a4d3c" />
          <stop offset="1" stopColor="#3e3326" />
        </linearGradient>
        <radialGradient id={`${p}-glow`} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="white" stopOpacity="0.9" />
          <stop offset="0.5" stopColor="white" stopOpacity="0.3" />
          <stop offset="1" stopColor="white" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* sky */}
      <rect x="0" y="0" width="720" height="320" fill={`url(#${p}-sky)`} />
      {/* stars */}
      {[[80,40],[150,60],[230,30],[310,70],[420,50],[510,35],[600,65],[670,45],[110,90],[290,100],[470,90],[640,100]].map(([x,y],i) => (
        <circle key={i} cx={x} cy={y} r="0.9" fill="#fff" opacity={0.4 + 0.4 * Math.sin(time * 2 + i)} />
      ))}

      {/* ground */}
      <rect x="0" y="300" width="720" height="120" fill={`url(#${p}-grass)`} />
      {/* path */}
      <path d="M320 420 L350 320 L370 320 L400 420 Z" fill="#3a3528" opacity="0.6" />

      {/* main house body */}
      <rect x="180" y="200" width="360" height="120" fill={`url(#${p}-wall)`} />
      {/* main roof gable */}
      <polygon points="170,200 360,110 550,200" fill={`url(#${p}-roof)`} />
      <polygon points="170,200 360,110 550,200" fill="none" stroke="#2a2018" strokeWidth="1" />

      {/* left wing */}
      <rect x="80" y="240" width="120" height="80" fill={`url(#${p}-wall2)`} />
      <polygon points="70,240 140,195 210,240" fill={`url(#${p}-roof)`} />

      {/* right wing */}
      <rect x="520" y="240" width="120" height="80" fill={`url(#${p}-wall2)`} />
      <polygon points="510,240 580,195 650,240" fill={`url(#${p}-roof)`} />

      {/* chimney */}
      <rect x="430" y="130" width="22" height="50" fill="#3a2e22" />
      <rect x="426" y="126" width="30" height="8" fill="#2a2018" />

      {/* windows */}
      {[
        { x: 220, y: 230 },
        { x: 460, y: 230 },
        { x: 105, y: 260 },
        { x: 545, y: 260 },
      ].map((w, i) => {
        const win = L.windows;
        const lit = win && win.intensity > 0;
        const wc = lit ? win.color : "#3a4660";
        const a = lit ? tw(i, 0.7) * win.intensity : 0.5;
        return (
          <g key={i}>
            <rect x={w.x} y={w.y} width="40" height="50" fill={wc} opacity={a} />
            <rect x={w.x} y={w.y} width="40" height="50" fill="none" stroke="#2a2018" strokeWidth="2" />
            <line x1={w.x + 20} y1={w.y} x2={w.x + 20} y2={w.y + 50} stroke="#2a2018" strokeWidth="1.5" />
            <line x1={w.x} y1={w.y + 25} x2={w.x + 40} y2={w.y + 25} stroke="#2a2018" strokeWidth="1.5" />
            {lit && <ellipse cx={w.x + 20} cy={w.y + 25} rx="36" ry="40" fill={`url(#${p}-glow)`} opacity={0.4 * a} />}
            {win && win.outline && Array.from({ length: 18 }).map((_, j) => {
              const t = j / 17;
              let px: number, py: number;
              if (t < 0.25) { px = w.x + t * 4 * 40; py = w.y; }
              else if (t < 0.5) { px = w.x + 40; py = w.y + (t - 0.25) * 4 * 50; }
              else if (t < 0.75) { px = w.x + (1 - (t - 0.5) * 4) * 40; py = w.y + 50; }
              else { px = w.x; py = w.y + (1 - (t - 0.75) * 4) * 50; }
              return <circle key={j} cx={px} cy={py} r="1.8" fill={win.color} opacity={tw(j + i * 3, 0.6)} />;
            })}
          </g>
        );
      })}

      {/* door */}
      <rect x="345" y="245" width="30" height="75" fill="#5a3a2a" />
      <rect x="345" y="245" width="30" height="75" fill="none" stroke="#2a1810" strokeWidth="1.5" />
      <circle cx="368" cy="285" r="1.5" fill="#c0a060" />

      {/* roofline lights */}
      {(() => {
        const rl = L.roofline;
        const points: [number, number][] = [];
        for (let i = 0; i <= 14; i++) { const t = i / 14; points.push([170 + t * 190, 200 - t * 90]); }
        for (let i = 1; i <= 14; i++) { const t = i / 14; points.push([360 + t * 190, 110 + t * 90]); }
        for (let i = 0; i <= 8; i++) { const t = i / 8; points.push([70 + t * 70, 240 - t * 45]); }
        for (let i = 1; i <= 8; i++) { const t = i / 8; points.push([140 + t * 70, 195 + t * 45]); }
        for (let i = 0; i <= 8; i++) { const t = i / 8; points.push([510 + t * 70, 240 - t * 45]); }
        for (let i = 1; i <= 8; i++) { const t = i / 8; points.push([580 + t * 70, 195 + t * 45]); }
        return points.map(([px, py], i) => {
          const lit = rl && rl.intensity > 0;
          const c = lit ? rl.color : "#6b6354";
          const a = lit ? tw(i, 0.55) * rl.intensity : 0.85;
          return <circle key={i} cx={px} cy={py} r={lit ? 2.2 : 1.6} fill={c} opacity={a} />;
        });
      })()}

      {/* bushes */}
      {[
        { cx: 230, cy: 320, rx: 28, ry: 14 },
        { cx: 290, cy: 322, rx: 22, ry: 12 },
        { cx: 480, cy: 320, rx: 30, ry: 14 },
      ].map((b, i) => {
        const bw = L.bushes;
        return (
          <g key={i}>
            <ellipse cx={b.cx} cy={b.cy} rx={b.rx} ry={b.ry} fill="#1f2e1c" />
            <ellipse cx={b.cx - 6} cy={b.cy - 4} rx={b.rx * 0.8} ry={b.ry * 0.7} fill="#28371f" />
            {bw && Array.from({ length: 14 }).map((_, j) => {
              const t = j / 13;
              const ang = Math.PI + t * Math.PI;
              const x = b.cx + Math.cos(ang) * b.rx;
              const y = b.cy + Math.sin(ang) * b.ry;
              return <circle key={j} cx={x} cy={y} r="2" fill={bw.color} opacity={tw(j + i * 5, 0.55) * bw.intensity} />;
            })}
          </g>
        );
      })}

      {/* mini trees */}
      {[{ x: 310, y: 320 }, { x: 410, y: 320 }].map((t, i) => {
        const mt = L.miniTrees;
        return (
          <g key={i}>
            <polygon points={`${t.x},${t.y - 50} ${t.x - 18},${t.y} ${t.x + 18},${t.y}`} fill="#1a2a1c" />
            <polygon points={`${t.x},${t.y - 40} ${t.x - 14},${t.y - 12} ${t.x + 14},${t.y - 12}`} fill="#22361f" opacity="0.7" />
            {mt && Array.from({ length: 8 }).map((_, j) => {
              const ang = (j / 7) * Math.PI - Math.PI / 2;
              const r = 16 + (j % 2) * 4;
              const x = t.x + Math.cos(ang) * r * 0.8;
              const y = t.y - 25 + Math.sin(ang) * 20;
              return <circle key={j} cx={x} cy={y} r="1.8" fill={mt.color} opacity={tw(j + i * 3, 0.6) * mt.intensity} />;
            })}
            <circle cx={t.x} cy={t.y - 52} r="2.5" fill={mt ? mt.color : "#888"} opacity={mt ? tw(i, 0.7) * mt.intensity : 0.5} />
          </g>
        );
      })}

      {/* mega tree */}
      {(() => {
        const mtx = 690, mty = 320, h = 140;
        const mg = L.megaTree;
        return (
          <g>
            <line x1={mtx} y1={mty - h} x2={mtx} y2={mty} stroke="#3a3a3a" strokeWidth="2" />
            {Array.from({ length: 6 }).map((_, ring) =>
              Array.from({ length: 8 }).map((_, k) => {
                const ang = (k / 8) * Math.PI * 2;
                const r = 6 + ring * 5;
                const x = mtx + Math.cos(ang) * r;
                const y = mty - 12 - ring * 22 + Math.sin(ang) * r * 0.3;
                const idx = ring * 8 + k;
                return <circle key={`${ring}-${k}`} cx={x} cy={y} r="2.2" fill={mg ? mg.color : "#888"} opacity={mg ? tw(idx, 0.55) * mg.intensity : 0.5} />;
              })
            )}
            <polygon points={`${mtx},${mty - h - 10} ${mtx - 6},${mty - h + 4} ${mtx + 6},${mty - h + 4}`} fill={mg ? mg.color : "#888"} opacity={mg ? mg.intensity : 0.5} />
          </g>
        );
      })()}

      {/* arches */}
      {[0, 1, 2].map((i) => {
        const cx = 360, cy = 320;
        const ar = L.arches;
        return (
          <g key={i}>
            <path d={`M${cx - 50 + i * 8} ${cy} Q ${cx} ${cy - 50 - i * 5} ${cx + 50 - i * 8} ${cy}`} fill="none" stroke="#2a2018" strokeWidth="1" opacity="0.5" />
            {ar && Array.from({ length: 11 }).map((_, j) => {
              const t = j / 10;
              const x = (cx - 50 + i * 8) + t * (100 - i * 16);
              const arch = cy - 50 - i * 5;
              const y = cy - 4 * t * (1 - t) * (cy - arch);
              return <circle key={j} cx={x} cy={y} r="2" fill={ar.color} opacity={tw(j + i * 3, 0.6) * ar.intensity} />;
            })}
          </g>
        );
      })}

      {/* snow */}
      {snow && Array.from({ length: 30 }).map((_, i) => {
        const x = ((i * 37 + time * 8) % 720);
        const y = ((i * 53 + time * 20) % 420);
        return <circle key={i} cx={x} cy={y} r="1.2" fill="#fff" opacity="0.6" />;
      })}
    </svg>
  );
}

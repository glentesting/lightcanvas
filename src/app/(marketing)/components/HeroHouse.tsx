"use client";

import { useState, useEffect } from "react";

interface RoofPixel {
  x: number;
  y: number;
  hue: number;
  intensity: number;
}

interface TreePixel {
  x: number;
  y: number;
  intensity: number;
  hue: number;
}

interface ArchDot {
  x: number;
  y: number;
  intensity: number;
  hue: number;
  archIdx: number;
}

export default function HeroHouse() {
  const [t, setT] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setReducedMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  useEffect(() => {
    if (reducedMotion) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setT(2.5);
      return;
    }
    let raf: number;
    const start = performance.now();
    const tick = (now: number) => {
      setT((now - start) / 1000);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [reducedMotion]);

  // Beat — show is "142 BPM" → 2.367 beats/sec
  const BPS = 142 / 60;
  const _beatPulse = Math.max(0, 1 - ((t * BPS) % 1) * 1.4);

  // Anchors so roofline traces the real roof.
  const APEX = { x: 340, y: 108 };
  const LEFT = { x: 170, y: 200 };
  const RIGHT = { x: 510, y: 200 };

  // ROOFLINE — color-fade wash with a moving wave of brightness traveling across.
  const roofline: RoofPixel[] = [];
  const RFL_COUNT = 28;
  for (let i = 0; i < RFL_COUNT; i++) {
    let x: number, y: number;
    if (i < 14) {
      const k = i / 13;
      x = LEFT.x + (APEX.x - LEFT.x) * k;
      y = LEFT.y + (APEX.y - LEFT.y) * k;
    } else {
      const k = (i - 14) / 13;
      x = APEX.x + (RIGHT.x - APEX.x) * k;
      y = APEX.y + (RIGHT.y - APEX.y) * k;
    }
    const hue = (t * 40 + i * 14) % 360;
    const wave = 0.55 + 0.45 * Math.sin(t * 2.2 - i * 0.35);
    roofline.push({ x, y, hue, intensity: wave });
  }

  // MEGA TREE — random twinkle/sparkle. Every pixel has its own phase.
  const tree: TreePixel[] = [];
  const TREE_APEX = { x: 615, y: 165 };
  const TREE_BASE_Y = 320;
  const ROWS = 9;
  for (let row = 0; row < ROWS; row++) {
    const k = row / (ROWS - 1);
    const y = TREE_APEX.y + (TREE_BASE_Y - TREE_APEX.y) * k;
    const halfWidth = 4 + k * 38;
    const dotsInRow = 2 + Math.round(k * 7);
    for (let i = 0; i < dotsInRow; i++) {
      const colK = dotsInRow === 1 ? 0.5 : i / (dotsInRow - 1);
      const x = TREE_APEX.x - halfWidth + colK * halfWidth * 2;
      const seed = row * 13.7 + i * 5.1;
      const sparkle = Math.max(0, Math.sin(t * 5 + seed) * Math.sin(t * 3 + seed * 1.7));
      const hue = (seed * 47) % 360;
      tree.push({ x, y, intensity: sparkle, hue });
    }
  }

  // MINI TREE — solid breathe. All pixels share one warm-white intensity.
  const miniBreathe = 0.55 + 0.4 * Math.sin(t * 1.6);

  // ARCH 1 (chase L→R), ARCH 2 (smooth wave), ARCH 3 (rainbow sweep)
  const ARCH_POSITIONS = [
    { cx: 230, cy: 360, r: 36, mode: "chase" },
    { cx: 360, cy: 362, r: 36, mode: "wave" },
    { cx: 490, cy: 360, r: 36, mode: "rainbow" },
  ];
  const archDots: ArchDot[] = [];
  ARCH_POSITIONS.forEach((a, ai) => {
    const dots = 13;
    for (let i = 0; i < dots; i++) {
      const angle = Math.PI + (i / (dots - 1)) * Math.PI;
      const x = a.cx + Math.cos(angle) * a.r;
      const y = a.cy + Math.sin(angle) * a.r;
      let intensity = 0,
        hue = 30;
      if (a.mode === "chase") {
        const phase = (t * 1.6 - i * 0.18) % 1.6;
        const inWindow = phase > 0 && phase < 0.5;
        intensity = inWindow ? 1 : 0.3;
        hue = i % 2 === 0 ? 145 : 30;
      } else if (a.mode === "wave") {
        intensity = 0.55 + 0.45 * Math.sin(t * 2 - i * 0.4);
        hue = 250;
      } else {
        intensity = 0.85;
        hue = (t * 50 + i * 30) % 360;
      }
      archDots.push({ x, y, intensity, hue, archIdx: ai });
    }
  });

  // BUSHES — left = red/green twinkle, right = cool blue twinkle
  const BUSH_CLUSTERS = [
    { cx: 250, cy: 312, count: 7, palette: "rg" },
    { cx: 450, cy: 312, count: 7, palette: "blue" },
  ];

  const winGlow = 0.4 + 0.4 * Math.sin(t * 0.8);
  const blink = Math.floor(t * 0.5) % 6 === 0 && (t * 2) % 1 < 0.18;

  // SINGING MOUTH
  const phraseT = t * 1.8;
  const sing = Math.sin(phraseT) * 0.5 + 0.5;
  const accent = Math.max(0, Math.sin(phraseT * 0.5));
  const mouthOpen = Math.max(0, Math.min(1, sing * accent + Math.sin(t * 4.3) * 0.15));

  return (
    <svg viewBox="0 0 720 420" style={{ width: "100%", height: "100%", display: "block" }}>
      <defs>
        <radialGradient id="hh-glow" cx=".5" cy=".5" r=".5">
          <stop offset="0" stopColor="white" stopOpacity=".95" />
          <stop offset=".5" stopColor="white" stopOpacity=".25" />
          <stop offset="1" stopColor="white" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="hh-sky" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#1a2440" />
          <stop offset="1" stopColor="#0d1426" />
        </linearGradient>
        <linearGradient id="hh-ground" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#243025" />
          <stop offset="1" stopColor="#141c18" />
        </linearGradient>
        <linearGradient id="hh-wall" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#e8e0cf" />
          <stop offset="1" stopColor="#cfc6b0" />
        </linearGradient>
        <linearGradient id="hh-roof" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#564938" />
          <stop offset="1" stopColor="#332a1f" />
        </linearGradient>
        <linearGradient id="hh-tree" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#1f3a26" />
          <stop offset="1" stopColor="#11211a" />
        </linearGradient>
      </defs>

      {/* sky */}
      <rect width="720" height="320" fill="url(#hh-sky)" />
      {[[80, 40], [160, 55], [240, 30], [330, 65], [420, 45], [600, 60], [670, 40]].map(([x, y], i) => (
        <circle key={"s" + i} cx={x} cy={y} r=".9" fill="#fff" opacity={0.4 + 0.4 * Math.sin(t * 1.5 + i)} />
      ))}

      {/* ground */}
      <rect x="0" y="300" width="720" height="120" fill="url(#hh-ground)" />

      {/* main house */}
      <rect x="180" y="200" width="320" height="120" fill="url(#hh-wall)" />
      <polygon points="170,200 340,108 510,200" fill="url(#hh-roof)" />

      {/* windows */}
      {[[230, 230], [290, 230], [400, 230], [460, 230]].map(([x, y], i) => (
        <g key={"w" + i}>
          <rect x={x} y={y} width="40" height="46" fill={`oklch(${72 + winGlow * 8}% 0.14 80)`} opacity={winGlow} />
          <line x1={x + 20} y1={y} x2={x + 20} y2={y + 46} stroke="#3a2f22" strokeWidth="1.5" />
          <line x1={x} y1={y + 23} x2={x + 40} y2={y + 23} stroke="#3a2f22" strokeWidth="1.5" />
          <rect x={x} y={y} width="40" height="46" fill="none" stroke="#2a2018" strokeWidth="2" />
        </g>
      ))}

      {/* door */}
      <rect x="335" y="248" width="30" height="72" fill="#3a2820" />
      <circle cx="358" cy="285" r="1.5" fill="#d4af37" />

      {/* MEGA TREE */}
      <polygon points="615,158 568,322 662,322" fill="url(#hh-tree)" />
      <rect x="608" y="318" width="14" height="10" fill="#2a1f15" />
      <g transform={`translate(615 152) scale(${1 + 0.08 * Math.sin(t * 4)})`}>
        <path
          d="M 0 -8 L 2 -2 L 8 -2 L 3 2 L 5 8 L 0 4 L -5 8 L -3 2 L -8 -2 L -2 -2 Z"
          fill="#ffd76a"
          opacity=".95"
        />
      </g>
      {/* Tree pixels — random twinkle */}
      {tree.map((p, i) => (
        <g key={"t" + i}>
          {p.intensity > 0.55 && (
            <circle cx={p.x} cy={p.y} r="6" fill="url(#hh-glow)" opacity={p.intensity * 0.85} />
          )}
          <circle
            cx={p.x}
            cy={p.y}
            r="2.2"
            fill={`oklch(${65 + p.intensity * 20}% 0.20 ${p.hue})`}
            opacity={0.35 + p.intensity * 0.65}
          />
        </g>
      ))}

      {/* MINI talking tree — solid breathe, mouth sings to the beat */}
      <g transform="translate(85 314) scale(1.18)">
        <rect x="-4" y="22" width="8" height="8" fill="#2a1f15" />
        <polygon points="0,-30 -22,28 22,28" fill="url(#hh-tree)" />
        <path
          d="M 0 -34 L 1.5 -30 L 5.5 -30 L 2.2 -27.5 L 3.5 -23.5 L 0 -26 L -3.5 -23.5 L -2.2 -27.5 L -5.5 -30 L -1.5 -30 Z"
          fill="#ffd76a"
        />
        {/* eyes (with occasional blink) */}
        {blink ? (
          <>
            <line x1="-7" y1="0" x2="-2" y2="0" stroke="#fff" strokeWidth="1.4" strokeLinecap="round" />
            <line x1="2" y1="0" x2="7" y2="0" stroke="#fff" strokeWidth="1.4" strokeLinecap="round" />
          </>
        ) : (
          <>
            <circle cx="-4.5" cy="0" r="1.8" fill="#fff" />
            <circle cx="4.5" cy="0" r="1.8" fill="#fff" />
            <circle cx="-4" cy={0.4 + mouthOpen * 0.3} r=".8" fill="#1a1410" />
            <circle cx="5" cy={0.4 + mouthOpen * 0.3} r=".8" fill="#1a1410" />
          </>
        )}
        {/* SINGING MOUTH */}
        {mouthOpen < 0.25 ? (
          <path d="M -6 7 Q 0 12 6 7" fill="none" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" />
        ) : mouthOpen < 0.6 ? (
          <ellipse cx="0" cy={9} rx="3" ry={2 + mouthOpen * 2} fill="#1a1410" stroke="#fff" strokeWidth="1.2" />
        ) : (
          <g>
            <ellipse
              cx="0"
              cy={9}
              rx={4 + mouthOpen}
              ry={3 + mouthOpen * 2.5}
              fill="#1a1410"
              stroke="#fff"
              strokeWidth="1.2"
            />
            <ellipse cx="0" cy={11} rx="2.5" ry="1.2" fill="oklch(60% 0.18 25)" />
          </g>
        )}
        <circle cx="-9" cy="5" r="1.8" fill="oklch(70% 0.18 25)" opacity=".55" />
        <circle cx="9" cy="5" r="1.8" fill="oklch(70% 0.18 25)" opacity=".55" />
        {/* lights — solid breathe, all together, warm white */}
        {Array.from({ length: 8 }).map((_, i) => {
          const row = Math.floor(i / 2);
          const side = i % 2 ? 1 : -1;
          const ty = -22 + row * 12;
          const tx = side * (3 + row * 4);
          return (
            <g key={"mtl" + i}>
              {miniBreathe > 0.65 && (
                <circle cx={tx} cy={ty} r="5" fill="url(#hh-glow)" opacity={miniBreathe * 0.6} />
              )}
              <circle
                cx={tx}
                cy={ty}
                r="1.8"
                fill={`oklch(${72 + miniBreathe * 10}% 0.10 80)`}
                opacity={miniBreathe}
              />
            </g>
          );
        })}
      </g>

      {/* ROOFLINE — color wash with traveling brightness wave */}
      {roofline.map((p, i) => (
        <g key={"r" + i}>
          <circle cx={p.x} cy={p.y} r={9 + p.intensity * 4} fill="url(#hh-glow)" opacity={0.4 + p.intensity * 0.4} />
          <circle cx={p.x} cy={p.y} r="2.8" fill={`oklch(${68 + p.intensity * 15}% 0.18 ${p.hue})`} />
        </g>
      ))}

      {/* ARCHES — 3 different effects */}
      {ARCH_POSITIONS.map((a, ai) => (
        <path
          key={"arch-bg-" + ai}
          d={`M ${a.cx - a.r} ${a.cy} A ${a.r} ${a.r} 0 0 1 ${a.cx + a.r} ${a.cy}`}
          fill="none"
          stroke="#5a4a32"
          strokeWidth="2"
          opacity=".9"
        />
      ))}
      {archDots.map((p, i) => (
        <g key={"arch-" + i}>
          {p.intensity > 0.4 && (
            <circle cx={p.x} cy={p.y} r="11" fill="url(#hh-glow)" opacity={p.intensity * 0.85} />
          )}
          <circle
            cx={p.x}
            cy={p.y}
            r="2.8"
            fill={`oklch(${68 + p.intensity * 18}% 0.18 ${p.hue})`}
            opacity={0.4 + p.intensity * 0.6}
          />
        </g>
      ))}

      {/* BUSHES under windows — different palettes per side */}
      {BUSH_CLUSTERS.map((cluster, ci) => (
        <g key={"bc" + ci}>
          <ellipse cx={cluster.cx} cy={cluster.cy + 4} rx="34" ry="9" fill="#243025" opacity=".95" />
          {Array.from({ length: cluster.count }).map((_, i) => {
            const x = cluster.cx - 24 + i * 8;
            const y = cluster.cy - 2 + Math.sin(i * 0.9) * 2;
            const seed = ci * 11 + i * 3.7;
            const tw = Math.max(0, Math.sin(t * 4.2 + seed) * Math.sin(t * 2.8 + seed * 1.3));
            let hue: number;
            if (cluster.palette === "rg") {
              hue = i % 2 === 0 ? 30 : 145;
            } else {
              hue = 220 + (i % 3) * 20;
            }
            return (
              <g key={"bd" + ci + "-" + i}>
                {tw > 0.45 && <circle cx={x} cy={y} r="6" fill="url(#hh-glow)" opacity={tw * 0.7} />}
                <circle cx={x} cy={y} r="2.2" fill={`oklch(78% 0.18 ${hue})`} opacity={0.35 + tw * 0.65} />
              </g>
            );
          })}
        </g>
      ))}

      {/* gentle snow drift */}
      {Array.from({ length: 18 }).map((_, i) => {
        const seed = i * 41;
        const x = (seed + t * 6 + Math.sin(t + i) * 8) % 720;
        const y = (seed * 0.7 + t * 14) % 320;
        return <circle key={"sn" + i} cx={x} cy={y} r=".8" fill="#fff" opacity=".4" />;
      })}
    </svg>
  );
}

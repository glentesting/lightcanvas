# 10 — Design System & UI Tokens

The prototype's `styles.css` is the source of truth. Translate it into Tailwind config + shadcn theme so the existing components consume these values.

## Tailwind config

```ts
// tailwind.config.ts
export default {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: 'var(--bg)',
        surface: 'var(--surface)',
        panel: 'var(--panel)',
        'panel-2': 'var(--panel-2)',
        line: 'var(--line)',
        'line-2': 'var(--line-2)',
        ink: { DEFAULT: 'var(--ink)', 2: 'var(--ink-2)', 3: 'var(--ink-3)', 4: 'var(--ink-4)' },
        accent: {
          DEFAULT: 'var(--accent)',
          50: 'var(--accent-50)', 100: 'var(--accent-100)', 200: 'var(--accent-200)',
          600: 'var(--accent-600)', 700: 'var(--accent-700)', ink: 'var(--accent-ink)',
        },
        xmas: { red: 'var(--xmas-red)', green: 'var(--xmas-grn)', gold: 'var(--xmas-gold)' },
        fx: {
          twinkle: 'var(--fx-twinkle)', chase: 'var(--fx-chase)', fade: 'var(--fx-fade)',
          strobe: 'var(--fx-strobe)', sparkle: 'var(--fx-sparkle)', wave: 'var(--fx-wave)',
          pulse: 'var(--fx-pulse)', wash: 'var(--fx-wash)', meteor: 'var(--fx-meteor)',
          firework: 'var(--fx-firework)',
        },
      },
      fontFamily: {
        sans: ['Inter Tight', 'system-ui', 'sans-serif'],
        display: ['Fraunces', 'Iowan Old Style', 'serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },
      borderRadius: { sm: '6px', DEFAULT: '10px', lg: '14px' },
      boxShadow: {
        sm: '0 1px 2px rgba(20,22,28,.04), 0 1px 1px rgba(20,22,28,.03)',
        DEFAULT: '0 1px 2px rgba(20,22,28,.04), 0 4px 14px rgba(20,22,28,.06)',
        lg: '0 8px 28px rgba(20,22,28,.10), 0 2px 6px rgba(20,22,28,.05)',
      },
    },
  },
};
```

## Global CSS (app/globals.css)

Copy `:root` from the prototype's `styles.css`. Drop the `--d` density multiplier — Tailwind has its own scale; we don't need a runtime density toggle in production.

Add font imports:

```css
@import url('https://fonts.googleapis.com/css2?family=Inter+Tight:wght@400;500;600;700&family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600&family=JetBrains+Mono:wght@400;500&display=swap');
```

## shadcn theme

`components.json` should already be configured. Update `globals.css` shadcn vars to use our tokens:

```css
:root {
  --background: 60 6% 98%;       /* same as --bg */
  --foreground: 220 5% 12%;      /* --ink */
  --primary: 210 100% 55%;       /* derived from accent */
  --primary-foreground: 0 0% 100%;
  --border: 40 8% 89%;           /* --line */
  --radius: 0.625rem;            /* 10px */
  /* …rest mapped */
}
```

shadcn uses HSL, our tokens are oklch — recompute by hand or use a script (`oklch-to-hsl`).

## Component principles

- **Buttons:** primary uses `bg-accent text-white`; secondary uses `bg-surface border border-line`; ghost uses `hover:bg-panel`. Heights 28/34/42px (sm/default/lg).
- **Inputs:** `bg-surface border border-line rounded`, focus ring is `accent` at 2px.
- **Modals:** background `bg-surface`, overlay is `bg-bg/80 backdrop-blur-md` — never dark.
- **Dropdowns/popovers:** `bg-surface border border-line shadow-lg` — never dark.
- **Cards:** `bg-surface border border-line rounded-lg p-4`.
- **Effect chips in palette:** circle dot in `fx-{effectId}` color, label, kbd shortcut.
- **Block on timeline:** background = `fx-{id}/15` (Tailwind opacity), border = `fx-{id}/40`, hover ring = `accent/50`.

## Type scale

Use Tailwind's defaults but commit to:
- Display headings (welcome, dashboard h1): `font-display text-3xl md:text-5xl tracking-tight`
- Section headers (sidebar groups): `text-xs uppercase tracking-wider text-ink-3 font-medium`
- Body: default 14px (`text-sm`)
- Labels: `text-xs text-ink-3`
- Mono (timecodes, keyboard hints): `font-mono text-xs`

## Iconography

Use `lucide-react`. Match the prototype's icon mappings:
- House, Tree, Sparkles, Bulb, Wave, Layers, Play, Pause, Square, RotateCcw, Wand2 (AI), Download, Settings, Plus, Search, ChevronRight, ChevronDown, MoreHorizontal, X.

For fixture-specific icons (mega tree, arch, roofline) — Lucide doesn't have these. Hand-roll small inline SVGs in `components/lumen/fixture-icon.tsx`, copying from the prototype's `icons.jsx`.

## Acceptance

- [ ] Tailwind classes like `bg-accent`, `text-fx-chase`, `border-line` resolve to the prototype's exact colors
- [ ] All shadcn components (Button, Dialog, DropdownMenu, etc) render light, never dark
- [ ] Tweaking `--accent-h` in :root retints the entire app
- [ ] Fonts load on first paint without FOUT (preload critical weights)

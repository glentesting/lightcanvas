# LightShow AI — Full Roadmap

Last updated: May 2026

---

## MVP (v1) — "Glen can build his 2026 Christmas show"

Goal: working editor → export → runs in xLights. Everything below is required for v1.

### Core Infrastructure
| Feature | Status |
|---------|--------|
| GitHub repo + Vercel deployment | ✅ Done |
| Supabase DB — single-table JSONB schema | ✅ Done |
| Clerk auth (email + Google, protected routes) | ✅ Done |
| Environment variables (local + Vercel) | ✅ Done |

### Dashboard
| Feature | Status |
|---------|--------|
| Project list with cards | ✅ Done |
| Create new project (dialog) | ✅ Done |
| Delete project | ✅ Done |
| Rename project | ✅ Done |
| Duplicate project | ✅ Done |

### Editor Shell
| Feature | Status |
|---------|--------|
| Top bar: logo, breadcrumb, rename, song chip | ✅ Done |
| Tab system: Audio Timeline / Layout / Preview | ✅ Done |
| Tab-aware sidebar | ✅ Done |
| Autosave (1.2s debounce, status indicator) | ✅ Done |
| Zustand store with undo/redo (zundo) | ✅ Done |

### Audio Engine
| Feature | Status |
|---------|--------|
| Audio file upload to Supabase Storage | ✅ Done |
| Signed URL audio serving | ✅ Done |
| WaveSurfer waveform rendering | ✅ Done |
| Play / pause / stop / seek | ✅ Done |
| Spacebar toggles play/pause | ✅ Done |
| Beat detection: BPM estimation + onset grid (Meyda) | ✅ Done |
| Beat markers + numbered downbeats on waveform | ✅ Done |
| Analysis persisted to DB (no re-analysis on reload) | ✅ Done |

### Timeline Editor
| Feature | Status |
|---------|--------|
| Fixture track rows rendered | ✅ Done |
| Effect palette (10 effects) | ✅ Done |
| Drag effect from palette → creates block | ✅ Done |
| Beat snapping on drop | ✅ Done |
| Drag existing blocks to move | ✅ Done |
| Resize blocks via edge handles | ✅ Done |
| Click to select, Shift/Cmd multi-select | ✅ Done |
| Selection toolbar (Delete, Duplicate) | ✅ Done |
| Right-click context menu | ✅ Done |
| Per-block parameter panel (color, intensity, speed, easing) | ✅ Done |
| Keyboard shortcuts (Cmd+Z, Cmd+Shift+Z, Cmd+A, Cmd+D, Escape, Delete) | ✅ Done |
| Marquee (rectangle) selection | ❌ Low priority / deferred |

### Layout Editor
| Feature | Status |
|---------|--------|
| Stylized house SVG illustration | ✅ Done |
| Default 6-fixture starter pack pre-placed (988px total) | ✅ Done |
| Draggable prop shapes on canvas | ✅ Done |
| Add Prop dialog (6 templates, auto-naming, channel allocation) | ✅ Done |
| Properties panel (Pixels, Universe, Start Ch, Direction) | ✅ Done |
| Toolstrip (Select, Pen, Rect, Circle, Snap) | ✅ Done |
| Freeform / Grid snap toggle | ✅ Done |
| Layout → Timeline connection | ✅ Done |
| Upload custom house photo | ❌ Not started |

### Preview Engine
| Feature | Status |
|---------|--------|
| Pure render engine: (sequence, fixtures, t) → pixels | ✅ Done |
| 10 effect renderers (twinkle, chase, fade, strobe, sparkle, wave, pulse, wash, meteor, firework) | ✅ Done |
| House SVG with animated lights | ✅ Done |
| Preview tab transport controls + scrubber | ✅ Done |
| Preview tab visually rendering | ✅ Done (was flex height collapse — fixed) |

### AI Actions Panel
| Feature | Status |
|---------|--------|
| Slide-in panel UI | ✅ Done |
| Vibe / intensity config | ✅ Done |
| Generate sequence (primary action, filled blue) | ✅ Done |
| Secondary actions (Analyze audio, Refine timing, Generate palette) | ✅ Done |
| Mock AI provider (3-layer composition) | ✅ Done |
| SSE streaming with progress bar + thought bubbles | ✅ Done |
| Undo/Keep after generation, Cancel mid-stream | ✅ Done |

### Export
| Feature | Status |
|---------|--------|
| Export dialog UI (format picker, time range, options) | ✅ Done |
| LightCanvas JSON export + zod-validated import | ✅ Done |
| xLights .xsq XML export (2024 format, all 10 effects) | ✅ Done |
| WebM video preview export (canvas + MediaRecorder) | ✅ Done |
| Server-side export API route (auth + Content-Disposition) | ✅ Done |
| E1.31 / DMX export | ❌ Not started — v2 |

### Onboarding & Polish
| Feature | Status |
|---------|--------|
| 3-step onboarding wizard (creative track) | ✅ Done |
| Empty / loading / error states (all screens) | ❌ Not started |
| Design polish pass (match prototype exactly) | ✅ Done |
| Full smoke test (sign up → export) | ✅ Done (build + type check) |

---

## v2.0 — "Product-market fit"

Real AI, hardware integration, broader platform features.

### AI
| Feature | Status |
|---------|--------|
| Real Anthropic API integration (swap mock provider) | ❌ Not started |
| AI style presets ("TSO style", "Calm & Elegant", etc.) | ❌ Not started |
| AI remix ("Make it more energetic", "Use more red/green") | ❌ Not started |
| AI variation generator | ❌ Not started |
| AI color palette generation from song mood | ❌ Not started |
| AI layout detection from house photo | ❌ Not started |

### Hardware Bridge
| Feature | Status |
|---------|--------|
| LightCanvas Bridge desktop app (Tauri) | ❌ Not started |
| E1.31 / sACN output driver | ❌ Not started |
| WLED HTTP/JSON output driver | ❌ Not started |
| DDP / Art-Net drivers (stub in v1) | ❌ Not started |
| Controller discovery (mDNS + manual add) | ❌ Not started |
| Bridge ↔ cloud WebSocket gateway | ❌ Not started |
| Mirror Preview to real lights (≤80ms latency) | ❌ Not started |
| Test fixture button (3-second rainbow chase) | ❌ Not started |
| Show scheduling (RRULE-based, via Bridge) | ❌ Not started |

### Onboarding — Hardware Track
| Feature | Status |
|---------|--------|
| Designer vs Operator branching onboarding | ❌ Not started |
| 6-step hardware wizard (install Bridge → schedule show) | ❌ Not started |
| Controller discovery UI | ❌ Not started |
| Fixture-to-controller mapping | ❌ Not started |

### Mobile & Remote
| Feature | Status |
|---------|--------|
| Mobile redirect with "best on desktop" message | ❌ Not started |
| Read-only Preview view on mobile | ❌ Not started |
| Show Remote PWA (play/pause/schedule from phone) | ❌ Not started |

### Export Additions
| Feature | Status |
|---------|--------|
| xLights .fseq binary export | ❌ Deferred to v2 |
| MP4 transcode from WebM (ffmpeg.wasm) | ❌ Deferred to v2 |

### Settings & Account
| Feature | Status |
|---------|--------|
| Settings page (account, hardware, schedules, billing) | ❌ Not started |
| Billing placeholder + upgrade flow | ❌ Not started |
| Multiple house styles (Ranch, Two-Story, Craftsman) | ❌ Not started |
| Upload custom house photo | ❌ Not started |

### Platform
| Feature | Status |
|---------|--------|
| Public read-only project share link `/p/[token]` | ❌ Not started |
| Accessibility: WCAG 2.2 AA compliance | ❌ Not started |
| Performance budgets + Lighthouse CI | ❌ Not started |
| Telemetry: Sentry errors + PostHog analytics | ❌ Not started |
| Legal: Terms of Service, Privacy Policy, DMCA | ❌ Not started |

---

## v3.0 — Platform / Marketplace

| Feature | Status |
|---------|--------|
| Sequence marketplace (buy/sell shows) | ❌ Future |
| Effect packs for purchase | ❌ Future |
| User profiles + community show sharing | ❌ Future |
| Batch sequencing for professional installers | ❌ Future |
| Multi-house / commercial display projects | ❌ Future |
| Year-round lighting (Halloween, weddings, events) | ❌ Future |
| Real-time collaborative editing | ❌ Future (hard no for v1–v2) |

---

## Open Questions (Unresolved)

- Max audio file size? Recommend 30MB / 15 min cap.
- Per-track effect layering? Single layer in v1 recommended.
- App name — "LightCanvas" is the official product name.
- Tauri vs Electron for Bridge? Tauri preferred (size), Electron has more UDP examples.
- Free vs paid tier specifics — deferred.
- Audio rights checkbox at upload — confirm liability posture with counsel before launch.

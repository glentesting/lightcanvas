# LightCanvas — Landing Page Build Brief

You are building the **marketing landing page** for **LightCanvas** — an AI-assisted Christmas light show designer. Think "Canva for Christmas lights." The product lets hobbyist decorators upload a song, sync effects to the beat, preview their house lighting up, and export to xLights or Light-O-Rama.

**The product is called LightCanvas.** Not "Lightshow AI" — ignore any references to that name in the source files. Use LightCanvas everywhere.

---

## What you're building

A single marketing page at the root `/` route. Auth-gated routes (`/dashboard`, `/project/*`) live elsewhere and are not touched by this task.

The approved prototype is in `landing-source/LightCanvas-Landing.html`. **Port it faithfully — do not redesign.** Every design decision in that file is intentional.

Supporting source files are in `landing-source/`:
- `landing-styles.css` — full visual system for the landing page
- `styles.css` — base design tokens (CSS custom properties)
- `hero-house.jsx` — the animated house illustration (React)
- `landing-pricing.jsx` — pricing cards + comparison table
- `landing-marketplace.jsx` — marketplace teaser section
- `landing-sections.jsx` — features, testimonials, FAQ, footer

---

## Stack

Already in the repo:
- Next.js App Router · TypeScript · Tailwind CSS · Clerk (auth)

For this task:
- Keep landing CSS as a global stylesheet — don't fight Tailwind's purge with heavily custom CSS
- React Server Components where possible
- The hero house animation **must be** `"use client"` — it uses `requestAnimationFrame`
- No new npm packages needed

---

## Route and file structure to create

```
app/(marketing)/
  layout.tsx              # minimal layout — no editor chrome
  page.tsx                # renders all landing sections in order
  landing.css             # paste landing-styles.css content here
  components/
    Nav.tsx               # sticky nav with blur on scroll
    Hero.tsx              # headline + CTAs + trust row + house illustration
    HeroHouse.tsx         # animated SVG house — "use client"
    StatsBand.tsx         # 4 numbers (designers, avg time, pixels, price)
    LogoStrip.tsx         # "Works with" + partner logos
    FeatureSection.tsx    # 3 deep-dives, alternating image layout
    MarketplaceSection.tsx
    TestimonialSection.tsx
    PricingSection.tsx    # 4 tiers + monthly/annual toggle + credits explainer
    ComparisonTable.tsx   # collapsible full feature matrix
    FAQSection.tsx        # accordion, independent expand/collapse
    FinalCTA.tsx
    Footer.tsx
```

---

## Sections in order

1. **Nav** — LightCanvas logo + wordmark, Features/Marketplace/Pricing/FAQ links, "Sign in" + "Start free" buttons. Sticky. Subtle backdrop-blur once scrolled.
2. **Hero** — H1: "Light shows, without the spreadsheet." Lead copy. Two CTAs. Trust row (avatars + stars + "2,400+ home decorators and pros"). Animated house on right with overlay pills (Live preview · 142 BPM · song name).
3. **Stats band** — 4 numbers: 2,400+ designers · 38 min avg · 14M+ pixels · $0 to start.
4. **Logo strip** — "Works with" + xLights, Falcon, Pixlite, Kulp, FPP, Hinkspix.
5. **Feature section** — Three deep-dives: AI Timeline, Layout View, Live Preview. Alternating image-left/right layout.
6. **Marketplace section** — Creator marketplace teaser + preview cards.
7. **Testimonials** — Three quotes: hobbyist, pro installer, ambitious dad persona.
8. **Pricing** — 4 tiers: Free / Creator $19 / Pro $49 / Installer $149. Monthly/annual toggle (annual = 15% off). Credits explainer below cards. Pull exact values from `landing-pricing.jsx` — do not invent numbers.
9. **Comparison table** — Full feature matrix across 4 tiers. Collapsible.
10. **FAQ** — 8-10 Q&As. Each expands/collapses independently.
11. **Final CTA** — "Start your show" panel.
12. **Footer** — Product / Resources / Company / Legal columns + social.

---

## Pricing — exact values (do not change)

- **Free** — $0 · 50 credits/mo · 1 GB storage · 50% rev share
- **Creator** — $19/mo · 1,500 cr/mo · 25 GB · 60% rev share
- **Pro** — $49/mo · 6,000 cr/mo · 100 GB · 70% rev share
- **Installer** — $149/mo · 25,000 cr/mo · 500 GB · 75% rev share

Annual = 15% off the monthly rate. Do not write "X free months." Add early access + priority renders as annual perks.

---

## Hero house animation — port carefully

`hero-house.jsx` is the animated SVG. Keep all timing constants. Wrap in `useEffect` + `requestAnimationFrame`. Each element runs its own loop:
- **Roofline** — chromatic color wash + brightness wave
- **Mega tree** — randomised twinkle/sparkle per pixel
- **Three arches** — center has sine-wave breathe; outer two run independent chases
- **Mr. Tree** (left mini tree) — face animation: blinking eyes, rosy cheeks, mouth synced to a fake lyric loop
- **Bushes** — slow color crossfade

**Required:** respect `prefers-reduced-motion` — fall back to a static lit state.

---

## Visual system — preserve exactly

- **Fonts:** Fraunces (display, italic accents), Inter Tight (UI), JetBrains Mono (meta labels)
- **Colors:** warm cream paper · deep ink · sky-blue accent · lumi yellow for AI/glow elements
- **Shapes:** 16–24px border-radius on cards, 999px on pills
- **Tone:** warm, Canva-adjacent, slightly playful — not DAW-clinical

All tokens live in `styles.css`. Import as CSS custom properties. Do not redefine in Tailwind config.

---

## CTAs and routing

- All "Start free" / "Get started" CTAs → `/sign-up`
- "Sign in" → `/sign-in`
- "Watch the 90-second tour" → `#` (placeholder, no video yet)
- Marketplace "Browse shows" → `#` (placeholder)
- Pricing CTAs → `/sign-up?plan=creator` (etc.) — Clerk will handle

---

## Acceptance criteria

- Renders visually identical to `LightCanvas-Landing.html` at 375px, 768px, and 1440px
- Lighthouse Performance ≥ 90 on mobile
- All animations respect `prefers-reduced-motion`
- Keyboard-navigable; focus rings visible
- Pricing toggle is functional (state only — no Stripe)
- Comparison table collapses/expands with smooth animation
- FAQ items expand/collapse independently
- No console errors on load
- `next build` completes without TypeScript errors

---

## Out of scope for this task

- Stripe integration (CTAs only)
- Marketplace browsing pages (teaser section only)
- Video for "Watch the tour" (link to `#`)
- Auth flow changes (Clerk already wired)

---

## If you find yourself "improving" the design — stop and ask.

The prototype has been heavily iterated. Port faithfully.

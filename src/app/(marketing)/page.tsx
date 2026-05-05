import Link from "next/link";
import PricingSection from "./components/PricingSection";
import HeroHouse from "./components/HeroHouse";

function Nav() {
  return (
    <nav className="lp-nav">
      <div className="lp-nav-inner">
        <div className="lp-logo">
          <div className="lp-logo-mark">&#10022;</div>
          LightCanvas
        </div>
        <div className="lp-nav-links" style={{ display: "flex" }}>
          <a href="#features">Features</a>
          <a href="#marketplace">Marketplace</a>
          <a href="#pricing">Pricing</a>
          <a href="#faq">FAQ</a>
        </div>
        <div className="lp-nav-cta">
          <Link href="/sign-in" className="btn ghost sm">Sign in</Link>
          <Link href="/sign-up" className="btn primary sm">Start free</Link>
        </div>
      </div>
    </nav>
  );
}

function Hero() {
  return (
    <section className="lp-hero lp-section">
      <div className="lp-hero-bg" />
      <div className="lp-hero-grid">
        <div>
          <span className="lp-eyebrow">&#10022; Now in early access</span>
          <h1 className="lp-h1">Light shows, <em>without</em> the spreadsheet.</h1>
          <p className="lp-lead">
            Drop in a song. LightCanvas finds the beats, drops, and quiet moments — then helps you choreograph thousands of lights to them. The show your neighbors will stop their cars for, made in an afternoon, not a winter.
          </p>
          <div className="lp-hero-cta">
            <Link href="/sign-up" className="btn primary lg">Start designing — free</Link>
            <a href="#" className="btn lg">Watch the 90-second tour</a>
          </div>
          <div className="lp-trust">
            <div className="lp-avatars">
              <div className="av" />
              <div className="av" />
              <div className="av" />
              <div className="av" />
            </div>
            <div>
              <div className="stars">&#9733;&#9733;&#9733;&#9733;&#9733;</div>
              <div>Loved by 2,400+ home decorators and pros</div>
            </div>
          </div>
        </div>
        <div className="lp-hero-stage">
          <HeroHouse />
          <div className="lp-hero-overlay">
            <div className="lp-pill"><span className="dot" />Live preview &middot; 142 BPM</div>
            <div className="lp-pill" style={{ marginLeft: "auto" }}>Wizards in Winter</div>
          </div>
        </div>
      </div>

      <div className="lp-stats">
        <div><div className="lp-stat-num">2,400+</div><div className="lp-stat-lbl">Active light designers</div></div>
        <div><div className="lp-stat-num">38 min</div><div className="lp-stat-lbl">Avg. time to first show</div></div>
        <div><div className="lp-stat-num">14M+</div><div className="lp-stat-lbl">Pixels rendered nightly</div></div>
        <div><div className="lp-stat-num">$0</div><div className="lp-stat-lbl">To make your first show</div></div>
      </div>
    </section>
  );
}

function LogoStrip() {
  return (
    <div className="lp-logos">
      <span style={{ fontSize: 11, letterSpacing: ".1em", textTransform: "uppercase", marginRight: 12 }}>Works with</span>
      <span className="logo-item">xLights</span>
      <span className="logo-item">Falcon</span>
      <span className="logo-item">Pixlite</span>
      <span className="logo-item">Kulp</span>
      <span className="logo-item">FPP</span>
      <span className="logo-item">Hinkspix</span>
    </div>
  );
}

function FeatureSection() {
  return (
    <section className="lp-section" id="features">
      <div style={{ textAlign: "center", marginBottom: 64 }}>
        <span className="lp-eyebrow">What it actually does</span>
        <h2 className="lp-h2" style={{ marginTop: 20 }}>From <em>&ldquo;I have an idea&rdquo;</em> to lights on the house, in an hour.</h2>
      </div>

      {/* Feature 1: Audio Timeline */}
      <div className="lp-feature">
        <div className="lp-feature-text">
          <div className="lp-feature-eyebrow">01 &middot; Audio Timeline</div>
          <h3 className="lp-feature-h">Drop a song. Watch the beats appear.</h3>
          <p className="lp-feature-p">Upload any MP3 and LightCanvas analyzes it instantly — BPM, downbeats, every drop. Drag effects onto fixture tracks the way you&apos;d cut a video. Snap to beat is on by default. Hold Alt to break the rules.</p>
          <ul className="lp-feature-list">
            <li>Real beat detection — not approximations</li>
            <li>Drag, resize, multi-select, undo/redo</li>
            <li>Snap to beat with a keyboard shortcut to disable</li>
            <li>Per-block parameter editor for color, intensity, easing</li>
          </ul>
        </div>
        <div className="lp-feature-art" style={{ background: "linear-gradient(180deg, oklch(96% 0.04 250), oklch(98% 0.02 250))" }}>
          <div style={{ padding: 24, height: "100%", display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ height: 24, background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 4, display: "flex", alignItems: "center", padding: "0 8px", fontSize: 11, color: "var(--ink-3)", fontFamily: "var(--font-mono)" }}>0:00 &middot; 0:08 &middot; 0:16 &middot; 0:24 &middot; 0:32</div>
            <div style={{ height: 36, background: "linear-gradient(90deg, var(--accent-100), var(--accent-200), var(--accent-100))", borderRadius: 4, position: "relative" }}>
              {[8, 24, 56, 96, 152, 200, 248, 296, 320].map((x, i) => (
                <div key={i} style={{ position: "absolute", left: `${x / 3.6}%`, top: 0, bottom: 0, width: 1, background: "var(--accent-700)", opacity: 0.4 }} />
              ))}
            </div>
            {[
              [{ c: "fx-fade", s: 0, w: 30 }, { c: "fx-chase", s: 32, w: 25 }, { c: "fx-wave", s: 60, w: 20 }],
              [{ c: "fx-twinkle", s: 5, w: 18 }, { c: "fx-firework", s: 28, w: 30 }, { c: "fx-pulse", s: 62, w: 22 }],
              [{ c: "fx-sparkle", s: 0, w: 22 }, { c: "fx-chase", s: 25, w: 20 }, { c: "fx-wash", s: 50, w: 30 }],
              [{ c: "fx-fade", s: 0, w: 60 }, { c: "fx-twinkle", s: 62, w: 25 }],
            ].map((row, ri) => (
              <div key={ri} style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <div style={{ width: 60, fontSize: 10, color: "var(--ink-3)", fontFamily: "var(--font-mono)" }}>{["Roof", "Tree", "Arches", "Window"][ri]}</div>
                <div style={{ flex: 1, height: 22, background: "var(--surface)", borderRadius: 4, position: "relative", border: "1px solid var(--line)" }}>
                  {row.map((b, bi) => (
                    <div key={bi} style={{ position: "absolute", left: `${b.s}%`, width: `${b.w}%`, top: 2, bottom: 2, background: `color-mix(in oklab, var(--${b.c}), white 70%)`, borderLeft: `3px solid var(--${b.c})`, borderRadius: 2 }} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Feature 2: AI Actions */}
      <div className="lp-feature flip">
        <div className="lp-feature-art" style={{ background: "linear-gradient(135deg, oklch(94% 0.06 280), oklch(96% 0.04 220))", padding: 24, display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ padding: "14px 16px", background: "var(--surface)", borderRadius: 10, border: "1px solid var(--line)", display: "flex", gap: 12, alignItems: "center" }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: "linear-gradient(135deg, var(--accent), oklch(70% 0.18 280))", display: "grid", placeItems: "center", color: "white", fontSize: 16 }}>&#10022;</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>Generate from Music</div>
              <div style={{ fontSize: 11.5, color: "var(--ink-3)" }}>Listen &rarr; map &rarr; compose</div>
            </div>
          </div>
          <div style={{ padding: "12px 14px", background: "var(--surface)", borderRadius: 10, border: "1px solid var(--accent-100)", fontSize: 12.5, color: "var(--ink-2)", lineHeight: 1.5 }}>
            <span style={{ color: "var(--accent-700)", fontWeight: 600 }}>Detected 142 BPM, 6 drops.</span> Building chase patterns on the roofline for the chorus, fireworks on the mega tree at every drop, slow fades on the windows&hellip;
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {["Twinkle", "Chase", "Firework", "Wave", "Pulse", "Wash"].map((e) => (
              <div key={e} style={{ padding: "4px 10px", background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 999, fontSize: 11.5, color: "var(--ink-2)" }}>+ {e}</div>
            ))}
          </div>
          <div style={{ marginTop: "auto", padding: "10px 14px", background: "oklch(96% 0.06 145)", borderRadius: 8, fontSize: 12, color: "oklch(35% 0.1 145)", fontWeight: 500, display: "flex", justifyContent: "space-between" }}>
            <span>&#10003; Added 34 effects across 6 fixtures</span>
            <span style={{ textDecoration: "underline", cursor: "pointer" }}>Undo</span>
          </div>
        </div>
        <div className="lp-feature-text">
          <div className="lp-feature-eyebrow">02 &middot; AI Actions</div>
          <h3 className="lp-feature-h">An AI that <em>actually</em> understands your song.</h3>
          <p className="lp-feature-p">Click &ldquo;Generate from Music&rdquo; and watch a full sequence appear — chase patterns on the chorus, fireworks on every drop, slow fades on the bridge. Don&apos;t like it? Hit undo, tweak the vibe, run it again.</p>
          <ul className="lp-feature-list">
            <li>Generate, Suggest Drops, Style Transfer, Fill Gaps, Describe</li>
            <li>Pick a vibe — Classic, Jazz, EDM, Cinematic, Whimsical</li>
            <li>Every AI run is one undo step — never destroys your work</li>
            <li>Set start/end time to AI just one section</li>
          </ul>
        </div>
      </div>

      {/* Feature 3: Live Preview */}
      <div className="lp-feature">
        <div className="lp-feature-text">
          <div className="lp-feature-eyebrow">03 &middot; Live Preview</div>
          <h3 className="lp-feature-h">See it on your house — before you climb a ladder.</h3>
          <p className="lp-feature-p">A pixel-accurate preview rendered against a stylized house. Switch to Fancy mode for bloom and glow. Scrub the timeline and watch the lights update in real time. Export the preview as a video to send to your spouse before you commit.</p>
          <ul className="lp-feature-list">
            <li>Pixel-accurate — every LED rendered, not approximated</li>
            <li>SVG default + canvas Fancy mode with bloom</li>
            <li>Real-time scrubbing — see any frame instantly</li>
            <li>Export as video to share before showtime</li>
          </ul>
        </div>
        <div className="lp-feature-art" style={{ background: "linear-gradient(180deg, oklch(20% 0.05 250), oklch(12% 0.03 250))", position: "relative", overflow: "hidden" }}>
          <HeroHouse />
        </div>
      </div>
    </section>
  );
}

function MarketplaceSection() {
  const cards = [
    { title: "Wizards in Winter", creator: "@trans-siberian-todd", genre: "Cinematic \u00b7 142 BPM", price: "$24", plays: "12.4k", stars: "4.9", badge: "Top seller", g: "linear-gradient(135deg, oklch(40% 0.18 280), oklch(55% 0.20 30))", preview: "spike" as const },
    { title: "Carol of the Bells (Remix)", creator: "@megatree-mom", genre: "Hybrid \u00b7 128 BPM", price: "$18", plays: "8.7k", stars: "4.8", g: "linear-gradient(135deg, oklch(35% 0.15 220), oklch(50% 0.18 175))", preview: "wave" as const },
    { title: "All I Want for Christmas", creator: "@northpole-nick", genre: "Pop \u00b7 150 BPM", price: "$15", plays: "21.2k", stars: "4.9", badge: "\u2b50 Verified Pro", g: "linear-gradient(135deg, oklch(60% 0.20 30), oklch(70% 0.18 60))", preview: "pulse" as const },
    { title: "Hanukkah Honey", creator: "@menorah-mike", genre: "Folk \u00b7 110 BPM", price: "$12", plays: "3.1k", stars: "5.0", g: "linear-gradient(135deg, oklch(50% 0.18 250), oklch(70% 0.14 220))", preview: "fade" as const },
    { title: "Halloween: Thriller", creator: "@boo-yard", genre: "Spooky \u00b7 117 BPM", price: "$16", plays: "6.8k", stars: "4.7", g: "linear-gradient(135deg, oklch(35% 0.18 30), oklch(45% 0.20 320))", preview: "spike" as const },
    { title: "Pack: 80s Synth Bundle", creator: "@retro-rooflines", genre: "6 sequences \u00b7 varied", price: "$59", plays: "4.4k", stars: "4.9", badge: "Pack", g: "linear-gradient(135deg, oklch(55% 0.22 320), oklch(65% 0.18 280))", preview: "wave" as const },
  ];

  function Preview({ shape }: { shape: "spike" | "wave" | "pulse" | "fade" }) {
    const bars =
      shape === "spike" ? [3, 5, 2, 8, 12, 4, 7, 18, 6, 3, 9, 14, 5, 7, 2, 11, 4, 8, 3, 5] :
      shape === "wave" ? [4, 6, 8, 10, 12, 10, 8, 6, 4, 6, 8, 10, 12, 10, 8, 6, 4, 6, 8, 10] :
      shape === "pulse" ? [12, 2, 12, 2, 12, 2, 12, 2, 12, 2, 12, 2, 12, 2, 12, 2, 12, 2, 12, 2] :
      [4, 5, 6, 7, 8, 9, 10, 11, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1];
    return (
      <div style={{ display: "flex", alignItems: "flex-end", gap: 2, height: 36, marginTop: 4 }}>
        {bars.map((h, i) => (
          <div key={i} style={{ flex: 1, height: `${h * 5}%`, background: "rgba(255,255,255,.7)", borderRadius: 1 }} />
        ))}
      </div>
    );
  }

  return (
    <section className="lp-section" id="marketplace">
      <div style={{ textAlign: "center", marginBottom: 16 }}>
        <span className="lp-eyebrow">&#10022; The LightCanvas Marketplace</span>
      </div>
      <h2 className="lp-h2" style={{ textAlign: "center", marginBottom: 16 }}>
        Sell your shows. Or buy the perfect one.
      </h2>
      <p className="lp-lead" style={{ margin: "0 auto 56px", textAlign: "center", maxWidth: 720 }}>
        Spent four weekends on a chase pattern that hits every snare in <em>Carol of the Bells</em>? List it. Need a show by Friday and don&apos;t have time? Buy one. The marketplace is where the LightCanvas community actually pays each other for craft.
      </p>

      <div className="mp-grid">
        {cards.map((c, i) => (
          <div key={i} className="mp-card">
            <div className="mp-thumb" style={{ background: c.g }}>
              {c.badge && <div className="mp-badge">{c.badge}</div>}
              <Preview shape={c.preview} />
              <div className="mp-thumb-meta">
                <span className="mp-stars">&#9733; {c.stars}</span>
                <span>&middot;</span>
                <span>{c.plays} plays</span>
              </div>
            </div>
            <div className="mp-body">
              <div className="mp-title">{c.title}</div>
              <div className="mp-creator">{c.creator}</div>
              <div className="mp-foot">
                <span className="mp-genre">{c.genre}</span>
                <span className="mp-price">{c.price}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mp-split">
        <div className="mp-split-card buyers">
          <div className="lp-feature-eyebrow">For buyers</div>
          <h3>Friday night. Lights up Saturday.</h3>
          <p>Browse thousands of synced shows by song, vibe, or fixture count. Preview every one against your house in LightCanvas before you buy. Open it in the editor — fully editable, fully yours.</p>
          <ul>
            <li>Preview any show against <strong>your</strong> house layout before purchase</li>
            <li>One-click open in the LightCanvas editor — tweak anything you want</li>
            <li>Royalty-free for personal use; commercial licenses available</li>
            <li>Verified Pro badges so you know it&apos;ll work on your rig</li>
          </ul>
          <a href="#" className="btn">Browse marketplace &rarr;</a>
        </div>
        <div className="mp-split-card sellers">
          <div className="lp-feature-eyebrow">For sellers</div>
          <h3>Your hard work, earning year-round.</h3>
          <p>Most decorators spend 30&ndash;60 hours on a single show. Sell it, license it, bundle it. Pro and Installer subscribers keep <strong>80&ndash;85%</strong> of every sale, with payouts every Friday during the season.</p>
          <ul>
            <li>Set your own price — typical sequence sells for $12&ndash;$30</li>
            <li>Sell single sequences, packs, stems, or fixture templates</li>
            <li>Free 50% &middot; Creator 60% &middot; Pro 70% &middot; Installer 75% rev share</li>
            <li>Featured placement for top-rated and Verified Pro creators</li>
          </ul>
          <div className="mp-earnings-stat">
            <div>
              <div className="mp-stat-num">$840</div>
              <div className="mp-stat-lbl">avg seller earnings, Dec 2025</div>
            </div>
            <div>
              <div className="mp-stat-num">$4,200</div>
              <div className="mp-stat-lbl">top seller, Dec 2025</div>
            </div>
          </div>
          <Link href="/sign-up" className="btn primary">Start selling</Link>
        </div>
      </div>
    </section>
  );
}

function TestimonialSection() {
  const quotes = [
    { t: "\u201CI spent four winters fighting xLights. With LightCanvas I had a synced show in two hours. My neighbors think I hired someone.\u201D", n: "Mike R.", r: "Homeowner \u00b7 Frisco, TX", g: "linear-gradient(135deg, oklch(72% 0.14 30), oklch(60% 0.16 50))" },
    { t: "\u201CThe AI Generate isn\u2019t a gimmick. It got the chorus right on the first try. I just spent the rest of my time refining.\u201D", n: "Jenna K.", r: "Competitive decorator \u00b7 OH", g: "linear-gradient(135deg, oklch(70% 0.14 250), oklch(58% 0.16 280))" },
    { t: "\u201CI run 22 client installs each season. The branded client portal alone is worth the subscription. The AI batch tool is unfair.\u201D", n: "Devon S.", r: "LightCanvas Installer \u00b7 GA", g: "linear-gradient(135deg, oklch(70% 0.14 145), oklch(58% 0.16 175))" },
  ];

  return (
    <section className="lp-section tight">
      <div style={{ textAlign: "center", marginBottom: 24 }}>
        <span className="lp-eyebrow">From people who used it</span>
      </div>
      <div className="lp-quotes">
        {quotes.map((q, i) => (
          <div key={i} className="lp-quote">
            <p className="lp-quote-text">{q.t}</p>
            <div className="lp-quote-by">
              <div className="lp-quote-av" style={{ background: q.g }} />
              <div>
                <div className="lp-quote-name">{q.n}</div>
                <div className="lp-quote-role">{q.r}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

const FAQS = [
  { q: "Do I need a light controller?", a: "Yes — LightCanvas creates the show file; you still need a Falcon, Pixlite, or similar controller to drive your lights. LightCanvas exports xLights-compatible files that work with any controller xLights supports." },
  { q: "Will my xLights setup still work?", a: "LightCanvas exports .xsq sequence files that open in xLights. Your existing models, controllers, and props all stay. Most users edit in LightCanvas, render the .fseq in xLights, and play through their existing setup." },
  { q: "What if I don\u2019t know what BPM is?", a: "You don\u2019t have to. Drop a song in, the AI handles beats, drops, and timing. You just pick effects and vibes. LightCanvas is designed for someone who has never opened xLights." },
  { q: "How much does electricity cost for a show?", a: "A 5,000-pixel show pulls about 600W at full brightness — roughly $0.15/hour to run. LightCanvas has a power calculator built in." },
  { q: "What happens when I run out of AI credits?", a: "Nothing breaks — you just can\u2019t run more AI actions until next month, when your monthly grant refills. Need more sooner? Top up: $9 = 1,000 credits, $39 = 5,000, $149 = 25,000. Top-up credits never expire." },
  { q: "Why credits instead of unlimited AI?", a: "Honesty. AI Generate on a 4-minute song uses real compute — somebody has to pay for it, and we\u2019d rather show you the cost up-front than bake it into a higher monthly fee. Every action shows its credit cost before you click. Most Pro users use 1,500\u20133,000 credits a month and never think about it." },
  { q: "What if I need more than 250 GB of storage?", a: "Add-on packs are $5/mo per +50 GB, or $15/mo per +250 GB — buy them only when you need them, drop them when you don\u2019t. We also automatically archive shows untouched for 90 days to cold storage; they still open, just take a few seconds to thaw." },
  { q: "Will my old shows ever get deleted?", a: "Never. Even if you cancel, your shows stay accessible through your account for read-only download for 12 months. Hot active storage moves to cold archive after 90 days of inactivity, but the data is yours forever — and you can export everything as JSON anytime." },
  { q: "How does the marketplace payout work?", a: "Sellers get paid weekly during the season (Oct\u2013Jan), monthly off-season. Payouts via Stripe to bank or debit card. You set your price; we handle tax 1099s for U.S. sellers earning $600+." },
  { q: "Can I cancel anytime?", a: "Yes. Cancel anytime, no questions. Your shows stay yours — export everything as JSON before you go." },
  { q: "What about Hanukkah, Halloween, weddings?", a: "LightCanvas works for any event. The defaults are tuned for Christmas because that\u2019s where most users start, but the effect library is generic. Set your colors, pick your song." },
  { q: "Is there a discount for first-time decorators?", a: "Free is genuinely free, forever. You can build one full show without paying. If you decide to do another, that\u2019s when Creator kicks in." },
  { q: "Does Pro really not include multi-property?", a: "Right — Pro is for the single-house obsessive: unlimited fixtures, unlimited controllers, full DMX/E1.31, the whole AI suite. The moment you\u2019re designing for someone else\u2019s property, that\u2019s a business — and Installer is the right tier with commercial license, branded client portals, and the calculators you need." },
];

function FAQSection() {
  return (
    <section className="lp-section" id="faq">
      <div style={{ textAlign: "center", marginBottom: 48 }}>
        <span className="lp-eyebrow">Questions</span>
        <h2 className="lp-h2" style={{ marginTop: 20 }}>The answers, before you ask.</h2>
      </div>
      <div className="lp-faq">
        {FAQS.map((f, i) => (
          <details key={i} className="lp-faq-item">
            <summary className="lp-faq-q">{f.q}</summary>
            <div className="lp-faq-a">{f.a}</div>
          </details>
        ))}
      </div>
    </section>
  );
}

function FinalCTA() {
  return (
    <section className="lp-cta-band">
      <h2>Make your first show. <em style={{ fontStyle: "italic", color: "var(--accent-700)" }}>Free, forever.</em></h2>
      <p>One real, exportable show. No watermark. No expiration. Decide if you love it before you ever pay a cent.</p>
      <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
        <Link href="/sign-up" className="btn primary lg">Start designing — free</Link>
        <a href="#" className="btn lg">Watch the 90-second tour</a>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="lp-foot">
      <div className="lp-foot-inner">
        <div className="lp-foot-brand">
          <div className="lp-logo" style={{ color: "white" }}>
            <div className="lp-logo-mark">&#10022;</div>
            LightCanvas
          </div>
          <p>Light shows, without the spreadsheet. Built for the front-yard auteur.</p>
        </div>
        <div>
          <h5>Product</h5>
          <a href="#features">Features</a>
          <a href="#marketplace">Marketplace</a>
          <a href="#pricing">Pricing</a>
          <a href="#">Effect library</a>
          <a href="#">Showcase</a>
        </div>
        <div>
          <h5>Resources</h5>
          <a href="#">Getting started</a>
          <a href="#">xLights migration</a>
          <a href="#faq">FAQ</a>
          <a href="#">Community</a>
        </div>
        <div>
          <h5>Company</h5>
          <a href="#">About</a>
          <a href="#">Contact</a>
          <a href="#">Privacy</a>
          <a href="#">Terms</a>
        </div>
      </div>
      <div className="lp-foot-bot">
        <span>&copy; 2026 LightCanvas Light Co.</span>
        <span>Made for the people whose neighbors stop their cars.</span>
      </div>
    </footer>
  );
}

export default function MarketingPage() {
  return (
    <div className="landing">
      <Nav />
      <Hero />
      <LogoStrip />
      <FeatureSection />
      <MarketplaceSection />
      <TestimonialSection />
      <PricingSection />
      <FAQSection />
      <FinalCTA />
      <Footer />
    </div>
  );
}

// Landing page sections — pricing tiers
//
// Tier philosophy:
// - Pro = the obsessed single-house hobbyist (8k+ pixels, 4 controllers). NOT multi-property.
// - Multi-property is Installer-exclusive (commercial license territory).
// - Annual = flat 15% off + perks. NO free months (seasonal chargeback risk).
// - AI is metered (credits), not unlimited — protects unit economics.
// - Storage is banded with off-season cold-archive — pixel/audio data is heavy.
// - Marketplace rev share rises by tier; even Free can sell (50%).

const TIERS = {
  monthly: [
    {
      key: 'free',
      eyebrow: 'For the curious',
      name: 'Free',
      who: "Saw a show on TikTok and want to see if this is real.",
      price: '$0',
      per: 'forever',
      cta: 'Make your first show',
      hero: { label: 'The unlock', text: 'One real, exportable show. Yours forever — not a trial, not a watermark.' },
      meters: [
        { lbl: 'AI credits', val: '50 / mo', sub: '~3 AI generations' },
        { lbl: 'Storage', val: '1 GB', sub: 'one show with audio' },
        { lbl: 'Marketplace', val: '50% rev share', sub: 'sell even on Free' },
      ],
      features: [
        'All 10 effects, full editor',
        'Real beat detection on your song',
        'Export to xLights once',
        'Stylized house preview',
        'Browse + sell on marketplace',
      ],
      foryou: <>Perfect if <strong>you just want to see what's possible.</strong></>,
    },
    {
      key: 'creator',
      eyebrow: 'For the home tradition',
      name: 'Creator',
      who: 'One house. Every Christmas. Wants the best show on the block.',
      price: '$19',
      per: '/month',
      cta: 'Start creating',
      hero: { label: 'The unlock', text: 'Your house, every year — show history, last year as a starting template, and AI that learns your style.' },
      meters: [
        { lbl: 'AI credits', val: '1,500 / mo', sub: '~100 generations' },
        { lbl: 'Storage', val: '25 GB', sub: '90-day version history' },
        { lbl: 'Marketplace', val: '60% rev share', sub: '' },
      ],
      features: [
        'Unlimited shows for your house',
        'AI Generate + AI Beat Drops',
        'Year-over-year project history',
        'All export formats (xLights, video)',
        'Cloud autosave + version history',
        'Credit roll-over up to 2× cap',
      ],
      foryou: <>Perfect if <strong>this is your house and your tradition.</strong></>,
    },
    {
      key: 'pro',
      eyebrow: 'For the obsessed',
      name: 'Pro',
      who: 'Year after year, more pixels, more controllers, more ambition. The neighborhood legend.',
      price: '$49',
      per: '/month',
      featured: true,
      badge: 'Where most pros land',
      cta: 'Go Pro',
      hero: { label: 'The unlock', text: 'Built for serious rigs — unlimited fixtures, unlimited controllers, and the AI tools that turn a 30-hour weekend into an afternoon.' },
      meters: [
        { lbl: 'AI credits', val: '6,000 / mo', sub: '~400 generations' },
        { lbl: 'Storage', val: '250 GB', sub: '1-year version history' },
        { lbl: 'Marketplace', val: '70% rev share', sub: 'featured eligible' },
      ],
      features: [
        'Everything in Creator',
        'Unlimited fixtures + controllers (Falcon, Pixlite, Kulp, FPP…)',
        'Multi-universe DMX & E1.31 support',
        'Full creative AI suite — Style Transfer, Fill Gaps, Describe',
        'Public LightCanvas profile at lumen.app/@you',
        'Show analytics (plays, view duration, FM tune-ins)',
        'Early access to new effects + seasonal packs',
      ],
      foryou: <>Perfect if <strong>this is the hobby you spend on like it's a sport.</strong></>,
    },
    {
      key: 'installer',
      eyebrow: 'For the business',
      name: 'Installer',
      who: 'Running a commercial light-installation business. Multiple clients, real revenue.',
      price: '$149',
      per: '/month',
      cta: 'Talk to sales',
      hero: { label: 'The unlock', text: 'Multi-property, branded client portals, white-label deliverables, and a revenue model that pays for itself on the first job.' },
      meters: [
        { lbl: 'AI credits', val: '25,000 / mo', sub: 'covers AI Batch jobs' },
        { lbl: 'Storage', val: '1 TB', sub: 'unlimited history' },
        { lbl: 'Marketplace', val: '75% rev share', sub: 'verified pro badge' },
      ],
      features: [
        'Everything in Pro',
        'Unlimited client properties + commercial license',
        'Branded client portal — preview, feedback, approve',
        'White-label exports (PDFs, videos, job sheets)',
        'Bulk operations across client shows',
        'AI Batch — run AI across 20 shows in one job',
        'Show pricing calculator + contract templates',
        'Dedicated success rep + Slack onboarding',
      ],
      foryou: <>Perfect if <strong>this is how you make a living.</strong></>,
    },
  ],
};

// Annual pricing — 15% off across the board. NO free months.
// Annual perks instead: bonus AI credits at signup, early access, marketplace boost, swag.
const ANNUAL = {
  free:      { price: '$0', per: 'forever', strike: null, save: '' },
  creator:   { price: '$194', per: '/year', strike: '$228', save: 'Save $34 (15% off) + 3,000 bonus credits' },
  pro:       { price: '$499', per: '/year', strike: '$588', save: 'Save $89 (15% off) + 10,000 bonus credits' },
  installer: { price: '$1,519', per: '/year', strike: '$1,788', save: 'Save $269 (15% off) + 50,000 bonus credits' },
};

const PricingSection = () => {
  const [billing, setBilling] = React.useState('monthly');
  const [showCompare, setShowCompare] = React.useState(false);
  const tiers = TIERS.monthly;

  return (
    <section className="lp-pricing-bg" id="pricing">
      <div className="lp-section">
        <div style={{textAlign:'center', marginBottom: 12}}>
          <span className="lp-eyebrow">Pricing</span>
        </div>
        <h2 className="lp-h2" style={{textAlign:'center'}}>Pricing built around <em>you</em>, not a feature checklist.</h2>
        <p className="lp-lead" style={{margin:'0 auto 32px', textAlign:'center'}}>
          Four tiers, four buyers, four different jobs LightCanvas does for you. Pick the one that sounds like your situation — not the one with the most checkmarks.
        </p>
        <div style={{display:'flex', justifyContent:'center'}}>
          <div className="lp-billing">
            <button className={billing==='monthly' ? 'active' : ''} onClick={()=>setBilling('monthly')}>Monthly</button>
            <button className={billing==='annual' ? 'active' : ''} onClick={()=>setBilling('annual')}>
              Season Pass <span className="save">15% off + perks</span>
            </button>
          </div>
        </div>
        <div className="lp-tiers">
          {tiers.map(t => {
            const ann = ANNUAL[t.key];
            const showAnnual = billing === 'annual';
            return (
              <div key={t.key} className={`lp-tier ${t.featured ? 'featured' : ''}`}>
                {t.badge && <div className="lp-tier-badge">{t.badge}</div>}
                <div className="lp-tier-eyebrow">{t.eyebrow}</div>
                <div className="lp-tier-name">{t.name}</div>
                <div className="lp-tier-who">{t.who}</div>
                <div className="lp-tier-price">
                  {showAnnual && ann.strike && <span className="strike">{ann.strike}</span>}
                  <span className="num">{showAnnual ? ann.price : t.price}</span>
                  <span className="per">{showAnnual ? ann.per : t.per}</span>
                </div>
                <div className="lp-tier-savings">{showAnnual ? ann.save : ''}</div>
                <button className={`btn ${t.featured ? 'primary' : ''} lp-tier-cta`}>{t.cta}</button>
                <div className="lp-tier-hero">
                  <div className="lp-tier-hero-label">{t.hero.label}</div>
                  <div className="lp-tier-hero-text">{t.hero.text}</div>
                </div>
                <div className="lp-tier-meters">
                  {t.meters.map((m, i) => (
                    <div key={i} className="lp-meter">
                      <div className="lp-meter-lbl">{m.lbl}</div>
                      <div className="lp-meter-val">{m.val}</div>
                      {m.sub && <div className="lp-meter-sub">{m.sub}</div>}
                    </div>
                  ))}
                </div>
                <ul className="lp-tier-features">
                  {t.features.map((f, i) => <li key={i}>{f}</li>)}
                </ul>
                <div className="lp-tier-foryou">{t.foryou}</div>
              </div>
            );
          })}
        </div>

        {/* Credits explainer — sits below tiers */}
        <div className="lp-credits-explainer">
          <div className="lp-credits-head">
            <span className="lp-eyebrow" style={{background:'oklch(96% 0.06 280)', borderColor:'oklch(85% 0.08 280)', color:'oklch(40% 0.18 280)'}}>How AI credits work</span>
            <h3>One pool. Real costs. No surprise bills.</h3>
            <p>AI uses real compute, so we meter it like fuel. Every action shows its credit cost <em>before</em> it runs — you're always in control.</p>
          </div>
          <div className="lp-credits-grid">
            {[
              { name: 'AI Generate from Music', cost: '15', sub: 'Full sequence on one song' },
              { name: 'AI Beat Drops', cost: '5', sub: 'Mark every drop in your track' },
              { name: 'AI Style Transfer', cost: '10', sub: 'Apply another show\'s vibe' },
              { name: 'AI Fill Gaps', cost: '4', sub: 'Quiet sections, filled smartly' },
              { name: 'AI Describe', cost: '2', sub: 'Plain-English of any sequence' },
              { name: 'AI Batch (per show)', cost: '12', sub: 'Run across 20+ shows at once' },
            ].map((a, i) => (
              <div key={i} className="lp-credit-card">
                <div className="lp-credit-cost">{a.cost} <span>credits</span></div>
                <div className="lp-credit-name">{a.name}</div>
                <div className="lp-credit-sub">{a.sub}</div>
              </div>
            ))}
          </div>
          <div className="lp-credits-foot">
            <div>
              <strong>Roll over</strong> — unused credits carry into next month, up to 2× your monthly cap.
            </div>
            <div>
              <strong>Top up anytime</strong> — $9 = 1,000 credits · $39 = 5,000 · $149 = 25,000.
            </div>
            <div>
              <strong>Annual gets a grant</strong> — bonus credits dropped at signup, yours to use any time in the year.
            </div>
          </div>
        </div>

        {/* Storage explainer */}
        <div className="lp-storage-band">
          <div>
            <span className="lp-eyebrow" style={{background:'oklch(96% 0.06 145)', borderColor:'oklch(85% 0.08 145)', color:'oklch(35% 0.12 145)'}}>How storage works</span>
            <h3>Every season, kept forever — without slowing down this one.</h3>
            <p>Light shows are heavy: audio, fixture data, version history, render exports. Your active season's work stays instant. Anything untouched for 90 days quietly moves to cold archive — still here, still yours, just a few seconds slower to wake up. You'll never lose a show because of a quota.</p>
          </div>
          <div className="lp-storage-stats">
            <div className="lp-storage-stat">
              <div className="lp-storage-num">~50 MB</div>
              <div className="lp-storage-lbl">Avg. show with audio + sequence + previews</div>
            </div>
            <div className="lp-storage-stat">
              <div className="lp-storage-num">90 days</div>
              <div className="lp-storage-lbl">Until inactive shows auto-archive</div>
            </div>
            <div className="lp-storage-stat">
              <div className="lp-storage-num">$5/mo</div>
              <div className="lp-storage-lbl">Per +50 GB add-on, if you ever need more</div>
            </div>
          </div>
        </div>

        {/* Season Pass story — only when annual is selected */}
        {billing === 'annual' && (
          <div className="lp-season fade-in">
            <div>
              <h3>The LightCanvas Season Pass</h3>
              <p>Annual is 15% off — and a membership. Subscribers get the perks that make this feel like joining a club, not paying a bill.</p>
              <ul className="lp-season-perks">
                <li>Bonus AI credits at signup (Creator: +3,000, Pro: +10,000, Installer: +50,000)</li>
                <li>Early access to new effects, weeks before monthly</li>
                <li>2× marketplace earnings boost on your first 3 listings</li>
                <li>A printed LightCanvas yard sign with QR to your public profile</li>
                <li>Founders' sticker pack and Slack access during the season</li>
              </ul>
            </div>
            <div style={{textAlign:'center'}}>
              <div style={{fontFamily:'var(--font-display)', fontSize: 96, fontWeight: 500, lineHeight: 1, color:'var(--accent-700)', letterSpacing:'-.03em'}}>✦</div>
              <div style={{fontSize:14, color:'var(--ink-3)', marginTop: 8}}>Yes, the sign and stickers are real.</div>
            </div>
          </div>
        )}

        {/* Compare table toggle */}
        <button className="lp-compare-toggle" onClick={()=>setShowCompare(s=>!s)}>
          {showCompare ? 'Hide' : 'Compare'} every feature
          <span style={{transform: showCompare?'rotate(180deg)':'none', display:'inline-block', transition:'transform .2s'}}>▾</span>
        </button>
        {showCompare && (
          <div className="lp-compare fade-in">
            <table>
              <thead>
                <tr><th>Feature</th><th>Free</th><th>Creator</th><th>Pro</th><th>Installer</th></tr>
              </thead>
              <tbody>
                <tr className="lp-compare-section"><td colSpan="5">Limits</td></tr>
                <tr><td>AI credits / month</td><td>50</td><td>1,500</td><td>6,000</td><td>25,000</td></tr>
                <tr><td>Credit roll-over</td><td className="no">—</td><td className="yes">Up to 2× cap</td><td className="yes">Up to 2× cap</td><td className="yes">Up to 2× cap</td></tr>
                <tr><td>Storage</td><td>1 GB</td><td>25 GB</td><td>250 GB</td><td>1 TB</td></tr>
                <tr><td>Version history retention</td><td>—</td><td>90 days</td><td>1 year</td><td>Unlimited</td></tr>
                <tr><td>Saved shows</td><td>1</td><td>Unlimited</td><td>Unlimited</td><td>Unlimited</td></tr>
                <tr><td>Properties</td><td>1</td><td>1</td><td>1</td><td>Unlimited clients</td></tr>
                <tr><td>Fixtures / controllers</td><td>Up to 4</td><td>Up to 12</td><td className="yes">Unlimited</td><td className="yes">Unlimited</td></tr>
                <tr><td>Multi-universe DMX / E1.31</td><td className="no">—</td><td className="no">—</td><td className="yes">✓</td><td className="yes">✓</td></tr>
                <tr className="lp-compare-section"><td colSpan="5">Core editor</td></tr>
                <tr><td>All 10 effects</td><td className="yes">✓</td><td className="yes">✓</td><td className="yes">✓ + early access</td><td className="yes">✓</td></tr>
                <tr><td>Real beat detection</td><td className="yes">✓</td><td className="yes">✓</td><td className="yes">✓</td><td className="yes">✓</td></tr>
                <tr><td>Cloud autosave</td><td className="no">—</td><td className="yes">✓</td><td className="yes">✓</td><td className="yes">✓</td></tr>
                <tr className="lp-compare-section"><td colSpan="5">AI (credit-metered)</td></tr>
                <tr><td>AI Generate</td><td>1 trial</td><td className="yes">15 cr</td><td className="yes">15 cr</td><td className="yes">15 cr</td></tr>
                <tr><td>AI Beat Drops</td><td className="no">—</td><td className="yes">5 cr</td><td className="yes">5 cr</td><td className="yes">5 cr</td></tr>
                <tr><td>AI Style Transfer</td><td className="no">—</td><td className="no">—</td><td className="yes">10 cr</td><td className="yes">10 cr</td></tr>
                <tr><td>AI Fill Gaps</td><td className="no">—</td><td className="no">—</td><td className="yes">4 cr</td><td className="yes">4 cr</td></tr>
                <tr><td>AI Batch (20+ shows)</td><td className="no">—</td><td className="no">—</td><td className="no">—</td><td className="yes">12 cr / show</td></tr>
                <tr className="lp-compare-section"><td colSpan="5">Marketplace</td></tr>
                <tr><td>Browse + buy sequences</td><td className="yes">✓</td><td className="yes">✓</td><td className="yes">✓</td><td className="yes">✓</td></tr>
                <tr><td>Sell sequences</td><td className="yes">50% rev share</td><td className="yes">60% rev share</td><td className="yes">70% rev share</td><td className="yes">75% rev share</td></tr>
                <tr><td>Featured placement</td><td className="no">—</td><td className="no">—</td><td className="yes">Eligible</td><td className="yes">Eligible + verified badge</td></tr>
                <tr><td>Sell stems / packs / templates</td><td className="no">—</td><td className="no">—</td><td className="yes">✓</td><td className="yes">✓</td></tr>
                <tr className="lp-compare-section"><td colSpan="5">Exports & sharing</td></tr>
                <tr><td>xLights / .fseq export</td><td>Once</td><td className="yes">Unlimited</td><td className="yes">Unlimited</td><td className="yes">Unlimited</td></tr>
                <tr><td>Video render (MP4/WebM)</td><td className="no">—</td><td className="yes">✓</td><td className="yes">✓</td><td className="yes">✓ white-label</td></tr>
                <tr><td>Public LightCanvas profile</td><td className="no">—</td><td className="no">—</td><td className="yes">lumen.app/@you</td><td className="yes">Custom domain</td></tr>
                <tr><td>Share links + analytics</td><td className="no">—</td><td className="no">—</td><td className="yes">✓</td><td className="yes">✓</td></tr>
                <tr className="lp-compare-section"><td colSpan="5">Business</td></tr>
                <tr><td>Commercial license</td><td className="no">—</td><td className="no">—</td><td className="no">—</td><td className="yes">✓ + indemnification</td></tr>
                <tr><td>Branded client portal</td><td className="no">—</td><td className="no">—</td><td className="no">—</td><td className="yes">✓</td></tr>
                <tr><td>Job sheets, invoicing</td><td className="no">—</td><td className="no">—</td><td className="no">—</td><td className="yes">✓</td></tr>
                <tr><td>Show pricing calculator</td><td className="no">—</td><td className="no">—</td><td className="no">—</td><td className="yes">✓</td></tr>
                <tr><td>Support</td><td>Community</td><td>Email</td><td>Priority email</td><td>Dedicated rep + Slack</td></tr>
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
};

window.PricingSection = PricingSection;

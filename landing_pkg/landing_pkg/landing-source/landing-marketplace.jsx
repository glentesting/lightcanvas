// Marketplace section — between feature deep-dives and testimonials
//
// Two audiences in one section:
// - Buyers: "skip the work, get a pro show running tonight"
// - Sellers: "your hard work earns you money in the off-season"
//
// Card grid mocks the marketplace browse page. Each card has a creator,
// genre, price, and a tiny "thumbnail" of the show shape.

const MarketplaceSection = () => {
  const cards = [
    { title: 'Wizards in Winter', creator: '@trans-siberian-todd', genre: 'Cinematic · 142 BPM', price: '$24', plays: '12.4k', stars: '4.9', badge: 'Top seller', g: 'linear-gradient(135deg, oklch(40% 0.18 280), oklch(55% 0.20 30))', preview: 'spike' },
    { title: 'Carol of the Bells (Remix)', creator: '@megatree-mom', genre: 'Hybrid · 128 BPM', price: '$18', plays: '8.7k', stars: '4.8', g: 'linear-gradient(135deg, oklch(35% 0.15 220), oklch(50% 0.18 175))', preview: 'wave' },
    { title: 'All I Want for Christmas', creator: '@northpole-nick', genre: 'Pop · 150 BPM', price: '$15', plays: '21.2k', stars: '4.9', badge: '⭐ Verified Pro', g: 'linear-gradient(135deg, oklch(60% 0.20 30), oklch(70% 0.18 60))', preview: 'pulse' },
    { title: 'Hanukkah Honey', creator: '@menorah-mike', genre: 'Folk · 110 BPM', price: '$12', plays: '3.1k', stars: '5.0', g: 'linear-gradient(135deg, oklch(50% 0.18 250), oklch(70% 0.14 220))', preview: 'fade' },
    { title: 'Halloween: Thriller', creator: '@boo-yard', genre: 'Spooky · 117 BPM', price: '$16', plays: '6.8k', stars: '4.7', g: 'linear-gradient(135deg, oklch(35% 0.18 30), oklch(45% 0.20 320))', preview: 'spike' },
    { title: 'Pack: 80s Synth Bundle', creator: '@retro-rooflines', genre: '6 sequences · varied', price: '$59', plays: '4.4k', stars: '4.9', badge: 'Pack', g: 'linear-gradient(135deg, oklch(55% 0.22 320), oklch(65% 0.18 280))', preview: 'wave' },
  ];

  const Preview = ({ shape }) => {
    // Tiny inline waveform mock
    const bars = shape === 'spike'  ? [3,5,2,8,12,4,7,18,6,3,9,14,5,7,2,11,4,8,3,5]
              :  shape === 'wave'   ? [4,6,8,10,12,10,8,6,4,6,8,10,12,10,8,6,4,6,8,10]
              :  shape === 'pulse'  ? [12,2,12,2,12,2,12,2,12,2,12,2,12,2,12,2,12,2,12,2]
              :                       [4,5,6,7,8,9,10,11,12,11,10,9,8,7,6,5,4,3,2,1];
    return (
      <div style={{display:'flex', alignItems:'flex-end', gap:2, height:36, marginTop:4}}>
        {bars.map((h, i) => (
          <div key={i} style={{flex:1, height:`${h*5}%`, background:'rgba(255,255,255,.7)', borderRadius:1}}/>
        ))}
      </div>
    );
  };

  return (
    <section className="lp-section" id="marketplace">
      <div style={{textAlign:'center', marginBottom: 16}}>
        <span className="lp-eyebrow">✦ The LightCanvas Marketplace</span>
      </div>
      <h2 className="lp-h2" style={{textAlign:'center', marginBottom: 16}}>
        Sell your shows. Or buy the perfect one.
      </h2>
      <p className="lp-lead" style={{margin:'0 auto 56px', textAlign:'center', maxWidth: 720}}>
        Spent four weekends on a chase pattern that hits every snare in <em>Carol of the Bells</em>? List it. Need a show by Friday and don't have time? Buy one. The marketplace is where the LightCanvas community actually pays each other for craft.
      </p>

      <div className="mp-grid">
        {cards.map((c, i) => (
          <div key={i} className="mp-card">
            <div className="mp-thumb" style={{background: c.g}}>
              {c.badge && <div className="mp-badge">{c.badge}</div>}
              <Preview shape={c.preview}/>
              <div className="mp-thumb-meta">
                <span className="mp-stars">★ {c.stars}</span>
                <span>·</span>
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
            <li>Verified Pro badges so you know it'll work on your rig</li>
          </ul>
          <button className="btn">Browse marketplace →</button>
        </div>
        <div className="mp-split-card sellers">
          <div className="lp-feature-eyebrow">For sellers</div>
          <h3>Your hard work, earning year-round.</h3>
          <p>Most decorators spend 30–60 hours on a single show. Sell it, license it, bundle it. Pro and Installer subscribers keep <strong>80–85%</strong> of every sale, with payouts every Friday during the season.</p>
          <ul>
            <li>Set your own price — typical sequence sells for $12–$30</li>
            <li>Sell single sequences, packs, stems, or fixture templates</li>
            <li>Free 50% · Creator 60% · Pro 70% · Installer 75% rev share</li>
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
          <button className="btn primary">Start selling</button>
        </div>
      </div>
    </section>
  );
};

window.MarketplaceSection = MarketplaceSection;

const placeholder = (
  <span style={{ background: "#fef3c7", color: "#92400e", padding: "2px 6px", borderRadius: 4, fontSize: 12, fontWeight: 600 }}>
    [PLACEHOLDER — AWAITING LEGAL REVIEW]
  </span>
);

const sectionStyle: React.CSSProperties = { marginBottom: 40 };
const h2Style: React.CSSProperties = { fontSize: 20, fontWeight: 600, color: "var(--ink)", marginBottom: 12 };
const pStyle: React.CSSProperties = { fontSize: 14, lineHeight: 1.7, color: "var(--ink-2)" };

export default function CopyrightPage() {
  return (
    <article>
      <h1 style={{ fontSize: 28, fontWeight: 700, color: "var(--ink)", marginBottom: 8 }}>Copyright &amp; DMCA Policy</h1>
      <p style={{ fontSize: 13, color: "var(--ink-3)", marginBottom: 40 }}>Last updated: May 5, 2026</p>

      <section style={sectionStyle}>
        <h2 style={h2Style}>1. Our Respect for Intellectual Property</h2>
        <p style={pStyle}>{placeholder} LightCanvas respects the intellectual property rights of others and expects its users to do the same. We will respond to notices of alleged copyright infringement that comply with applicable law and are properly provided to us.</p>
      </section>

      <section style={sectionStyle}>
        <h2 style={h2Style}>2. DMCA Takedown Process</h2>
        <p style={pStyle}>{placeholder} If you believe that your copyrighted work has been copied in a way that constitutes copyright infringement, please provide our designated copyright agent with the following information:</p>
        <ul style={{ ...pStyle, paddingLeft: 20, marginTop: 8 }}>
          <li style={{ marginBottom: 6 }}>A physical or electronic signature of the copyright owner or authorized representative</li>
          <li style={{ marginBottom: 6 }}>Identification of the copyrighted work claimed to have been infringed</li>
          <li style={{ marginBottom: 6 }}>Identification of the material that is claimed to be infringing and its location on the Service</li>
          <li style={{ marginBottom: 6 }}>Your contact information (address, telephone number, and email)</li>
          <li style={{ marginBottom: 6 }}>A statement that you have a good faith belief that the use is not authorized</li>
          <li style={{ marginBottom: 6 }}>A statement, under penalty of perjury, that the information in the notification is accurate</li>
        </ul>
        <p style={{ ...pStyle, marginTop: 8 }}>Send DMCA notices to: dmca@lightcanvas.app</p>
      </section>

      <section style={sectionStyle}>
        <h2 style={h2Style}>3. Counter-Notice Process</h2>
        <p style={pStyle}>{placeholder} If you believe that your content was removed or disabled by mistake or misidentification, you may submit a counter-notice containing your contact information, identification of the material that was removed, a statement under penalty of perjury that you have a good faith belief the material was removed by mistake, and your consent to the jurisdiction of the federal court in your district.</p>
      </section>

      <section style={sectionStyle}>
        <h2 style={h2Style}>4. Repeat Infringer Policy</h2>
        <p style={pStyle}>{placeholder} In accordance with the DMCA and other applicable law, LightCanvas has adopted a policy of terminating, in appropriate circumstances, users who are deemed to be repeat infringers. LightCanvas may also, at its sole discretion, limit access to the Service or terminate the accounts of any users who infringe any intellectual property rights of others.</p>
      </section>

      <section style={sectionStyle}>
        <h2 style={h2Style}>5. Audio Rights</h2>
        <p style={pStyle}>{placeholder} Users are responsible for ensuring they have the necessary rights to use any audio files uploaded to LightCanvas. This includes ownership, a direct license, royalty-free or Creative Commons licensing, or personal home use rights. Streaming service subscriptions (such as Spotify, Apple Music, etc.) do not grant rights for use in LightCanvas. LightCanvas does not store or distribute audio files beyond what is necessary for the user to create their light show.</p>
      </section>
    </article>
  );
}

const placeholder = (
  <span style={{ background: "#fef3c7", color: "#92400e", padding: "2px 6px", borderRadius: 4, fontSize: 12, fontWeight: 600 }}>
    [PLACEHOLDER — AWAITING LEGAL REVIEW]
  </span>
);

const sectionStyle: React.CSSProperties = { marginBottom: 40 };
const h2Style: React.CSSProperties = { fontSize: 20, fontWeight: 600, color: "var(--ink)", marginBottom: 12 };
const pStyle: React.CSSProperties = { fontSize: 14, lineHeight: 1.7, color: "var(--ink-2)" };

export default function CookiesPage() {
  return (
    <article>
      <h1 style={{ fontSize: 28, fontWeight: 700, color: "var(--ink)", marginBottom: 8 }}>Cookie Policy</h1>
      <p style={{ fontSize: 13, color: "var(--ink-3)", marginBottom: 40 }}>Last updated: May 5, 2026</p>

      <section style={sectionStyle}>
        <h2 style={h2Style}>1. What Cookies We Use</h2>
        <p style={pStyle}>{placeholder} LightCanvas uses essential cookies required for the Service to function. These include:</p>
        <ul style={{ ...pStyle, paddingLeft: 20, marginTop: 8 }}>
          <li style={{ marginBottom: 6 }}><strong>Authentication cookies</strong> — Managed by Clerk to keep you signed in</li>
          <li style={{ marginBottom: 6 }}><strong>Session cookies</strong> — Used to maintain your session state while using the editor</li>
          <li style={{ marginBottom: 6 }}><strong>Preference cookies</strong> — Used to remember your editor settings and preferences</li>
        </ul>
      </section>

      <section style={sectionStyle}>
        <h2 style={h2Style}>2. Why We Use Them</h2>
        <p style={pStyle}>{placeholder} We use cookies exclusively for essential functionality: authenticating your identity, maintaining your session, and remembering your preferences. We do not use cookies for advertising, tracking across other websites, or selling data to third parties.</p>
      </section>

      <section style={sectionStyle}>
        <h2 style={h2Style}>3. How to Opt Out</h2>
        <p style={pStyle}>{placeholder} You can instruct your browser to refuse all cookies or to indicate when a cookie is being sent. However, if you do not accept cookies, you may not be able to use some portions of the Service, including signing in and using the editor. Most web browsers allow some control of cookies through browser settings. To find out more about cookies, including how to see what cookies have been set, visit <a href="https://www.allaboutcookies.org" target="_blank" rel="noopener noreferrer" style={{ color: "var(--accent)", textDecoration: "underline" }}>www.allaboutcookies.org</a>.</p>
      </section>
    </article>
  );
}

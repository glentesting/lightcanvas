const placeholder = (
  <span style={{ background: "#fef3c7", color: "#92400e", padding: "2px 6px", borderRadius: 4, fontSize: 12, fontWeight: 600 }}>
    [PLACEHOLDER — AWAITING LEGAL REVIEW]
  </span>
);

const sectionStyle: React.CSSProperties = { marginBottom: 40 };
const h2Style: React.CSSProperties = { fontSize: 20, fontWeight: 600, color: "var(--ink)", marginBottom: 12 };
const pStyle: React.CSSProperties = { fontSize: 14, lineHeight: 1.7, color: "var(--ink-2)" };

export default function PrivacyPage() {
  return (
    <article>
      <h1 style={{ fontSize: 28, fontWeight: 700, color: "var(--ink)", marginBottom: 8 }}>Privacy Policy</h1>
      <p style={{ fontSize: 13, color: "var(--ink-3)", marginBottom: 40 }}>Last updated: May 5, 2026</p>

      <section style={sectionStyle}>
        <h2 style={h2Style}>1. What We Collect</h2>
        <p style={pStyle}>{placeholder} We collect information you provide directly to us, such as your name, email address, and account credentials. We also collect usage data including pages visited, features used, and time spent in the editor.</p>
      </section>

      <section style={sectionStyle}>
        <h2 style={h2Style}>2. How We Use It</h2>
        <p style={pStyle}>{placeholder} We use collected information to operate and improve the Service, authenticate users, process transactions, send service-related communications, and provide customer support.</p>
      </section>

      <section style={sectionStyle}>
        <h2 style={h2Style}>3. Third-Party Services</h2>
        <p style={pStyle}>{placeholder} We use the following third-party services to operate LightCanvas:</p>
        <ul style={{ ...pStyle, paddingLeft: 20, marginTop: 8 }}>
          <li style={{ marginBottom: 6 }}><strong>Clerk</strong> — Authentication and user management</li>
          <li style={{ marginBottom: 6 }}><strong>Supabase</strong> — Database and file storage</li>
          <li style={{ marginBottom: 6 }}><strong>Vercel</strong> — Hosting and deployment</li>
        </ul>
        <p style={{ ...pStyle, marginTop: 8 }}>Each of these services has its own privacy policy governing how they handle your data.</p>
      </section>

      <section style={sectionStyle}>
        <h2 style={h2Style}>4. Data Retention</h2>
        <p style={pStyle}>{placeholder} We retain your personal data for as long as your account is active or as needed to provide you the Service. Project data is retained for 12 months after account cancellation for read-only download access.</p>
      </section>

      <section style={sectionStyle}>
        <h2 style={h2Style}>5. Your Rights</h2>
        <p style={pStyle}>{placeholder} You have the right to access, correct, or delete your personal information at any time. You may export all of your project data as JSON. To request data deletion, contact us at support@lightcanvas.app.</p>
      </section>

      <section style={sectionStyle}>
        <h2 style={h2Style}>6. Cookies</h2>
        <p style={pStyle}>{placeholder} We use essential cookies for authentication and session management. See our <a href="/legal/cookies" style={{ color: "var(--accent)", textDecoration: "underline" }}>Cookie Policy</a> for details.</p>
      </section>

      <section style={sectionStyle}>
        <h2 style={h2Style}>7. Children&apos;s Privacy</h2>
        <p style={pStyle}>{placeholder} The Service is not intended for children under the age of 13. We do not knowingly collect personal information from children under 13. If you are a parent or guardian and you are aware that your child has provided us with personal data, please contact us.</p>
      </section>

      <section style={sectionStyle}>
        <h2 style={h2Style}>8. Changes to This Policy</h2>
        <p style={pStyle}>{placeholder} We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the &ldquo;Last updated&rdquo; date.</p>
      </section>

      <section style={sectionStyle}>
        <h2 style={h2Style}>9. Contact</h2>
        <p style={pStyle}>{placeholder} If you have any questions about this Privacy Policy, please contact us at support@lightcanvas.app.</p>
      </section>
    </article>
  );
}

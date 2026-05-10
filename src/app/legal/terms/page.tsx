const placeholder = (
  <span style={{ background: "#fef3c7", color: "#92400e", padding: "2px 6px", borderRadius: 4, fontSize: 12, fontWeight: 600 }}>
    [PLACEHOLDER — AWAITING LEGAL REVIEW]
  </span>
);

const sectionStyle: React.CSSProperties = { marginBottom: 40 };
const h2Style: React.CSSProperties = { fontSize: 20, fontWeight: 600, color: "var(--ink)", marginBottom: 12 };
const pStyle: React.CSSProperties = { fontSize: 14, lineHeight: 1.7, color: "var(--ink-2)" };

export default function TermsPage() {
  return (
    <article>
      <h1 style={{ fontSize: 28, fontWeight: 700, color: "var(--ink)", marginBottom: 8 }}>Terms of Service</h1>
      <p style={{ fontSize: 13, color: "var(--ink-3)", marginBottom: 40 }}>Last updated: May 5, 2026</p>

      <section style={sectionStyle}>
        <h2 style={h2Style}>1. Acceptance of Terms</h2>
        <p style={pStyle}>{placeholder} By accessing or using the LightCanvas platform, you agree to be bound by these Terms of Service and all applicable laws and regulations. If you do not agree with any of these terms, you are prohibited from using or accessing this site.</p>
      </section>

      <section style={sectionStyle}>
        <h2 style={h2Style}>2. Description of Service</h2>
        <p style={pStyle}>{placeholder} LightCanvas is a web-based application for designing synchronized light shows. The Service allows users to upload audio files, create light sequences, preview animations, and export sequence files for hardware controllers.</p>
      </section>

      <section style={sectionStyle}>
        <h2 style={h2Style}>3. User Accounts</h2>
        <p style={pStyle}>{placeholder} You must provide accurate, complete, and current information when creating an account. You are responsible for safeguarding the password that you use to access the Service and for any activities or actions under your account.</p>
      </section>

      <section style={sectionStyle}>
        <h2 style={h2Style}>4. User Content</h2>
        <p style={pStyle}>{placeholder} You retain ownership of any content you upload or create using the Service, including light show sequences and configurations. By uploading content, you grant LightCanvas a non-exclusive license to store, process, and serve that content as necessary to operate the Service.</p>
      </section>

      <section style={sectionStyle}>
        <h2 style={h2Style}>5. Prohibited Uses</h2>
        <p style={pStyle}>{placeholder} You agree not to use the Service for any unlawful purpose, to upload content that infringes on intellectual property rights, to attempt to gain unauthorized access to other accounts or systems, or to interfere with the proper working of the Service.</p>
      </section>

      <section style={sectionStyle}>
        <h2 style={h2Style}>6. Intellectual Property</h2>
        <p style={pStyle}>{placeholder} The Service and its original content (excluding user-submitted content), features, and functionality are and will remain the exclusive property of LightCanvas Light Co. and its licensors.</p>
      </section>

      <section style={sectionStyle}>
        <h2 style={h2Style}>7. Disclaimer of Warranties</h2>
        <p style={pStyle}>{placeholder} The Service is provided on an &ldquo;AS IS&rdquo; and &ldquo;AS AVAILABLE&rdquo; basis. LightCanvas makes no warranties, expressed or implied, and hereby disclaims and negates all other warranties including, without limitation, implied warranties or conditions of merchantability, fitness for a particular purpose, or non-infringement of intellectual property.</p>
      </section>

      <section style={sectionStyle}>
        <h2 style={h2Style}>8. Limitation of Liability</h2>
        <p style={pStyle}>{placeholder} In no event shall LightCanvas, its directors, employees, partners, agents, suppliers, or affiliates, be liable for any indirect, incidental, special, consequential, or punitive damages, including without limitation, loss of profits, data, or other intangible losses, resulting from your access to or use of or inability to access or use the Service.</p>
      </section>

      <section style={sectionStyle}>
        <h2 style={h2Style}>9. Termination</h2>
        <p style={pStyle}>{placeholder} We may terminate or suspend your account immediately, without prior notice or liability, for any reason whatsoever, including without limitation if you breach the Terms. Upon termination, your right to use the Service will immediately cease.</p>
      </section>

      <section style={sectionStyle}>
        <h2 style={h2Style}>10. Governing Law</h2>
        <p style={pStyle}>{placeholder} These Terms shall be governed and construed in accordance with the laws of the United States, without regard to its conflict of law provisions.</p>
      </section>

      <section style={sectionStyle}>
        <h2 style={h2Style}>11. Changes to Terms</h2>
        <p style={pStyle}>{placeholder} We reserve the right, at our sole discretion, to modify or replace these Terms at any time. If a revision is material, we will provide at least 30 days notice prior to any new terms taking effect.</p>
      </section>

      <section style={sectionStyle}>
        <h2 style={h2Style}>12. Contact</h2>
        <p style={pStyle}>{placeholder} If you have any questions about these Terms, please contact us at support@lightcanvas.app.</p>
      </section>
    </article>
  );
}

import Link from "next/link";

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ background: "#FFFFFF", minHeight: "100vh" }}>
      <header style={{ background: "#ffffff", borderBottom: "1px solid var(--line)", padding: "14px 24px" }}>
        <div style={{ maxWidth: 720, margin: "0 auto", display: "flex", alignItems: "center", gap: 12 }}>
          <Link href="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none", color: "var(--ink)" }}>
            <div style={{ width: 26, height: 26, borderRadius: 7, background: "linear-gradient(135deg, var(--accent), oklch(72% 0.18 250))", display: "grid", placeItems: "center", color: "white", fontSize: 14 }}>&#10022;</div>
            <span style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 18 }}>LightCanvas</span>
          </Link>
        </div>
      </header>
      <main style={{ maxWidth: 720, margin: "0 auto", padding: "40px 24px 80px" }}>
        {children}
      </main>
    </div>
  );
}

import { createServiceClient } from "@/lib/supabase";
import { projectFromRow } from "@/types/domain";
import Link from "next/link";

export const dynamic = "force-dynamic";

interface SharePageProps {
  params: Promise<{ token: string }>;
}

export default async function SharePage({ params }: SharePageProps) {
  const { token } = await params;

  // Look up project by share_token (not by id — prevents guessing project IDs)
  const supabase = createServiceClient();
  const { data: row, error } = await supabase
    .from("projects")
    .select("id, name, fixtures, sequence, audio_file, audio, house_template, house_custom_svg, share_token")
    .eq("share_token", token)
    .not("share_token", "is", null)
    .single();

  if (error || !row || !row.share_token) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center" style={{ background: "#FFFFFF" }}>
        <div className="w-14 h-14 rounded-xl flex items-center justify-center mb-4" style={{ background: "var(--panel)", border: "1px solid var(--line)" }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ color: "var(--ink-3)" }}>
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>
        <h1 className="text-xl font-semibold mb-2" style={{ fontFamily: "var(--font-display)" }}>Project not found</h1>
        <p className="text-sm mb-6" style={{ color: "var(--ink-3)" }}>This share link may be invalid or the project has been deleted.</p>
        <Link href="/" className="h-9 px-5 rounded-lg text-sm font-medium inline-flex items-center" style={{ background: "var(--accent)", color: "#fff" }}>
          Go to LightCanvas
        </Link>
      </div>
    );
  }

  const project = projectFromRow(row);

  return (
    <div className="min-h-screen" style={{ background: "#FFFFFF" }}>
      {/* Header */}
      <header className="px-6 py-3.5 flex items-center justify-between" style={{ background: "#ffffff", borderBottom: "1px solid var(--line)" }}>
        <div className="flex items-center gap-2.5">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs" style={{ background: "linear-gradient(135deg, var(--accent), oklch(72% 0.18 250))" }}>
              ✦
            </div>
            <span className="text-lg font-semibold" style={{ fontFamily: "var(--font-display)", letterSpacing: "-0.01em" }}>LightCanvas</span>
          </Link>
        </div>
        <Link href="/sign-up" className="h-8 px-4 rounded-lg text-sm font-medium inline-flex items-center" style={{ background: "var(--accent)", color: "#fff" }}>
          Sign up free
        </Link>
      </header>

      <main style={{ maxWidth: 800, margin: "0 auto", padding: "40px 24px" }}>
        {/* Project name */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-semibold mb-2" style={{ fontFamily: "var(--font-display)" }}>{project.name}</h1>
          {project.audioFile && (
            <p className="text-sm" style={{ color: "var(--ink-3)" }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="inline-block mr-1 -mt-0.5">
                <path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" />
              </svg>
              {project.audioFile}
              {project.audio && (
                <span> · {Math.floor(project.audio.duration / 60)}:{String(Math.floor(project.audio.duration % 60)).padStart(2, "0")}</span>
              )}
            </p>
          )}
        </div>

        {/* House preview */}
        <div className="rounded-xl overflow-hidden mb-8" style={{ background: "linear-gradient(180deg, #1a2440 0%, #0d1426 100%)", border: "1px solid var(--line)" }}>
          <div className="flex items-center justify-center py-16">
            <svg width={200} height={200} viewBox="0 0 64 64" fill="none" style={{ opacity: 0.2 }}>
              <polygon points="32,8 8,28 56,28" fill="white" />
              <rect x="12" y="28" width="40" height="26" fill="white" />
              <rect x="20" y="32" width="8" height="8" rx="1" fill="rgba(0,0,0,.3)" />
              <rect x="36" y="32" width="8" height="8" rx="1" fill="rgba(0,0,0,.3)" />
              <rect x="26" y="42" width="12" height="12" rx="1" fill="rgba(0,0,0,.3)" />
            </svg>
          </div>
        </div>

        {/* Fixture list */}
        {project.fixtures.length > 0 && (
          <section className="rounded-xl p-6 mb-8" style={{ background: "#ffffff", border: "1px solid var(--line)" }}>
            <h2 className="text-sm font-semibold mb-3">Props ({project.fixtures.length})</h2>
            <div className="grid gap-2">
              {project.fixtures.map((f) => (
                <div key={f.id} className="flex items-center gap-3 px-3 py-2 rounded-lg" style={{ background: "var(--panel)" }}>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: "var(--accent-50)", color: "var(--accent)" }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      {f.kind === "roofline" && <line x1="2" y1="12" x2="22" y2="12" />}
                      {f.kind === "window-outline" && <rect x="4" y="6" width="16" height="12" rx="1" />}
                      {f.kind === "mega-tree" && <><polygon points="12,2 3,18 21,18" /><line x1="12" y1="18" x2="12" y2="22" /></>}
                      {f.kind === "mini-tree" && <><polygon points="12,4 5,17 19,17" /><line x1="12" y1="17" x2="12" y2="21" /></>}
                      {f.kind === "arch" && <path d="M4 20 Q12 2 20 20" />}
                      {f.kind === "bush" && <ellipse cx="12" cy="13" rx="9" ry="6" />}
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium">{f.name}</p>
                    <p className="text-xs" style={{ color: "var(--ink-3)" }}>{f.pixelCount} pixels</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Sequence info */}
        {project.sequence.blocks.length > 0 && (
          <section className="rounded-xl p-6 mb-8" style={{ background: "#ffffff", border: "1px solid var(--line)" }}>
            <h2 className="text-sm font-semibold mb-1">Sequence</h2>
            <p className="text-xs" style={{ color: "var(--ink-3)" }}>
              {project.sequence.blocks.length} effect blocks across {project.sequence.tracks.length} tracks
              {project.sequence.bpm ? ` · ${project.sequence.bpm} BPM` : ""}
            </p>
          </section>
        )}

        {/* CTA */}
        <div className="text-center">
          <Link
            href="/sign-up"
            className="inline-flex items-center gap-2 h-11 px-6 rounded-xl text-sm font-medium"
            style={{ background: "var(--accent)", color: "#fff" }}
          >
            Open in LightCanvas
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </Link>
        </div>

        {/* Footer */}
        <p className="text-center text-xs mt-12 pb-8" style={{ color: "var(--ink-4)" }}>
          Created with LightCanvas
        </p>
      </main>
    </div>
  );
}

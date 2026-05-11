export default function ComingSoon({ name, description }: { name: string; description: string }) {
  return (
    <div className="flex-1 flex items-center justify-center" style={{ padding: 60 }}>
      <div className="text-center" style={{ maxWidth: 420 }}>
        <h1 className="text-3xl font-semibold tracking-tight mb-2" style={{ fontFamily: "var(--font-display)", color: "var(--ink)" }}>
          {name}
        </h1>
        <p className="text-sm mb-6" style={{ color: "var(--ink-2)" }}>{description}</p>
        <p className="text-xs" style={{ color: "var(--ink-4)" }}>
          This page is being built — coming in the v4 rebuild.
        </p>
      </div>
    </div>
  );
}

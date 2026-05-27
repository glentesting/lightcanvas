"use client";

import { useEffect, useRef, useState, use } from "react";

type Status = "loading" | "pending" | "uploading" | "uploaded" | "expired" | "error";

interface PageProps {
  params: Promise<{ token: string }>;
}

export default function MobileUploadPage({ params }: PageProps) {
  const { token } = use(params);
  const [status, setStatus] = useState<Status>("loading");
  const [error, setError] = useState<string | null>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const libraryInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch(`/api/mobile-upload/${token}`)
      .then(async (r) => {
        if (!r.ok) {
          setStatus("error");
          setError("This link is invalid.");
          return;
        }
        const data = await r.json();
        if (data.status === "uploaded") setStatus("uploaded");
        else if (data.status === "expired") setStatus("expired");
        else setStatus("pending");
      })
      .catch(() => {
        setStatus("error");
        setError("Couldn't reach the server.");
      });
  }, [token]);

  async function handleFile(file: File) {
    setStatus("uploading");
    setError(null);
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await fetch(`/api/mobile-upload/${token}`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setStatus("pending");
        setError(data.error ?? "Upload failed");
        return;
      }
      setStatus("uploaded");
    } catch {
      setStatus("pending");
      setError("Upload failed — check your connection and try again.");
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#FFFFFF",
        padding: "32px 20px",
        fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
        color: "#111",
      }}
    >
      <div style={{ maxWidth: 480, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              fontSize: 13,
              fontWeight: 600,
              color: "#1e3a5f",
              letterSpacing: "0.04em",
              textTransform: "uppercase",
            }}
          >
            <span style={{ width: 8, height: 8, borderRadius: 4, background: "#1e3a5f", display: "inline-block" }} />
            LightCanvas
          </div>
          <h1 style={{ fontSize: 26, fontWeight: 600, margin: "12px 0 6px", letterSpacing: "-0.02em" }}>
            House Photo Upload
          </h1>
          <p style={{ fontSize: 14, color: "#555", margin: 0 }}>
            Take or pick a photo of your house. It&apos;ll appear on your desktop instantly.
          </p>
        </div>

        {status === "loading" && (
          <div style={{ textAlign: "center", padding: 40, color: "#666" }}>Checking link…</div>
        )}

        {status === "expired" && (
          <div
            style={{
              padding: 20,
              borderRadius: 12,
              background: "#fffbeb",
              border: "1px solid #fde68a",
              color: "#92400e",
              fontSize: 14,
            }}
          >
            This upload link has expired. Head back to your desktop and generate a new QR code.
          </div>
        )}

        {status === "error" && (
          <div
            style={{
              padding: 20,
              borderRadius: 12,
              background: "#fef2f2",
              border: "1px solid #fecaca",
              color: "#991b1b",
              fontSize: 14,
            }}
          >
            {error ?? "Something went wrong."}
          </div>
        )}

        {status === "uploaded" && (
          <div
            style={{
              padding: 24,
              borderRadius: 12,
              background: "#f0fdf4",
              border: "1px solid #bbf7d0",
              color: "#166534",
              fontSize: 15,
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: 32, marginBottom: 8 }}>✓</div>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>Photo uploaded!</div>
            <div style={{ fontSize: 13, opacity: 0.8 }}>You can close this tab and continue on your desktop.</div>
          </div>
        )}

        {(status === "pending" || status === "uploading") && (
          <>
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              capture="environment"
              style={{ display: "none" }}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
                e.target.value = "";
              }}
            />
            <input
              ref={libraryInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              style={{ display: "none" }}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
                e.target.value = "";
              }}
            />

            <button
              type="button"
              disabled={status === "uploading"}
              onClick={() => cameraInputRef.current?.click()}
              style={{
                width: "100%",
                padding: "16px 20px",
                borderRadius: 12,
                background: "#1e3a5f",
                color: "#FFFFFF",
                fontSize: 16,
                fontWeight: 600,
                border: "none",
                marginBottom: 12,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 10,
                opacity: status === "uploading" ? 0.6 : 1,
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                <circle cx="12" cy="13" r="4" />
              </svg>
              {status === "uploading" ? "Uploading…" : "Take Photo"}
            </button>

            <button
              type="button"
              disabled={status === "uploading"}
              onClick={() => libraryInputRef.current?.click()}
              style={{
                width: "100%",
                padding: "16px 20px",
                borderRadius: 12,
                background: "#FFFFFF",
                color: "#111",
                fontSize: 16,
                fontWeight: 600,
                border: "1px solid #d4d4d8",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 10,
                opacity: status === "uploading" ? 0.6 : 1,
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <polyline points="21 15 16 10 5 21" />
              </svg>
              Choose from Library
            </button>

            {error && (
              <div
                style={{
                  marginTop: 16,
                  padding: 14,
                  borderRadius: 10,
                  background: "#fef2f2",
                  border: "1px solid #fecaca",
                  color: "#991b1b",
                  fontSize: 13,
                }}
              >
                {error}
              </div>
            )}

            <div style={{ marginTop: 28, fontSize: 12, color: "#777", lineHeight: 1.5 }}>
              <div style={{ fontWeight: 600, color: "#555", marginBottom: 6 }}>Tips for a great house photo</div>
              <ul style={{ paddingLeft: 18, margin: 0 }}>
                <li>Stand across the street if you can</li>
                <li>Capture the full roofline</li>
                <li>Avoid heavy shadows</li>
                <li>Hold the camera level, straight-on</li>
              </ul>
            </div>

            <div style={{ marginTop: 24, fontSize: 11, color: "#999", textAlign: "center" }}>
              Supported: JPG, PNG, WebP · Max 20 MB
            </div>
          </>
        )}
      </div>
    </div>
  );
}

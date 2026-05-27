"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { QRCodeSVG } from "qrcode.react";
import { supabase } from "@/lib/supabase";

type Tab = "computer" | "phone";

interface Props {
  projectId: string;
  open: boolean;
  onClose: () => void;
  onUploaded: (url: string) => void;
}

interface MobileSession {
  sessionId: string;
  token: string;
  mobileUrl: string;
  expiresAt: string;
}

export default function HousePhotoUploadModal({ projectId, open, onClose, onUploaded }: Props) {
  const [tab, setTab] = useState<Tab>("computer");
  const [uploading, setUploading] = useState(false);
  const [computerError, setComputerError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [session, setSession] = useState<MobileSession | null>(null);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [creatingSession, setCreatingSession] = useState(false);
  const [phoneStatus, setPhoneStatus] = useState<"waiting" | "uploaded">("waiting");
  const [remainingMs, setRemainingMs] = useState<number | null>(null);

  const handleClose = useCallback(() => {
    setTab("computer");
    setComputerError(null);
    setSessionError(null);
    setSession(null);
    setPhoneStatus("waiting");
    setRemainingMs(null);
    onClose();
  }, [onClose]);

  // Create session when user switches to "phone" tab.
  // Effect is the right place for this — we're synchronizing with an external
  // resource (the server-side session) in response to tab+open changes.
  const creatingRef = useRef(false);
  useEffect(() => {
    if (!open || tab !== "phone" || session || creatingRef.current) return;
    creatingRef.current = true;
    setCreatingSession(true);
    setSessionError(null);
    fetch("/api/upload-sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId }),
    })
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error ?? "Failed to create session");
        setSession(data);
      })
      .catch((e: Error) => setSessionError(e.message))
      .finally(() => {
        creatingRef.current = false;
        setCreatingSession(false);
      });
  }, [open, tab, session, projectId]);

  // Realtime subscription — fires when the row's status flips to "uploaded"
  useEffect(() => {
    if (!session) return;
    const channel = supabase
      .channel(`upload-session-${session.sessionId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "upload_sessions",
          filter: `id=eq.${session.sessionId}`,
        },
        (payload) => {
          const row = payload.new as { status: string; photo_url: string | null };
          if (row.status === "uploaded" && row.photo_url) {
            setPhoneStatus("uploaded");
            onUploaded(row.photo_url);
            setTimeout(() => handleClose(), 1500);
          }
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [session, onUploaded, handleClose]);

  // Countdown timer
  useEffect(() => {
    if (!session) return;
    const expiresAtMs = new Date(session.expiresAt).getTime();
    const tick = () => setRemainingMs(Math.max(0, expiresAtMs - Date.now()));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [session]);

  const handleComputerFile = useCallback(
    async (file: File) => {
      setUploading(true);
      setComputerError(null);
      const formData = new FormData();
      formData.append("file", file);
      formData.append("projectId", projectId);
      try {
        const res = await fetch("/api/upload-house-photo", { method: "POST", body: formData });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setComputerError(data.error ?? "Upload failed");
          return;
        }
        onUploaded(data.url);
        handleClose();
      } finally {
        setUploading(false);
      }
    },
    [projectId, onUploaded, handleClose],
  );

  if (!open) return null;

  const remainingLabel =
    remainingMs == null
      ? ""
      : remainingMs <= 0
        ? "expired"
        : `${Math.floor(remainingMs / 60000)}:${String(Math.floor((remainingMs % 60000) / 1000)).padStart(2, "0")}`;

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={handleClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15, 23, 42, 0.5)",
        zIndex: 100,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: 460,
          background: "#FFFFFF",
          borderRadius: 16,
          boxShadow: "var(--shadow-lg)",
          overflow: "hidden",
        }}
      >
        <div style={{ padding: "20px 24px", borderBottom: "1px solid var(--line)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 600, color: "var(--ink)", margin: 0 }}>Upload house photo</h2>
            <p style={{ fontSize: 12, color: "var(--ink-3)", margin: "2px 0 0" }}>Replace the background photo of your house.</p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            aria-label="Close"
            style={{ background: "transparent", border: "none", color: "var(--ink-3)", cursor: "pointer", padding: 4 }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div style={{ display: "flex", borderBottom: "1px solid var(--line)" }}>
          <TabButton active={tab === "computer"} onClick={() => setTab("computer")}>
            From computer
          </TabButton>
          <TabButton active={tab === "phone"} onClick={() => setTab("phone")}>
            From phone (QR)
          </TabButton>
        </div>

        <div style={{ padding: 24 }}>
          {tab === "computer" && (
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                style={{ display: "none" }}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleComputerFile(f);
                  e.target.value = "";
                }}
              />
              <button
                type="button"
                disabled={uploading}
                onClick={() => fileInputRef.current?.click()}
                style={{
                  width: "100%",
                  padding: "32px 20px",
                  borderRadius: 12,
                  background: "#FFFFFF",
                  border: "2px dashed var(--line)",
                  color: "var(--ink)",
                  fontSize: 14,
                  fontWeight: 500,
                  cursor: uploading ? "wait" : "pointer",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 10,
                  opacity: uploading ? 0.6 : 1,
                }}
              >
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
                {uploading ? "Uploading…" : "Click to choose a photo"}
                <span style={{ fontSize: 11, color: "var(--ink-3)", fontWeight: 400 }}>JPG, PNG, or WebP · max 20 MB</span>
              </button>
              {computerError && (
                <div style={{ marginTop: 12, padding: 10, borderRadius: 8, background: "#fef2f2", border: "1px solid #fecaca", color: "#991b1b", fontSize: 13 }}>
                  {computerError}
                </div>
              )}
            </div>
          )}

          {tab === "phone" && (
            <div style={{ textAlign: "center" }}>
              {creatingSession && <div style={{ padding: 40, color: "var(--ink-3)", fontSize: 13 }}>Generating QR code…</div>}

              {sessionError && (
                <div style={{ padding: 16, borderRadius: 10, background: "#fef2f2", border: "1px solid #fecaca", color: "#991b1b", fontSize: 13 }}>
                  {sessionError}
                </div>
              )}

              {session && phoneStatus === "waiting" && (
                <>
                  <p style={{ fontSize: 13, color: "var(--ink-3)", margin: "0 0 16px" }}>
                    Scan with your phone&apos;s camera to take or upload a photo. The desktop will update automatically.
                  </p>
                  <div
                    style={{
                      display: "inline-block",
                      padding: 16,
                      borderRadius: 12,
                      background: "#FFFFFF",
                      border: "1px solid var(--line)",
                      marginBottom: 14,
                    }}
                  >
                    <QRCodeSVG value={session.mobileUrl} size={200} level="M" />
                  </div>
                  <div style={{ fontSize: 11, color: "var(--ink-3)", marginBottom: 6 }}>
                    Link expires in <span style={{ fontVariantNumeric: "tabular-nums", fontWeight: 600 }}>{remainingLabel}</span>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 6,
                      fontSize: 11,
                      color: "var(--ink-3)",
                      padding: "8px 0",
                    }}
                  >
                    <span className="pulse-dot" style={{ width: 8, height: 8, borderRadius: 4, background: "#1e3a5f", display: "inline-block" }} />
                    Waiting for upload from your phone…
                  </div>
                  <details style={{ marginTop: 8, fontSize: 11, color: "var(--ink-3)", textAlign: "left" }}>
                    <summary style={{ cursor: "pointer", textAlign: "center" }}>Can&apos;t scan? Show link</summary>
                    <div
                      style={{
                        marginTop: 8,
                        padding: 10,
                        borderRadius: 8,
                        background: "var(--panel)",
                        border: "1px solid var(--line)",
                        fontFamily: "ui-monospace, monospace",
                        wordBreak: "break-all",
                      }}
                    >
                      {session.mobileUrl}
                    </div>
                  </details>
                </>
              )}

              {phoneStatus === "uploaded" && (
                <div style={{ padding: 30 }}>
                  <div style={{ fontSize: 40, color: "#16a34a", marginBottom: 8 }}>✓</div>
                  <div style={{ fontSize: 15, fontWeight: 600, color: "var(--ink)" }}>Photo received!</div>
                  <div style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 4 }}>Loading it into the editor…</div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        flex: 1,
        padding: "12px 16px",
        background: "transparent",
        border: "none",
        borderBottom: active ? "2px solid #1e3a5f" : "2px solid transparent",
        color: active ? "var(--ink)" : "var(--ink-3)",
        fontSize: 13,
        fontWeight: active ? 600 : 500,
        cursor: "pointer",
      }}
    >
      {children}
    </button>
  );
}

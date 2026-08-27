"use client";

import { Suspense, useCallback, useMemo, useRef, useState } from "react";
import { notFound, useSearchParams } from "next/navigation";
import PhotographicStageV2 from "@/components/scene/PhotographicStageV2";
import {
  DEFAULT_PHOTOGRAPHIC_SETTINGS,
  type PhotographicCompositorSettings,
} from "@/lib/scene/v2/photographic-compositor";
import {
  VISUALIZER_LOOP_SECONDS,
  visualizerDemoFixtures,
  visualizerDemoGroups,
  visualizerDemoSequence,
} from "./demo-data";

type SettingKey = keyof PhotographicCompositorSettings;

const CONTROL_RANGES: Array<{
  key: SettingKey;
  label: string;
  min: number;
  max: number;
  step: number;
}> = [
  { key: "nightExposure", label: "Night exposure", min: 0.12, max: 0.55, step: 0.01 },
  { key: "shadowFloor", label: "Shadow floor", min: 0, max: 0.05, step: 0.002 },
  { key: "coolness", label: "Coolness", min: 0, max: 0.45, step: 0.01 },
  { key: "saturation", label: "Photo saturation", min: 0.45, max: 1.15, step: 0.01 },
  { key: "coreSize", label: "Bulb core", min: 0.35, max: 1.6, step: 0.05 },
  { key: "haloSize", label: "Halo radius", min: 1.5, max: 9, step: 0.1 },
  { key: "haloStrength", label: "Halo strength", min: 0, max: 0.9, step: 0.02 },
  { key: "spillSize", label: "Surface spill radius", min: 5, max: 42, step: 1 },
  { key: "spillStrength", label: "Surface spill strength", min: 0, max: 0.6, step: 0.01 },
];

function VisualizerV2Harness() {
  if (process.env.NODE_ENV === "production") notFound();
  const searchParams = useSearchParams();
  const queryPhoto = searchParams.get("photo");
  const [pickedPhoto, setPickedPhoto] = useState<string | null>(null);
  const [settings, setSettings] = useState(DEFAULT_PHOTOGRAPHIC_SETTINGS);
  const [controlsOpen, setControlsOpen] = useState(true);
  const fileRef = useRef<HTMLInputElement>(null);
  const epochRef = useRef<number | null>(null);

  const photoUrl = pickedPhoto ?? queryPhoto ?? "/dev/sample-house.jpg";
  const fixtures = useMemo(() => visualizerDemoFixtures(), []);
  const groups = useMemo(() => visualizerDemoGroups(), []);
  const sequence = useMemo(() => visualizerDemoSequence(fixtures), [fixtures]);
  const getTime = useCallback(() => {
    if (epochRef.current === null) epochRef.current = performance.now();
    return ((performance.now() - epochRef.current) / 1000) % VISUALIZER_LOOP_SECONDS;
  }, []);

  return (
    <div className="flex h-screen flex-col" style={{ background: "#f7f7f5" }}>
      <header
        className="flex h-12 shrink-0 items-center justify-between px-4"
        style={{ borderBottom: "1px solid rgba(15,23,42,.1)", background: "#fff" }}
      >
        <div>
          <strong className="text-sm">Photographic Visualizer V2</strong>
          <span className="ml-2 text-xs" style={{ color: "#64748b" }}>
            isolated prototype
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button className="v2-button" onClick={() => setControlsOpen((open) => !open)}>
            {controlsOpen ? "Hide" : "Show"} controls
          </button>
          <button className="v2-button" onClick={() => setSettings(DEFAULT_PHOTOGRAPHIC_SETTINGS)}>
            Reset
          </button>
          <button className="v2-button v2-button-primary" onClick={() => fileRef.current?.click()}>
            Try another photo
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            hidden
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) setPickedPhoto(URL.createObjectURL(file));
            }}
          />
        </div>
      </header>

      <main className="flex min-h-0 flex-1">
        <section className="min-w-0 flex-1 p-3">
          <div
            className="h-full overflow-hidden rounded-xl"
            style={{
              background: "#03050b",
              boxShadow: "0 14px 40px rgba(15,23,42,.18)",
              border: "1px solid rgba(15,23,42,.12)",
            }}
          >
            <PhotographicStageV2
              photoUrl={photoUrl}
              fixtures={fixtures}
              groups={groups}
              sequence={sequence}
              getTime={getTime}
              settings={settings}
            />
          </div>
        </section>

        {controlsOpen && (
          <aside
            className="w-80 shrink-0 overflow-y-auto p-4"
            style={{ background: "#fff", borderLeft: "1px solid rgba(15,23,42,.1)" }}
          >
            <div className="mb-5">
              <h2 className="text-sm font-semibold">Image formation</h2>
              <p className="mt-1 text-xs leading-5" style={{ color: "#64748b" }}>
                The photo stays outside the glow pipeline. These controls tune the night
                plate, bulb core, selective halo, and masked surface illumination.
              </p>
            </div>

            <div className="space-y-4">
              {CONTROL_RANGES.map((control) => (
                <label key={control.key} className="block">
                  <span className="mb-1.5 flex justify-between text-xs font-medium">
                    <span>{control.label}</span>
                    <span style={{ color: "#64748b" }}>
                      {settings[control.key].toFixed(control.step < 0.01 ? 3 : 2)}
                    </span>
                  </span>
                  <input
                    className="w-full"
                    type="range"
                    min={control.min}
                    max={control.max}
                    step={control.step}
                    value={settings[control.key]}
                    onChange={(event) =>
                      setSettings((current) => ({
                        ...current,
                        [control.key]: Number(event.target.value),
                      }))
                    }
                  />
                </label>
              ))}
            </div>

            <div
              className="mt-6 rounded-lg p-3 text-xs leading-5"
              style={{ background: "#f1f5f9", color: "#475569" }}
            >
              This route does not import or modify the existing depth scene. It is a
              side-by-side engineering prototype for choosing the next visualizer
              foundation.
            </div>
          </aside>
        )}
      </main>

      <style jsx>{`
        .v2-button {
          height: 30px;
          padding: 0 11px;
          border-radius: 8px;
          border: 1px solid rgba(15, 23, 42, 0.12);
          background: #fff;
          color: #1e293b;
          font-size: 12px;
          font-weight: 600;
        }
        .v2-button:hover {
          background: #f8fafc;
        }
        .v2-button-primary {
          background: #0f3b7d;
          color: white;
          border-color: #0f3b7d;
        }
        .v2-button-primary:hover {
          background: #0b326b;
        }
      `}</style>
    </div>
  );
}

export default function VisualizerV2Page() {
  return (
    <Suspense fallback={null}>
      <VisualizerV2Harness />
    </Suspense>
  );
}

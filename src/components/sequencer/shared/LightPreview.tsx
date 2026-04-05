import { useEffect, useState } from 'react'

export function LightPreview({ playing }: { playing: boolean }) {
  const [tick, setTick] = useState(0)
  useEffect(() => {
    if (!playing) return
    const id = setInterval(() => setTick((t) => t + 1), 180)
    return () => clearInterval(id)
  }, [playing])
  return (
    <div className="rounded-[28px] border border-slate-200 bg-slate-950 p-5 shadow-inner">
      <div className="grid grid-cols-12 gap-3">
        <div className="col-span-3 flex flex-col justify-end gap-3">
          <div
            className={`mx-auto h-20 w-20 rounded-full border-4 ${
              playing && tick % 2 === 0
                ? 'border-brand-green bg-brand-green/25 shadow-brand-soft'
                : 'border-slate-700 bg-slate-800'
            }`}
          />
          <div className="text-center text-xs text-slate-400">Singing Face</div>
        </div>
        <div className="col-span-6 flex flex-col items-center justify-end">
          <div className="flex h-36 items-end gap-1">
            {Array.from({ length: 18 }).map((_, i) => {
              const active = playing ? ((tick + i) % 5) + 2 : 2
              const height = `${active * 12 + (i % 4) * 8}%`
              return (
                <div
                  key={i}
                  className="w-3 rounded-t-full bg-brand-green shadow-[0_0_18px_rgba(112,173,71,0.5)] transition-all duration-150"
                  style={{ height }}
                />
              )
            })}
          </div>
          <div className="mt-3 text-xs text-slate-400">Mega Tree</div>
        </div>
        <div className="col-span-3 flex flex-col justify-end gap-2">
          <div className="grid grid-cols-4 gap-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className={`h-4 rounded-full transition-all duration-150 ${
                  playing && (tick + i) % 2 === 0
                    ? 'bg-brand-red shadow-brand-red-soft'
                    : 'bg-slate-700'
                }`}
              />
            ))}
          </div>
          <div className="text-center text-xs text-slate-400">Ground Stakes</div>
        </div>
      </div>
      <div className="mt-5 rounded-2xl border border-brand-green/25 bg-slate-900/85 p-3 ring-1 ring-brand-red/20">
        <div className="mb-2 text-left text-xs uppercase tracking-[0.16em] text-brand-green/90">
          Playback preview
        </div>
        <div className="flex h-14 items-end gap-1 overflow-hidden rounded-xl bg-slate-950 p-2">
          {Array.from({ length: 36 }).map((_, i) => {
            const h = playing ? 18 + (((tick * 7) + i * 13) % 65) : 20 + (i % 5) * 5
            return (
              <div
                key={i}
                className="flex-1 rounded-full bg-white/80 transition-all duration-150"
                style={{ height: `${h}%` }}
              />
            )
          })}
        </div>
      </div>
    </div>
  )
}

import { useEffect, useId, useRef, useState, type ReactNode } from 'react'

export function InfoPopover({ title, children }: { title: string; children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const id = useId()

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  return (
    <div className="relative flex flex-wrap items-center gap-2" ref={ref}>
      <span className="text-base font-semibold tracking-tight text-slate-900">{title}</span>
      <button
        type="button"
        className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-sm font-semibold text-slate-400 transition duration-150 ease-out hover:bg-slate-100 hover:text-slate-700"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((o) => !o)}
        title="About this section"
      >
        ⓘ
        <span className="sr-only">About {title}</span>
      </button>
      {open ? (
        <div
          id={id}
          role="tooltip"
          className="absolute left-0 top-full z-50 mt-2 w-[min(100vw-2rem,22rem)] rounded-xl border border-slate-200/80 bg-white p-4 text-sm leading-relaxed text-slate-600 shadow-[0_12px_40px_-12px_rgba(15,23,42,0.18)]"
        >
          {children}
        </div>
      ) : null}
    </div>
  )
}

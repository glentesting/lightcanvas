import { LogOut, User } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import logoSrc from '../../assets/LightCanvas_Logo_Transparent.png'

export interface SequencerHeaderProps {
  signOut: () => void | Promise<void>
  userEmail: string | undefined
}

export function SequencerHeader({ signOut, userEmail }: SequencerHeaderProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  const initial = userEmail?.trim().charAt(0).toUpperCase() ?? '?'

  return (
    <header className="flex min-h-[56px] shrink-0 items-center justify-between gap-4 bg-white">
      <div className="flex items-center justify-start">
        <img src={logoSrc} alt="LightCanvas" style={{ height: 28, width: 'auto', maxWidth: 'none', display: 'block' }} />
      </div>

      <div className="relative shrink-0" ref={ref}>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-slate-100 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-brand-green/40 hover:bg-white md:h-10 md:w-10"
          aria-expanded={open}
          aria-haspopup="menu"
          aria-label="Account menu"
        >
          {initial}
        </button>
        {open ? (
          <div
            className="absolute right-0 z-50 mt-2 w-64 rounded-xl border border-slate-200 bg-white py-2 shadow-lg"
            role="menu"
          >
            <div className="flex items-start gap-3 border-b border-slate-100 px-4 py-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-700">
                <User className="h-5 w-5" aria-hidden />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-medium uppercase tracking-wide text-slate-400">Signed in</div>
                <div className="truncate text-sm text-slate-800" title={userEmail}>
                  {userEmail ?? 'Account'}
                </div>
              </div>
            </div>
            <button
              type="button"
              role="menuitem"
              className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-slate-700 transition hover:bg-slate-50"
              onClick={() => {
                setOpen(false)
                void signOut()
              }}
            >
              <LogOut className="h-4 w-4 shrink-0" aria-hidden />
              Sign out
            </button>
          </div>
        ) : null}
      </div>
    </header>
  )
}

import { LogOut } from 'lucide-react'
import LightCanvasSequencerPrototype from './LightCanvasSequencerPrototype'
import { LightCanvasWordmark } from './LightCanvasWordmark'
import { useAuth } from '../contexts/AuthContext'

export default function AppShell() {
  const { signOut, user } = useAuth()

  return (
    <div className="flex min-h-dvh flex-col bg-slate-50/80">
      <header className="sticky top-0 z-50 shrink-0 border-b border-brand-green/25 bg-white/95 shadow-brand-soft backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3">
          <LightCanvasWordmark className="shrink-0 text-lg font-semibold tracking-tight md:text-xl" />
        </div>
      </header>

      <main className="min-w-0 flex-1">
        <LightCanvasSequencerPrototype />
      </main>

      <footer className="shrink-0 border-t border-slate-200 bg-white px-4 py-3 shadow-[0_-4px_24px_-8px_rgba(15,23,42,0.08)]">
        <div className="mx-auto flex max-w-7xl flex-col items-stretch justify-between gap-3 sm:flex-row sm:items-center">
          <span className="min-w-0 text-sm text-slate-600">
            {user?.email ? (
              <span className="block truncate" title={user.email}>
                {user.email}
              </span>
            ) : null}
          </span>
          <button
            type="button"
            onClick={() => void signOut()}
            className="inline-flex shrink-0 items-center justify-center gap-2 self-start rounded-xl border-2 border-brand-green/40 bg-white px-3 py-2 text-sm font-medium text-brand-green transition hover:bg-brand-green/10 sm:self-auto"
          >
            <LogOut className="h-4 w-4" aria-hidden />
            Sign out
          </button>
        </div>
      </footer>
    </div>
  )
}

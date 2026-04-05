import { LogOut } from 'lucide-react'
import LightCanvasSequencerPrototype from './LightCanvasSequencerPrototype'
import { LightCanvasWordmark } from './LightCanvasWordmark'
import { useAuth } from '../contexts/AuthContext'

export default function AppShell() {
  const { signOut, user } = useAuth()

  return (
    <div className="min-h-dvh bg-slate-50/80">
      <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3">
          <LightCanvasWordmark className="shrink-0 text-lg font-semibold tracking-tight md:text-xl" />
          <div className="flex items-center gap-3">
            {user?.email ? (
              <span className="hidden max-w-[240px] truncate text-sm text-slate-600 md:block" title={user.email}>
                {user.email}
              </span>
            ) : null}
            <button
              type="button"
              onClick={() => void signOut()}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              <LogOut className="h-4 w-4" aria-hidden />
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main>
        <LightCanvasSequencerPrototype />
      </main>
    </div>
  )
}

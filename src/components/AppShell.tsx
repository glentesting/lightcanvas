import { LogOut } from 'lucide-react'
import LightCanvasSequencerPrototype from './LightCanvasSequencerPrototype'
import { LightCanvasWordmark } from './LightCanvasWordmark'
import { useAuth } from '../contexts/AuthContext'

export default function AppShell() {
  const { signOut, user } = useAuth()

  return (
    <div className="relative min-h-screen">
      <header className="sticky top-0 z-50 border-b border-brand-green/25 bg-white/90 px-4 py-3 shadow-brand-soft backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
          <LightCanvasWordmark className="shrink-0 text-lg font-semibold tracking-tight md:text-xl" />
          <span className="min-w-0 flex-1 truncate text-center text-sm text-slate-600 max-sm:hidden">
            {user?.email ?? ''}
          </span>
          <button
            type="button"
            onClick={() => void signOut()}
            className="inline-flex shrink-0 items-center gap-2 rounded-xl border-2 border-brand-green/40 bg-white px-3 py-2 text-sm font-medium text-brand-green transition hover:bg-brand-green/10"
          >
            <LogOut className="h-4 w-4" aria-hidden />
            Sign out
          </button>
        </div>
        {user?.email ? (
          <div className="border-b border-brand-green/10 bg-white/80 px-4 py-1.5 text-center text-xs text-slate-600 sm:hidden">
            <span className="truncate">{user.email}</span>
          </div>
        ) : null}
      </header>
      <LightCanvasSequencerPrototype />
    </div>
  )
}

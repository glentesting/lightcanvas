import { LogOut } from 'lucide-react'
import LightCanvasSequencerPrototype from './LightCanvasSequencerPrototype'
import { useAuth } from '../contexts/AuthContext'

export default function AppShell() {
  const { signOut, user } = useAuth()

  return (
    <div className="relative min-h-screen">
      <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/90 px-4 py-3 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
          <span className="min-w-0 truncate text-sm text-slate-600">{user?.email ?? ''}</span>
          <button
            type="button"
            onClick={() => void signOut()}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-800 transition hover:bg-slate-50"
          >
            <LogOut className="h-4 w-4" aria-hidden />
            Sign out
          </button>
        </div>
      </header>
      <LightCanvasSequencerPrototype />
    </div>
  )
}

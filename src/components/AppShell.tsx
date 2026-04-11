import LightCanvasSequencerPrototype from './LightCanvasSequencerPrototype'

export default function AppShell() {
  return (
    <div className="flex min-h-0 flex-1 flex-col bg-slate-100 text-slate-900">
      <main className="flex min-h-0 flex-1 flex-col">
        <LightCanvasSequencerPrototype />
      </main>
    </div>
  )
}

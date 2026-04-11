import { useState } from 'react'
import { X } from 'lucide-react'
import type { TabValue } from './sequencer/types'

const STEPS = [
  {
    title: 'Welcome to LightCanvas',
    body: "You're about to build your first light show. It takes about 10 minutes from setup to a working sequence.",
    cta: "Let's go",
    tab: null as TabValue | null,
  },
  {
    title: 'Set up your display',
    body: "Tell us about your controllers and props. Don't worry about getting it perfect — you can always change it later.",
    cta: 'Go to Display Setup',
    tab: 'setup' as TabValue,
  },
  {
    title: 'Upload your first song',
    body: 'Add the MP3 you want to sequence. LightCanvas will analyze the beat, bass, and vocals to drive your lights.',
    cta: 'Go to Song Library',
    tab: 'songs' as TabValue,
  },
  {
    title: 'Let AI sequence your show',
    body: "Once you've got props and a song, run the AI sequencer. It reads your audio and creates a full light show in seconds.",
    cta: 'Go to Sequencing',
    tab: 'ai' as TabValue,
  },
]

export function OnboardingFlow({
  setActiveTab,
  onComplete,
}: {
  setActiveTab: (tab: TabValue) => void
  onComplete: () => void
}) {
  const [step, setStep] = useState(0)
  const current = STEPS[step]

  const handleCta = () => {
    if (current.tab) {
      setActiveTab(current.tab)
      onComplete()
    } else if (step < STEPS.length - 1) {
      setStep(step + 1)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="relative w-full max-w-lg rounded-2xl bg-white p-8 shadow-2xl">
        {/* Skip */}
        <button
          type="button"
          onClick={onComplete}
          className="absolute right-4 top-4 p-1 text-slate-400 transition hover:text-slate-600"
          aria-label="Skip onboarding"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Progress dots */}
        <div className="mb-6 flex justify-center gap-2">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={`h-2 w-2 rounded-full transition ${
                i === step ? 'bg-brand-green' : 'bg-slate-200'
              }`}
            />
          ))}
        </div>

        <h2 className="text-xl font-bold tracking-tight text-slate-900">
          {current.title}
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-slate-600">
          {current.body}
        </p>

        <button
          type="button"
          onClick={handleCta}
          className="mt-6 w-full rounded-lg bg-brand-green px-6 py-3 text-sm font-semibold text-white transition hover:brightness-110"
        >
          {current.cta}
        </button>

        {step > 0 && (
          <button
            type="button"
            onClick={() => setStep(step - 1)}
            className="mt-2 w-full text-center text-xs text-slate-400 transition hover:text-slate-600"
          >
            Back
          </button>
        )}
      </div>
    </div>
  )
}

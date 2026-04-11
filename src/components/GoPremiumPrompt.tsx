import { X } from 'lucide-react'

export function GoPremiumPrompt({
  reason,
  onDismiss,
}: {
  reason: string
  onDismiss?: () => void
}) {
  return (
    <div className="relative rounded-xl border border-brand-green/30 bg-slate-900 p-5">
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          className="absolute right-3 top-3 p-1 text-slate-500 transition hover:text-slate-300"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>
      )}
      <p className="text-sm leading-relaxed text-slate-300">{reason}</p>
      <p className="mt-1.5 text-xs text-slate-500">
        LightCanvas Pro — $12.99/month or $109/year
      </p>
      <a
        href="https://lightcanvas.co/pricing"
        className="mt-3 inline-flex items-center rounded-lg bg-brand-green px-5 py-2.5 text-sm font-semibold text-white transition hover:brightness-110"
      >
        Go Premium
      </a>
      <p className="mt-2 text-[11px] text-slate-500">Cancel anytime. No BS.</p>
    </div>
  )
}

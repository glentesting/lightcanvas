import type { ReactNode } from 'react'

export function Stat({ label, value, sub, valueTruncate = false }: {
  label: string
  value: ReactNode
  sub?: ReactNode
  valueTruncate?: boolean
}) {
  return (
    <div className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="text-xs uppercase tracking-[0.16em] text-slate-500">{label}</div>
      <div className={`mt-2 text-2xl font-semibold text-slate-900 tabular-nums ${valueTruncate ? 'truncate whitespace-nowrap' : 'break-words'}`} title={typeof value === 'string' ? value : undefined}>
        {value}
      </div>
      {sub ? <div className="mt-1 text-sm leading-snug text-slate-600">{sub}</div> : null}
    </div>
  )
}

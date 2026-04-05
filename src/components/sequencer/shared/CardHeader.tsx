import type { LucideIcon } from 'lucide-react'

export function CardHeader({
  title,
  description,
  icon: Icon,
}: {
  title: string
  description?: string
  icon?: LucideIcon
}) {
  return (
    <div className="border-b border-slate-100 px-6 pb-5 pt-6">
      <div className="flex items-start gap-3">
        {Icon ? (
          <div className="mt-0.5 shrink-0 rounded-xl bg-slate-100 p-2.5 text-slate-700">
            <Icon className="h-5 w-5" />
          </div>
        ) : null}
        <div className="min-w-0 flex-1">
          <div className="text-lg font-semibold leading-snug text-slate-900 md:text-xl">{title}</div>
          {description ? <div className="mt-1.5 text-sm leading-relaxed text-slate-600">{description}</div> : null}
        </div>
      </div>
    </div>
  )
}

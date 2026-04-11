import type { TabValue } from './types'
import { sequencerTabs } from './types'

export function SequencerTabs({
  value,
  onChange,
}: {
  value: TabValue
  onChange: (v: TabValue) => void
}) {
  return (
    <nav className="-mx-0.5 flex flex-wrap items-center gap-1 pt-1 md:gap-1.5" aria-label="Workspace">
      {sequencerTabs.map((tab) => {
        const active = value === tab.value
        return (
          <button
            key={tab.value}
            type="button"
            onClick={() => { onChange(tab.value); window.scrollTo(0, 0) }}
            className={`relative rounded-lg px-3.5 py-2 text-sm font-medium transition duration-150 ease-out ${
              active
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            } `}
          >
            {tab.label}
          </button>
        )
      })}
    </nav>
  )
}

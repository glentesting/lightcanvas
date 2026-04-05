export function PillTabs<T extends string>({
  tabs,
  value,
  onChange,
}: {
  tabs: { value: T; label: string }[]
  value: T
  onChange: (v: T) => void
}) {
  return (
    <div className="grid h-auto w-full grid-cols-2 gap-2 rounded-2xl bg-slate-200/70 p-2 md:grid-cols-5">
      {tabs.map((tab) => (
        <button
          key={tab.value}
          type="button"
          onClick={() => onChange(tab.value)}
          className={`rounded-xl px-3 py-2.5 text-sm font-medium transition ${
            value === tab.value
              ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-200/80'
              : 'text-slate-600 hover:bg-slate-100/90'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}

export function SliderRow({
  label,
  value,
  onChange,
  min = 0,
  max = 100,
  disabled = false,
}: {
  label: string
  value: number
  onChange: (n: number) => void
  min?: number
  max?: number
  disabled?: boolean
}) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-sm">
        <span className={disabled ? 'text-slate-400' : 'text-slate-700'}>{label}</span>
        <span className={`font-medium ${disabled ? 'text-slate-400' : 'text-brand-green'}`}>{value}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-brand-green disabled:cursor-not-allowed disabled:opacity-50"
      />
    </div>
  )
}

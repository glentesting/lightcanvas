export function Progress({ value }: { value: number }) {
  return (
    <div className="h-3 w-full overflow-hidden rounded-full bg-slate-200">
      <div className="h-full rounded-full bg-brand-green transition-all duration-300" style={{ width: `${value}%` }} />
    </div>
  )
}

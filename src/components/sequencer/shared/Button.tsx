import type { MouseEventHandler, ReactNode } from 'react'

export function Button({
  children,
  onClick,
  className = '',
  variant = 'primary',
  disabled = false,
}: {
  children: ReactNode
  onClick?: MouseEventHandler<HTMLButtonElement>
  className?: string
  variant?: 'primary' | 'secondary' | 'ghost'
  disabled?: boolean
}) {
  const styles =
    variant === 'secondary'
      ? 'border border-slate-300/90 bg-white text-slate-700 shadow-sm hover:border-slate-400 hover:bg-slate-50'
      : variant === 'ghost'
        ? 'bg-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-900'
        : 'bg-brand-green text-white shadow-brand-soft hover:bg-brand-green-dark'

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition duration-150 ease-out disabled:cursor-not-allowed disabled:opacity-50 ${styles} ${className}`}
    >
      {children}
    </button>
  )
}

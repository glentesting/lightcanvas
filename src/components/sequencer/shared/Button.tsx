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
      ? 'bg-white text-brand-green border-2 border-brand-green/35 hover:bg-brand-green/10'
      : variant === 'ghost'
        ? 'bg-transparent text-slate-700 hover:bg-brand-green/10'
        : 'bg-brand-green text-white hover:bg-brand-green-dark shadow-brand-soft'

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${styles} ${className}`}
    >
      {children}
    </button>
  )
}

import type { ReactNode } from 'react'

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-2xl border border-slate-200/90 bg-white shadow-[0_12px_40px_-16px_rgba(15,23,42,0.12)] ${className}`}
    >
      {children}
    </div>
  )
}

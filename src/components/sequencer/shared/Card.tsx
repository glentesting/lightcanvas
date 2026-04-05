import type { ReactNode } from 'react'

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-[26px] border border-slate-200 bg-white shadow-lg shadow-slate-200/60 ${className}`}>{children}</div>
}

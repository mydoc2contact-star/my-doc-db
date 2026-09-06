import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

interface StatCardProps {
  label: string
  value: number | string
  icon: ReactNode
  tone?: 'blue' | 'green' | 'red' | 'slate'
}

const TONES = {
  blue: 'bg-brand-50 text-brand-700',
  green: 'bg-emerald-50 text-emerald-700',
  red: 'bg-rose-50 text-rose-700',
  slate: 'bg-slate-100 text-slate-600',
}

export function StatCard({ label, value, icon, tone = 'blue' }: StatCardProps) {
  return (
    <div className="rounded-xl border border-surface-border bg-white p-4 shadow-card">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm text-slate-500">{label}</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>
        </div>
        <span className={cn('inline-flex h-10 w-10 items-center justify-center rounded-lg', TONES[tone])}>
          {icon}
        </span>
      </div>
    </div>
  )
}

import type { ReactNode } from 'react'
import { ArrowRight, X } from 'lucide-react'
import { Button } from './Button'

export function Modal({
  title,
  children,
  onClose,
}: {
  title: string
  children: ReactNode
  onClose: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 p-4 sm:items-center">
      <button className="absolute inset-0" aria-label="إغلاق" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg rounded-xl bg-white p-5 shadow-card">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <Button variant="outline" size="sm" onClick={onClose} leftIcon={<ArrowRight className="h-4 w-4" />}>
              رجوع
            </Button>
            <h2 className="truncate text-base font-bold text-slate-900">{title}</h2>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="إغلاق">
            <X className="h-4 w-4" />
          </Button>
        </div>
        {children}
      </div>
    </div>
  )
}

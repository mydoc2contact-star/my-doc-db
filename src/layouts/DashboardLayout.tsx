import { useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { Menu } from 'lucide-react'
import { Sidebar } from './Sidebar'
import { BackButton } from '@/components/BackButton'
import { Button } from '@/components/ui/Button'
import { useAuth } from '@/contexts/AuthContext'

export function DashboardLayout() {
  const [open, setOpen] = useState(false)
  const { doctor } = useAuth()
  const location = useLocation()
  const showBack = location.pathname !== '/'

  return (
    <div className="flex min-h-full bg-surface-muted">
      <Sidebar open={open} onClose={() => setOpen(false)} />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 items-center justify-between border-b border-surface-border bg-white px-4 lg:px-6">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setOpen(true)}
              aria-label="فتح القائمة"
            >
              <Menu className="h-5 w-5" />
            </Button>
            {showBack && <BackButton />}
            <div>
              <p className="text-sm font-bold text-slate-900">{doctor?.name ?? 'الطبيب'}</p>
              <p className="text-xs text-slate-500">{doctor?.specialization}</p>
            </div>
          </div>
          {doctor?.isOnline ? (
            <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
              متاح
            </span>
          ) : (
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-500">
              غير متصل
            </span>
          )}
        </header>

        <main className="flex-1 p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

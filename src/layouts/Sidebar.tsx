import { NavLink } from 'react-router-dom'
import { BarChart3, CalendarDays, LayoutDashboard, Settings, Users, X } from 'lucide-react'
import { Logo } from '@/components/Logo'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/cn'

const ITEMS = [
  { to: '/', label: 'الرئيسية', icon: LayoutDashboard },
  { to: '/appointments', label: 'المواعيد', icon: CalendarDays },
  { to: '/patients', label: 'المرضى', icon: Users },
  { to: '/statistics', label: 'الإحصائيات', icon: BarChart3 },
  { to: '/settings', label: 'الإعدادات', icon: Settings },
] as const

interface SidebarProps {
  open: boolean
  onClose: () => void
}

export function Sidebar({ open, onClose }: SidebarProps) {
  return (
    <>
      {open && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-slate-900/40 lg:hidden"
          aria-label="إغلاق القائمة"
          onClick={onClose}
        />
      )}

      <aside
        className={cn(
          'flex w-64 shrink-0 flex-col border-e border-surface-border bg-white',
          'max-lg:fixed max-lg:inset-y-0 max-lg:z-50 max-lg:start-0',
          open
            ? 'max-lg:translate-x-0'
            : 'max-lg:-translate-x-full max-lg:rtl:translate-x-full rtl:max-lg:translate-x-full',
        )}
      >
        <div className="flex h-16 items-center justify-between border-b border-surface-border px-4">
          <Logo size="sm" className="max-w-[160px]" />
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={onClose} aria-label="إغلاق">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-4">
          {ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              onClick={onClose}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium',
                  isActive ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900',
                )
              }
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>
    </>
  )
}

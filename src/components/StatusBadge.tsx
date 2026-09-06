import type { Appointment } from '@/types'
import { getDisplayStatus, statusClass, statusLabel } from '@/utils/status'
import { cn } from '@/lib/cn'

export function StatusBadge({ appointment }: { appointment: Appointment }) {
  const status = getDisplayStatus(appointment)
  return (
    <span className={cn('inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium', statusClass(status))}>
      {statusLabel(status)}
    </span>
  )
}

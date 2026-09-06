import type { Appointment } from '@/types'
import { getDisplayStatus, isPrivateAppointment, statusClass, statusLabel } from '@/utils/status'
import { cn } from '@/lib/cn'

export function StatusBadge({ appointment }: { appointment: Appointment }) {
  if (isPrivateAppointment(appointment) && appointment.status !== 'CANCELLED' && appointment.status !== 'REJECTED') {
    return (
      <span className="inline-flex rounded-full bg-violet-100 px-2.5 py-0.5 text-xs font-medium text-violet-800">
        موعد خاص
      </span>
    )
  }

  const status = getDisplayStatus(appointment)
  return (
    <span className={cn('inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium', statusClass(status))}>
      {statusLabel(status)}
    </span>
  )
}

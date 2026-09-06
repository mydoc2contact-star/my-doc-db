import type { Appointment, DisplayStatus } from '@/types'
import { isAttendanceMarkingAvailable } from '@/utils/dates'

const LABEL: Record<DisplayStatus, string> = {
  upcoming: 'قادم',
  attended: 'حضر',
  absent: 'غائب',
  completed: 'مكتمل',
  cancelled: 'ملغى',
}

const TONE: Record<DisplayStatus, string> = {
  upcoming: 'bg-sky-50 text-sky-700',
  attended: 'bg-emerald-50 text-emerald-700',
  absent: 'bg-rose-50 text-rose-700',
  completed: 'bg-slate-100 text-slate-600',
  cancelled: 'bg-slate-100 text-slate-500',
}

export function getDisplayStatus(appointment: Appointment): DisplayStatus {
  if (appointment.status === 'CANCELLED' || appointment.status === 'REJECTED') {
    return 'cancelled'
  }
  if (appointment.status === 'COMPLETED') return 'completed'
  if (appointment.status === 'NO_SHOW' || appointment.attendanceStatus === 'ABSENT') {
    return 'absent'
  }
  if (appointment.attendanceStatus === 'ATTENDED') return 'attended'
  return 'upcoming'
}

export function statusLabel(status: DisplayStatus): string {
  return LABEL[status]
}

export function statusClass(status: DisplayStatus): string {
  return TONE[status]
}

export function patientName(appointment: Appointment): string {
  return appointment.patient?.name || appointment.patientName || (appointment.isPrivate ? 'موعد خاص' : 'مريض')
}

export function patientPhone(appointment: Appointment): string {
  return appointment.patient?.phone || appointment.patientPhone || '—'
}

export function isActiveAppointment(appointment: Appointment): boolean {
  return appointment.status !== 'CANCELLED' && appointment.status !== 'REJECTED'
}

export function isPrivateAppointment(appointment: Appointment): boolean {
  return Boolean(appointment.isPrivate)
}

export function canRecordAttendance(appointment: Appointment): boolean {
  if (appointment.isPrivate) return false
  if (appointment.status === 'CANCELLED' || appointment.status === 'REJECTED') return false
  return appointment.attendanceStatus === 'PENDING' || appointment.attendanceStatus === 'LATE'
}

export function isAttendanceWindowOpen(appointment: Appointment, now = new Date()): boolean {
  return isAttendanceMarkingAvailable(appointment.date, appointment.time, now)
}

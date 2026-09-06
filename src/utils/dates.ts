const APP_TZ_OFFSET_MINUTES = 60
export const ATTENDANCE_MARK_GRACE_MINUTES = 10

export function toDateKey(value?: string | Date | null): string {
  if (!value) return todayKey()
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value
  const parsed = typeof value === 'string' ? new Date(value) : value
  if (parsed instanceof Date && !Number.isNaN(parsed.getTime())) {
    return formatUtcKey(parsed)
  }
  return String(value).slice(0, 10)
}

export function todayKey(): string {
  const shifted = new Date(Date.now() + APP_TZ_OFFSET_MINUTES * 60 * 1000)
  return formatUtcKey(shifted)
}

export function formatUtcKey(date: Date): string {
  const year = date.getUTCFullYear()
  const month = String(date.getUTCMonth() + 1).padStart(2, '0')
  const day = String(date.getUTCDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function normalizeTime(value: string): string {
  const [hours = '0', minutes = '0'] = value.trim().split(':')
  const hour = Number(hours)
  const minute = Number(minutes)
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return '09:00'
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
}

export function formatLocalKey(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function formatDateAr(value?: string | Date | null): string {
  const key = toDateKey(value)
  const [year, month, day] = key.split('-').map(Number)
  if (!year || !month || !day) return '—'
  return new Intl.DateTimeFormat('ar', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(year, month - 1, day))
}

export function formatWeekdayAr(value?: string | Date | null): string {
  const key = toDateKey(value)
  const [year, month, day] = key.split('-').map(Number)
  if (!year || !month || !day) return '—'
  return new Intl.DateTimeFormat('ar', { weekday: 'long' }).format(new Date(year, month - 1, day))
}

export function nextDays(count: number, from = todayKey()): string[] {
  return Array.from({ length: count }, (_, index) => addDays(from, index))
}

export function addDays(key: string, amount: number): string {
  const [year, month, day] = key.split('-').map(Number)
  const date = new Date(year, month - 1, day + amount)
  return formatLocalKey(date)
}

export function startOfWeek(key: string): string {
  const [year, month, day] = key.split('-').map(Number)
  const date = new Date(year, month - 1, day)
  const weekday = date.getDay()
  const saturdayOffset = (weekday + 1) % 7
  date.setDate(date.getDate() - saturdayOffset)
  return formatLocalKey(date)
}

export function startOfMonth(key: string): string {
  return `${key.slice(0, 7)}-01`
}

function wallClockToUtcDate(
  year: number,
  monthIndex: number,
  day: number,
  hour: number,
  minute: number,
): Date {
  const utcMs =
    Date.UTC(year, monthIndex, day, hour, minute, 0, 0) - APP_TZ_OFFSET_MINUTES * 60 * 1000
  return new Date(utcMs)
}

export function getAppointmentDateTime(dateValue: string, time: string): Date {
  const key = toDateKey(dateValue)
  const [year, month, day] = key.split('-').map(Number)
  const safeTime = /^\d{1,2}:\d{2}/.test(time) ? time : '00:00'
  const [hours, minutes] = safeTime.split(':').map(Number)
  return wallClockToUtcDate(year, (month ?? 1) - 1, day ?? 1, hours || 0, minutes || 0)
}

export function isAttendanceMarkingAvailable(
  dateValue: string,
  time: string,
  now = new Date(),
  graceMinutes = ATTENDANCE_MARK_GRACE_MINUTES,
): boolean {
  const appointmentAt = getAppointmentDateTime(dateValue, time)
  return now.getTime() >= appointmentAt.getTime() - graceMinutes * 60 * 1000
}

export function formatAppointmentTime(time: string, endTime?: string | null): string {
  const start = normalizeTime(time)
  if (!endTime) return start
  return `${start} – ${normalizeTime(endTime)}`
}

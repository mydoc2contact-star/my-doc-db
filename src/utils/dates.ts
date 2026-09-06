export function toDateKey(value?: string | Date | null): string {
  if (!value) return todayKey()
  if (typeof value === 'string') {
    const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/)
    if (match) return `${match[1]}-${match[2]}-${match[3]}`
    const parsed = new Date(value)
    if (!Number.isNaN(parsed.getTime())) return formatLocalKey(parsed)
    return value.slice(0, 10)
  }
  return formatLocalKey(value)
}

export function todayKey(): string {
  return formatLocalKey(new Date())
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

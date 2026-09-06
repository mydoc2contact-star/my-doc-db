import { useMemo, useState } from 'react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { CalendarDays, CheckCircle2, UserMinus, Users, XCircle } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { StatCard } from '@/components/ui/StatCard'
import { useAsync } from '@/hooks/useAsync'
import { listAllAppointments, listPatients } from '@/services/api'
import { addDays, formatDateAr, startOfMonth, startOfWeek, todayKey, toDateKey } from '@/utils/dates'
import { getDisplayStatus } from '@/utils/status'

type Range = 'daily' | 'weekly' | 'monthly'

export function StatisticsPage() {
  const [range, setRange] = useState<Range>('daily')
  const state = useAsync(async () => {
    const [patients, appointments] = await Promise.all([listPatients(), listAllAppointments({ limit: 500 })])
    return { patients, appointments }
  }, [])

  const appointments = state.data?.appointments ?? []
  const patients = state.data?.patients ?? []
  const completed = appointments.filter((item) => getDisplayStatus(item) === 'completed' || getDisplayStatus(item) === 'attended').length
  const absent = appointments.filter((item) => getDisplayStatus(item) === 'absent').length
  const cancelled = appointments.filter((item) => getDisplayStatus(item) === 'cancelled').length

  const chart = useMemo(() => {
    const today = todayKey()
    if (range === 'daily') {
      return Array.from({ length: 7 }, (_, index) => {
        const key = addDays(today, index - 6)
        return {
          label: formatDateAr(key),
          مواعيد: appointments.filter((item) => toDateKey(item.date) === key).length,
        }
      })
    }
    if (range === 'weekly') {
      return Array.from({ length: 6 }, (_, index) => {
        const weekStart = addDays(startOfWeek(today), (index - 5) * 7)
        const weekEnd = addDays(weekStart, 6)
        return {
          label: formatDateAr(weekStart),
          مواعيد: appointments.filter((item) => {
            const key = toDateKey(item.date)
            return key >= weekStart && key <= weekEnd
          }).length,
        }
      })
    }
    return Array.from({ length: 6 }, (_, index) => {
      const monthStart = startOfMonth(today)
      const date = new Date(`${monthStart}T12:00:00`)
      date.setMonth(date.getMonth() - (5 - index))
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      return {
        label: key,
        مواعيد: appointments.filter((item) => toDateKey(item.date).startsWith(key)).length,
      }
    })
  }, [appointments, range])

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-slate-900">الإحصائيات</h1>
        <p className="mt-1 text-sm text-slate-500">ملخص بسيط لنشاط العيادة دون تعقيد.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-5">
        <StatCard label="إجمالي المرضى" value={patients.length} icon={<Users className="h-5 w-5" />} />
        <StatCard
          label="إجمالي المواعيد"
          value={appointments.length}
          icon={<CalendarDays className="h-5 w-5" />}
          tone="slate"
        />
        <StatCard label="مكتملة" value={completed} icon={<CheckCircle2 className="h-5 w-5" />} tone="green" />
        <StatCard label="غياب" value={absent} icon={<UserMinus className="h-5 w-5" />} tone="red" />
        <StatCard label="ملغاة" value={cancelled} icon={<XCircle className="h-5 w-5" />} tone="slate" />
      </div>

      <Card>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-base font-bold text-slate-900">النشاط</h2>
          <div className="flex gap-2">
            {(
              [
                ['daily', 'يومي'],
                ['weekly', 'أسبوعي'],
                ['monthly', 'شهري'],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setRange(id)}
                className={
                  range === id
                    ? 'rounded-full bg-brand-600 px-3 py-1.5 text-xs font-medium text-white'
                    : 'rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600'
                }
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chart}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5eaf1" />
              <XAxis dataKey="label" tick={{ fontSize: 12 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="مواعيد" fill="#2563eb" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  )
}

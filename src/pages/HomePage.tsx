import { useState } from 'react'
import { CalendarDays, Check, ChevronLeft, UserMinus, Users } from 'lucide-react'
import { Logo } from '@/components/Logo'
import { Button } from '@/components/ui/Button'
import { Card, CardTitle } from '@/components/ui/Card'
import { StatCard } from '@/components/ui/StatCard'
import { StatusBadge } from '@/components/StatusBadge'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/contexts/ToastContext'
import { useAsync } from '@/hooks/useAsync'
import {
  advanceQueue,
  errorMessage,
  getTodayQueue,
  listAppointments,
  markAttendance,
  setOnlineStatus,
  startReception,
} from '@/services/api'
import type { Appointment, TodayQueue } from '@/types'
import { todayKey, toDateKey } from '@/utils/dates'
import { isActiveAppointment, patientName, patientPhone } from '@/utils/status'

function currentPatient(queue: TodayQueue | null): Appointment | null {
  if (!queue?.session.isActive || queue.session.isCompleted) return null
  return (
    queue.appointments.find(
      (item) => isActiveAppointment(item) && item.queueNumber === queue.session.currentNumber,
    ) ?? null
  )
}

function upcomingPatients(queue: TodayQueue | null): Appointment[] {
  if (!queue) return []
  const current = queue.session.currentNumber
  return queue.appointments
    .filter((item) => isActiveAppointment(item) && (item.queueNumber ?? 0) > current)
    .sort((a, b) => (a.queueNumber ?? 0) - (b.queueNumber ?? 0))
}

export function HomePage() {
  const { push } = useToast()
  const { doctor, refresh } = useAuth()
  const [onlineBusy, setOnlineBusy] = useState(false)
  const today = todayKey()

  const queueState = useAsync((signal) => getTodayQueue(signal), [])
  const appointmentsState = useAsync(
    (signal) => listAppointments({ from: today, to: today, limit: 200, sort: 'asc' }, signal),
    [today],
  )

  const todayAppointments = (appointmentsState.data ?? []).filter(
    (item) => toDateKey(item.date) === today && isActiveAppointment(item),
  )
  const attended = todayAppointments.filter((item) => item.attendanceStatus === 'ATTENDED').length
  const absent = todayAppointments.filter(
    (item) => item.attendanceStatus === 'ABSENT' || item.status === 'NO_SHOW',
  ).length
  const upcoming = upcomingPatients(queueState.data)
  const current = currentPatient(queueState.data)
  const session = queueState.data?.session

  async function handleOnline() {
    if (!doctor) return
    setOnlineBusy(true)
    try {
      const next = !doctor.isOnline
      await setOnlineStatus(next)
      await refresh()
      push(next ? 'أصبحت متاحاً الآن' : 'تم إيقاف التوفر', 'success')
    } catch (error) {
      push(errorMessage(error), 'error')
    } finally {
      setOnlineBusy(false)
    }
  }

  async function handleStart() {
    try {
      const next = await startReception()
      queueState.setData(next)
      push('تم بدء الاستقبال', 'success')
    } catch (error) {
      push(errorMessage(error), 'error')
    }
  }

  async function handleNext() {
    try {
      const next = await advanceQueue()
      queueState.setData(next)
      await appointmentsState.reload()
      push(next.session.isCompleted ? 'انتهى طابور اليوم' : 'تم الانتقال للمريض التالي', 'success')
    } catch (error) {
      push(errorMessage(error), 'error')
    }
  }

  async function handleAttendance(appointmentId: string, status: 'ATTENDED' | 'ABSENT') {
    try {
      await markAttendance(appointmentId, status)
      await Promise.all([queueState.reload(), appointmentsState.reload()])
      push(status === 'ATTENDED' ? 'تم تسجيل الحضور' : 'تم تسجيل الغياب', 'success')
    } catch (error) {
      push(errorMessage(error), 'error')
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Logo size="lg" className="max-w-[320px]" />
          <div>
            <h1 className="text-xl font-bold text-slate-900">الرئيسية</h1>
            <p className="mt-1 text-sm text-slate-500">ملخص يومك الحالي وإدارة الطابور.</p>
          </div>
        </div>
        <Button
          variant={doctor?.isOnline ? 'success' : 'outline'}
          loading={onlineBusy}
          onClick={handleOnline}
        >
          {doctor?.isOnline ? 'متاح' : 'غير متصل'}
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatCard label="مرضى اليوم" value={todayAppointments.length} icon={<Users className="h-5 w-5" />} />
        <StatCard label="الحاضرون" value={attended} icon={<Check className="h-5 w-5" />} tone="green" />
        <StatCard label="الغائبون" value={absent} icon={<UserMinus className="h-5 w-5" />} tone="red" />
        <StatCard
          label="المواعيد القادمة"
          value={upcoming.length}
          icon={<CalendarDays className="h-5 w-5" />}
          tone="slate"
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <CardTitle>المريض الحالي</CardTitle>
          {queueState.loading ? (
            <p className="text-sm text-slate-500">جاري التحميل...</p>
          ) : queueState.error ? (
            <p className="text-sm text-rose-600">{queueState.error}</p>
          ) : !session?.isActive ? (
            <div className="space-y-4">
              <p className="text-sm text-slate-500">
                {session?.isCompleted
                  ? 'تم إنهاء طابور اليوم.'
                  : 'لم يبدأ الاستقبال بعد. ابدأ لاستدعاء أول مريض.'}
              </p>
              {!session?.isCompleted && (
                <Button onClick={handleStart} disabled={!queueState.data?.totalActive}>
                  بدء الاستقبال
                </Button>
              )}
            </div>
          ) : current ? (
            <div className="space-y-4">
              <div className="rounded-lg bg-brand-50 p-4">
                <p className="text-xs font-medium text-brand-700">رقم {current.queueNumber ?? '—'}</p>
                <p className="mt-1 text-lg font-bold text-slate-900">{patientName(current)}</p>
                <p className="mt-1 text-sm text-slate-500">
                  {current.time} · {patientPhone(current)}
                </p>
                <div className="mt-3">
                  <StatusBadge appointment={current} />
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="success"
                  onClick={() => handleAttendance(current.id, 'ATTENDED')}
                >
                  حضر
                </Button>
                <Button variant="danger" onClick={() => handleAttendance(current.id, 'ABSENT')}>
                  غائب
                </Button>
                <Button variant="outline" onClick={handleNext} leftIcon={<ChevronLeft className="h-4 w-4" />}>
                  التالي
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-slate-500">لا يوجد مريض في الدور الحالي.</p>
              <Button variant="outline" onClick={handleNext}>
                التالي
              </Button>
            </div>
          )}
        </Card>

        <Card>
          <CardTitle>المرضى التاليون</CardTitle>
          {upcoming.length === 0 ? (
            <p className="text-sm text-slate-500">لا يوجد مرضى قادمون في الطابور.</p>
          ) : (
            <ul className="divide-y divide-surface-border">
              {upcoming.slice(0, 8).map((item) => (
                <li key={item.id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{patientName(item)}</p>
                    <p className="text-xs text-slate-500">
                      {item.time} · رقم {item.queueNumber ?? '—'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge appointment={item} />
                    <Button size="sm" variant="ghost" onClick={() => handleAttendance(item.id, 'ATTENDED')}>
                      حضر
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => handleAttendance(item.id, 'ABSENT')}>
                      غائب
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  )
}

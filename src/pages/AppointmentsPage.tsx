import { useMemo, useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/Button'
import { Card, CardTitle } from '@/components/ui/Card'
import { Field, Input, Textarea } from '@/components/ui/Field'
import { Modal } from '@/components/ui/Modal'
import { StatusBadge } from '@/components/StatusBadge'
import { useToast } from '@/contexts/ToastContext'
import { useAsync } from '@/hooks/useAsync'
import {
  acceptAppointment,
  cancelAppointment,
  errorMessage,
  generateAvailability,
  listAllAppointments,
  listAvailability,
  manualBook,
} from '@/services/api'
import type { Appointment, AvailabilitySlot, DisplayStatus } from '@/types'
import { addDays, formatDateAr, formatWeekdayAr, nextDays, todayKey, toDateKey } from '@/utils/dates'
import { getDisplayStatus, patientName, patientPhone } from '@/utils/status'

const FILTERS: Array<{ id: 'all' | DisplayStatus; label: string }> = [
  { id: 'all', label: 'الكل' },
  { id: 'upcoming', label: 'قادم' },
  { id: 'attended', label: 'حضر' },
  { id: 'absent', label: 'غائب' },
  { id: 'completed', label: 'مكتمل' },
  { id: 'cancelled', label: 'ملغى' },
]

export function AppointmentsPage() {
  const { push } = useToast()
  const from = todayKey()
  const to = addDays(from, 30)

  const appointmentsState = useAsync(
    (signal) => listAllAppointments({ from, to, sort: 'asc', limit: 500 }, signal),
    [from, to],
  )
  const slotsState = useAsync(() => listAvailability({ from, to }), [from, to])

  const [filter, setFilter] = useState<(typeof FILTERS)[number]['id']>('all')
  const [manualOpen, setManualOpen] = useState(false)
  const [slotsOpen, setSlotsOpen] = useState(false)

  const appointments = appointmentsState.data ?? []
  const todayItems = appointments.filter((item) => toDateKey(item.date) === from)
  const upcomingItems = appointments.filter((item) => toDateKey(item.date) > from)

  const visible = useMemo(() => {
    const source = [...todayItems, ...upcomingItems]
    if (filter === 'all') return source
    return source.filter((item) => getDisplayStatus(item) === filter)
  }, [todayItems, upcomingItems, filter])

  async function handleCancel(id: string) {
    try {
      await cancelAppointment(id)
      await appointmentsState.reload()
      push('تم إلغاء الموعد', 'success')
    } catch (error) {
      push(errorMessage(error), 'error')
    }
  }

  async function handleAccept(id: string) {
    try {
      await acceptAppointment(id)
      await appointmentsState.reload()
      push('تم تأكيد الموعد', 'success')
    } catch (error) {
      push(errorMessage(error), 'error')
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">المواعيد</h1>
          <p className="mt-1 text-sm text-slate-500">مواعيد اليوم والقادمة، مع إمكانية الإضافة اليدوية أو الإلكترونية.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => setSlotsOpen(true)}>
            إنشاء مواعيد إلكترونية
          </Button>
          <Button onClick={() => setManualOpen(true)}>إضافة موعد يدوي</Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setFilter(item.id)}
            className={
              filter === item.id
                ? 'rounded-full bg-brand-600 px-3 py-1.5 text-xs font-medium text-white'
                : 'rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-600 ring-1 ring-surface-border'
            }
          >
            {item.label}
          </button>
        ))}
      </div>

      <AppointmentTable
        title="مواعيد اليوم"
        items={visible.filter((item) => toDateKey(item.date) === from)}
        loading={appointmentsState.loading}
        error={appointmentsState.error}
        onAccept={handleAccept}
        onCancel={handleCancel}
      />

      <AppointmentTable
        title="المواعيد القادمة"
        items={visible.filter((item) => toDateKey(item.date) > from)}
        loading={appointmentsState.loading}
        onAccept={handleAccept}
        onCancel={handleCancel}
      />

      <Card>
        <CardTitle>الفترات الإلكترونية المتاحة للحجز</CardTitle>
        <p className="mb-3 text-sm text-slate-500">
          هذه الفترات تظهر للمرضى في تطبيق MyDoc ويمكنهم حجزها بنفس الحساب.
        </p>
        <SlotsList slots={slotsState.data ?? []} />
      </Card>

      {manualOpen && (
        <ManualAppointmentModal
          onClose={() => setManualOpen(false)}
          onCreated={async () => {
            setManualOpen(false)
            await Promise.all([appointmentsState.reload(), slotsState.reload()])
          }}
        />
      )}

      {slotsOpen && (
        <ElectronicSlotsModal
          onClose={() => setSlotsOpen(false)}
          onCreated={async () => {
            setSlotsOpen(false)
            await slotsState.reload()
          }}
        />
      )}
    </div>
  )
}

function AppointmentTable({
  title,
  items,
  loading,
  error,
  onAccept,
  onCancel,
}: {
  title: string
  items: Appointment[]
  loading?: boolean
  error?: string | null
  onAccept: (id: string) => void
  onCancel: (id: string) => void
}) {
  return (
    <Card className="overflow-hidden p-0">
      <div className="border-b border-surface-border px-5 py-4">
        <h2 className="text-base font-bold text-slate-900">{title}</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className="px-5 py-3 text-start font-medium">المريض</th>
              <th className="px-5 py-3 text-start font-medium">التاريخ</th>
              <th className="px-5 py-3 text-start font-medium">الوقت</th>
              <th className="px-5 py-3 text-start font-medium">الحالة</th>
              <th className="px-5 py-3 text-start font-medium">إجراء</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="px-5 py-8 text-center text-slate-500">
                  جاري التحميل...
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan={5} className="px-5 py-8 text-center text-rose-600">
                  {error}
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-5 py-8 text-center text-slate-500">
                  لا توجد مواعيد.
                </td>
              </tr>
            ) : (
              items.map((item) => (
                <tr key={item.id} className="border-t border-surface-border">
                  <td className="px-5 py-3">
                    <p className="font-medium text-slate-900">{patientName(item)}</p>
                    <p className="text-xs text-slate-500">{patientPhone(item)}</p>
                  </td>
                  <td className="px-5 py-3 text-slate-600">{formatDateAr(item.date)}</td>
                  <td className="px-5 py-3 text-slate-600">{item.time}</td>
                  <td className="px-5 py-3">
                    <StatusBadge appointment={item} />
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex flex-wrap gap-2">
                      {item.status === 'PENDING' && (
                        <Button size="sm" variant="secondary" onClick={() => onAccept(item.id)}>
                          تأكيد
                        </Button>
                      )}
                      {item.status !== 'CANCELLED' && item.status !== 'COMPLETED' && (
                        <Button size="sm" variant="ghost" onClick={() => onCancel(item.id)}>
                          إلغاء
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </Card>
  )
}

function SlotsList({ slots }: { slots: AvailabilitySlot[] }) {
  const openSlots = slots.filter((slot) => !slot.isBooked).slice(0, 24)
  if (openSlots.length === 0) {
    return <p className="text-sm text-slate-500">لا توجد فترات متاحة حالياً. أنشئ مواعيد إلكترونية ليتمكن المرضى من الحجز.</p>
  }

  return (
    <div className="flex flex-wrap gap-2">
      {openSlots.map((slot) => (
        <span key={slot.id} className="rounded-lg bg-slate-50 px-2.5 py-1 text-xs text-slate-700">
          {formatDateAr(slot.date)} · {slot.time}
        </span>
      ))}
    </div>
  )
}

function ManualAppointmentModal({
  onClose,
  onCreated,
}: {
  onClose: () => void
  onCreated: () => Promise<void>
}) {
  const { push } = useToast()
  const [patientNameValue, setPatientNameValue] = useState('')
  const [phone, setPhone] = useState('')
  const [date, setDate] = useState(todayKey())
  const [time, setTime] = useState('09:00')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setSubmitting(true)
    try {
      await manualBook({
        patientName: patientNameValue,
        patientPhone: phone || undefined,
        date,
        time,
        notes: notes || undefined,
      })
      push('تم إضافة الموعد اليدوي', 'success')
      await onCreated()
    } catch (error) {
      push(errorMessage(error), 'error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal title="إضافة موعد يدوي" onClose={onClose}>
      <form className="space-y-3" onSubmit={handleSubmit}>
        <Field label="اسم المريض">
          <Input value={patientNameValue} onChange={(event) => setPatientNameValue(event.target.value)} required />
        </Field>
        <Field label="الهاتف">
          <Input value={phone} onChange={(event) => setPhone(event.target.value)} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="التاريخ">
            <Input type="date" value={date} onChange={(event) => setDate(event.target.value)} required />
          </Field>
          <Field label="الوقت">
            <Input type="time" value={time} onChange={(event) => setTime(event.target.value)} required />
          </Field>
        </div>
        <Field label="ملاحظات">
          <Textarea value={notes} onChange={(event) => setNotes(event.target.value)} />
        </Field>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose}>
            إلغاء
          </Button>
          <Button type="submit" loading={submitting}>
            حفظ
          </Button>
        </div>
      </form>
    </Modal>
  )
}

function ElectronicSlotsModal({
  onClose,
  onCreated,
}: {
  onClose: () => void
  onCreated: () => Promise<void>
}) {
  const { push } = useToast()
  const upcomingDays = useMemo(() => nextDays(7), [])
  const [selectedDays, setSelectedDays] = useState<string[]>(() => nextDays(7))
  const [startTime, setStartTime] = useState('09:00')
  const [endTime, setEndTime] = useState('12:00')
  const [duration, setDuration] = useState('30')
  const [gapMinutes, setGapMinutes] = useState('0')
  const [hasBreak, setHasBreak] = useState(false)
  const [breakStart, setBreakStart] = useState('12:00')
  const [breakEnd, setBreakEnd] = useState('13:00')
  const [submitting, setSubmitting] = useState(false)

  function toggleDay(day: string) {
    setSelectedDays((current) =>
      current.includes(day) ? current.filter((item) => item !== day) : [...current, day],
    )
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (selectedDays.length === 0) {
      push('اختر يوماً واحداً على الأقل من الأيام السبعة القادمة', 'error')
      return
    }
    if (startTime >= endTime) {
      push('وقت النهاية يجب أن يكون بعد وقت البداية', 'error')
      return
    }
    if (hasBreak && (!breakStart || !breakEnd)) {
      push('حدد بداية ونهاية فترة الراحة', 'error')
      return
    }
    if (hasBreak && breakStart >= breakEnd) {
      push('نهاية فترة الراحة يجب أن تكون بعد بدايتها', 'error')
      return
    }

    const extras = {
      slotDurationMinutes: Number(duration),
      gapMinutes: Number(gapMinutes) || 0,
      ...(hasBreak ? { breakStart, breakEnd } : {}),
    }

    setSubmitting(true)
    try {
      let createdCount = 0
      for (const date of selectedDays) {
        const result = await generateAvailability({
          date,
          startTime,
          endTime,
          ...extras,
        })
        createdCount += result.createdCount ?? 0
      }
      push(`تم إنشاء ${createdCount} فترة إلكترونية`, 'success')
      await onCreated()
    } catch (error) {
      push(errorMessage(error), 'error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal title="إنشاء مواعيد إلكترونية" onClose={onClose}>
      <form className="space-y-3" onSubmit={handleSubmit}>
        <div>
          <p className="mb-1.5 text-sm font-medium text-slate-700">الأيام السبعة القادمة</p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {upcomingDays.map((day) => {
              const selected = selectedDays.includes(day)
              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => toggleDay(day)}
                  className={
                    selected
                      ? 'flex items-center justify-between rounded-lg bg-brand-50 px-3 py-2 text-start text-sm text-brand-800 ring-1 ring-brand-200'
                      : 'flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-start text-sm text-slate-600 ring-1 ring-surface-border'
                  }
                >
                  <span>
                    <span className="block font-medium">{formatWeekdayAr(day)}</span>
                    <span className="block text-xs opacity-80">{formatDateAr(day)}</span>
                  </span>
                  <span className={selected ? 'text-xs font-medium text-brand-700' : 'text-xs text-slate-400'}>
                    {selected ? 'محدد' : '—'}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="من">
            <Input type="time" value={startTime} onChange={(event) => setStartTime(event.target.value)} required />
          </Field>
          <Field label="إلى">
            <Input type="time" value={endTime} onChange={(event) => setEndTime(event.target.value)} required />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="مدة الموعد (دقيقة)">
            <Input type="number" min={5} max={240} value={duration} onChange={(event) => setDuration(event.target.value)} />
          </Field>
          <Field label="الفاصل بين المواعيد (دقيقة)">
            <Input type="number" min={0} max={120} value={gapMinutes} onChange={(event) => setGapMinutes(event.target.value)} />
          </Field>
        </div>
        <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
          <input
            type="checkbox"
            checked={hasBreak}
            onChange={(event) => setHasBreak(event.target.checked)}
          />
          إضافة فترة راحة
        </label>
        {hasBreak && (
          <div className="grid grid-cols-2 gap-3">
            <Field label="بداية الراحة">
              <Input type="time" value={breakStart} onChange={(event) => setBreakStart(event.target.value)} required />
            </Field>
            <Field label="نهاية الراحة">
              <Input type="time" value={breakEnd} onChange={(event) => setBreakEnd(event.target.value)} required />
            </Field>
          </div>
        )}
        <p className="text-xs text-slate-500">
          بعد الإنشاء يستطيع المريض حجز الفترة من تطبيق MyDoc بنفس حسابه.
        </p>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose}>
            إلغاء
          </Button>
          <Button type="submit" loading={submitting}>
            إنشاء
          </Button>
        </div>
      </form>
    </Modal>
  )
}

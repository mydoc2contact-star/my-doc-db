import { useEffect, useMemo, useState, type FormEvent } from 'react'
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
  createPrivateAppointment,
  deleteAppointment,
  deleteAvailabilitySlot,
  deletePrivateAppointment,
  errorMessage,
  generateAvailability,
  listAllAppointments,
  listAvailability,
  listPatients,
  manualBook,
  markAttendance,
  updatePrivateAppointment,
} from '@/services/api'
import type { Appointment, AvailabilitySlot, DisplayStatus, PatientSummary } from '@/types'
import {
  addDays,
  formatAppointmentTime,
  formatDateAr,
  formatWeekdayAr,
  nextDays,
  normalizeTime,
  todayKey,
  toDateKey,
} from '@/utils/dates'
import {
  canRecordAttendance,
  getDisplayStatus,
  isAttendanceWindowOpen,
  isPrivateAppointment,
  patientName,
  patientPhone,
} from '@/utils/status'

type AppointmentFilter = 'all' | 'private' | DisplayStatus

const FILTERS: Array<{ id: AppointmentFilter; label: string }> = [
  { id: 'all', label: 'الكل' },
  { id: 'upcoming', label: 'قادم' },
  { id: 'attended', label: 'حضر' },
  { id: 'absent', label: 'غائب' },
  { id: 'completed', label: 'مكتمل' },
  { id: 'cancelled', label: 'ملغى' },
  { id: 'private', label: 'خاص' },
]

export function AppointmentsPage() {
  const { push } = useToast()
  const from = todayKey()
  const to = addDays(from, 30)

  const appointmentsState = useAsync(
    (signal) => listAllAppointments({ from, to, sort: 'asc', limit: 500 }, signal),
    [from, to],
  )
  const slotsState = useAsync(() => listAvailability({ from, to, availableOnly: true }), [from, to])

  const [filter, setFilter] = useState<AppointmentFilter>('all')
  const [manualOpen, setManualOpen] = useState(false)
  const [slotsOpen, setSlotsOpen] = useState(false)
  const [privateOpen, setPrivateOpen] = useState(false)
  const [editingPrivate, setEditingPrivate] = useState<Appointment | null>(null)
  const [marking, setMarking] = useState<{ id: string; status: 'ATTENDED' | 'ABSENT' } | null>(null)
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30_000)
    return () => window.clearInterval(timer)
  }, [])

  const appointments = appointmentsState.data ?? []
  const todayItems = appointments.filter((item) => toDateKey(item.date) === from)
  const upcomingItems = appointments.filter((item) => toDateKey(item.date) > from)

  const visible = useMemo(() => {
    const source = [...todayItems, ...upcomingItems]
    if (filter === 'all') return source
    if (filter === 'private') return source.filter((item) => isPrivateAppointment(item))
    return source.filter((item) => !isPrivateAppointment(item) && getDisplayStatus(item) === filter)
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

  async function handleDelete(id: string) {
    if (!window.confirm('هل تريد حذف هذا الموعد نهائياً؟ لن يظهر بعد الحذف.')) return
    try {
      await deleteAppointment(id)
      await Promise.all([appointmentsState.reload(), slotsState.reload()])
      push('تم حذف الموعد', 'success')
    } catch (error) {
      push(errorMessage(error), 'error')
    }
  }

  async function handleDeleteSlot(id: string) {
    if (!window.confirm('حذف هذه الفترة الإلكترونية؟ لن يستطيع المرضى حجزها بعد الآن.')) return
    try {
      await deleteAvailabilitySlot(id)
      await slotsState.reload()
      push('تم حذف الفترة', 'success')
    } catch (error) {
      push(errorMessage(error), 'error')
    }
  }

  async function handleAttendance(id: string, status: 'ATTENDED' | 'ABSENT') {
    if (marking) return
    setMarking({ id, status })
    try {
      await markAttendance(id, status)
      await appointmentsState.reload()
      push(status === 'ATTENDED' ? 'تم تسجيل الحضور ووصوله للإدارة' : 'تم تسجيل الغياب ووصوله للإدارة', 'success')
    } catch (error) {
      push(errorMessage(error), 'error')
    } finally {
      setMarking(null)
    }
  }

  async function handleDeletePrivate(id: string) {
    if (!window.confirm('هل أنت متأكد من حذف هذا الموعد الخاص؟ ستعود الفترات الزمنية إلى قائمة المواعيد المتاحة مباشرة.')) {
      return
    }
    try {
      await deletePrivateAppointment(id)
      await Promise.all([appointmentsState.reload(), slotsState.reload()])
      setPrivateOpen(false)
      setEditingPrivate(null)
      push('تم حذف الموعد الخاص', 'success')
    } catch (error) {
      push(errorMessage(error), 'error')
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">المواعيد</h1>
          <p className="mt-1 text-sm text-slate-500">مواعيد اليوم والقادمة، مع الإضافة اليدوية والإلكترونية والمواعيد الخاصة.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => setSlotsOpen(true)}>
            إنشاء مواعيد إلكترونية
          </Button>
          <Button
            variant="outline"
            className="border-violet-200 bg-violet-50 text-violet-800 hover:bg-violet-100"
            onClick={() => {
              setEditingPrivate(null)
              setPrivateOpen(true)
            }}
          >
            موعد خاص
          </Button>
          <Button
            onClick={async () => {
              await slotsState.reload()
              setManualOpen(true)
            }}
          >
            إضافة موعد يدوي
          </Button>
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
        now={now}
        marking={marking}
        onAccept={handleAccept}
        onCancel={handleCancel}
        onDelete={handleDelete}
        onAttendance={handleAttendance}
        onEditPrivate={(item) => {
          setEditingPrivate(item)
          setPrivateOpen(true)
        }}
        onDeletePrivate={handleDeletePrivate}
      />

      <AppointmentTable
        title="المواعيد القادمة"
        items={visible.filter((item) => toDateKey(item.date) > from)}
        loading={appointmentsState.loading}
        now={now}
        marking={marking}
        onAccept={handleAccept}
        onCancel={handleCancel}
        onDelete={handleDelete}
        onAttendance={handleAttendance}
        onEditPrivate={(item) => {
          setEditingPrivate(item)
          setPrivateOpen(true)
        }}
        onDeletePrivate={handleDeletePrivate}
      />

      <Card>
        <CardTitle>الفترات الإلكترونية المتاحة للحجز</CardTitle>
        <p className="mb-3 text-sm text-slate-500">
          هذه الفترات تظهر للمرضى في تطبيق MyDoc ويمكنهم حجزها بنفس الحساب.
        </p>
        <SlotsList slots={slotsState.data ?? []} onDelete={handleDeleteSlot} />
      </Card>

      {manualOpen && (
        <ManualAppointmentModal
          slots={slotsState.data ?? []}
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

      {privateOpen && (
        <PrivateAppointmentModal
          appointment={editingPrivate}
          onClose={() => {
            setPrivateOpen(false)
            setEditingPrivate(null)
          }}
          onDeleted={handleDeletePrivate}
          onSaved={async () => {
            setPrivateOpen(false)
            setEditingPrivate(null)
            await Promise.all([appointmentsState.reload(), slotsState.reload()])
          }}
        />
      )}
    </div>
  )
}

function isDoctorCreated(item: Appointment) {
  return !item.patientId && !item.isPrivate
}

function AppointmentTable({
  title,
  items,
  loading,
  error,
  now,
  marking,
  onAccept,
  onCancel,
  onDelete,
  onAttendance,
  onEditPrivate,
  onDeletePrivate,
}: {
  title: string
  items: Appointment[]
  loading?: boolean
  error?: string | null
  now: number
  marking: { id: string; status: 'ATTENDED' | 'ABSENT' } | null
  onAccept: (id: string) => void
  onCancel: (id: string) => void
  onDelete: (id: string) => void
  onAttendance: (id: string, status: 'ATTENDED' | 'ABSENT') => void
  onEditPrivate: (item: Appointment) => void
  onDeletePrivate: (id: string) => void
}) {
  const clock = new Date(now)

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
              items.map((item) => {
                const privateItem = isPrivateAppointment(item)
                const canMark = canRecordAttendance(item)
                const windowOpen = isAttendanceWindowOpen(item, clock)
                const busy = marking?.id === item.id

                return (
                  <tr
                    key={item.id}
                    className={
                      privateItem
                        ? 'border-t border-violet-100 bg-violet-50/40'
                        : 'border-t border-surface-border'
                    }
                  >
                    <td className="px-5 py-3">
                      <p className={privateItem ? 'font-medium text-violet-900' : 'font-medium text-slate-900'}>
                        {patientName(item)}
                      </p>
                      <p className="text-xs text-slate-500">{patientPhone(item)}</p>
                    </td>
                    <td className="px-5 py-3 text-slate-600">{formatDateAr(item.date)}</td>
                    <td className="px-5 py-3 text-slate-600">{formatAppointmentTime(item.time, item.endTime)}</td>
                    <td className="px-5 py-3">
                      <StatusBadge appointment={item} />
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex flex-wrap gap-2">
                        {privateItem ? (
                          <>
                            <Button size="sm" variant="secondary" onClick={() => onEditPrivate(item)}>
                              تعديل
                            </Button>
                            <Button size="sm" variant="danger" onClick={() => onDeletePrivate(item.id)}>
                              حذف
                            </Button>
                          </>
                        ) : (
                          <>
                            {item.status === 'PENDING' && (
                              <Button size="sm" variant="secondary" onClick={() => onAccept(item.id)}>
                                تأكيد
                              </Button>
                            )}
                            {canMark && (
                              <>
                                <Button
                                  size="sm"
                                  variant="success"
                                  loading={busy && marking?.status === 'ATTENDED'}
                                  disabled={!windowOpen || Boolean(marking)}
                                  onClick={() => onAttendance(item.id, 'ATTENDED')}
                                >
                                  حضر
                                </Button>
                                <Button
                                  size="sm"
                                  variant="danger"
                                  loading={busy && marking?.status === 'ABSENT'}
                                  disabled={!windowOpen || Boolean(marking)}
                                  onClick={() => onAttendance(item.id, 'ABSENT')}
                                >
                                  غائب
                                </Button>
                              </>
                            )}
                            {item.status !== 'CANCELLED' && item.status !== 'COMPLETED' && item.status !== 'NO_SHOW' && (
                              <Button size="sm" variant="ghost" onClick={() => onCancel(item.id)}>
                                إلغاء
                              </Button>
                            )}
                            {isDoctorCreated(item) && (
                              <Button size="sm" variant="danger" onClick={() => onDelete(item.id)}>
                                حذف
                              </Button>
                            )}
                          </>
                        )}
                      </div>
                      {canMark && !windowOpen && (
                        <p className="mt-1 text-[11px] text-slate-500">
                          يُفعَّل تسجيل الحضور قبل الموعد بـ 10 دقائق.
                        </p>
                      )}
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </Card>
  )
}

function SlotsList({
  slots,
  onDelete,
}: {
  slots: AvailabilitySlot[]
  onDelete: (id: string) => void
}) {
  const openSlots = slots.filter((slot) => !slot.isBooked)
  if (openSlots.length === 0) {
    return <p className="text-sm text-slate-500">لا توجد فترات متاحة حالياً. أنشئ مواعيد إلكترونية ليتمكن المرضى من الحجز.</p>
  }

  return (
    <div className="flex flex-wrap gap-2">
      {openSlots.map((slot) => (
        <span
          key={slot.id}
          className="inline-flex items-center gap-2 rounded-lg bg-slate-50 px-2.5 py-1 text-xs text-slate-700"
        >
          {formatDateAr(slot.date)} · {slot.time}
          <button
            type="button"
            onClick={() => onDelete(slot.id)}
            className="font-medium text-rose-600 hover:text-rose-700"
          >
            حذف
          </button>
        </span>
      ))}
    </div>
  )
}

function ManualAppointmentModal({
  slots,
  onClose,
  onCreated,
}: {
  slots: AvailabilitySlot[]
  onClose: () => void
  onCreated: () => Promise<void>
}) {
  const { push } = useToast()
  const openSlots = useMemo(
    () =>
      slots
        .filter((slot) => !slot.isBooked)
        .slice()
        .sort((a, b) => `${toDateKey(a.date)}${normalizeTime(a.time)}`.localeCompare(`${toDateKey(b.date)}${normalizeTime(b.time)}`)),
    [slots],
  )
  const [selectedSlotId, setSelectedSlotId] = useState(openSlots[0]?.id ?? '')
  const [patientNameValue, setPatientNameValue] = useState('')
  const [phone, setPhone] = useState('')
  const [customDate, setCustomDate] = useState(todayKey())
  const [customTime, setCustomTime] = useState('09:00')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const selectedSlot = openSlots.find((slot) => slot.id === selectedSlotId) ?? null
  const datesWithSlots = useMemo(() => {
    const keys = Array.from(new Set(openSlots.map((slot) => toDateKey(slot.date))))
    return keys.sort()
  }, [openSlots])
  const selectedDate = selectedSlot ? toDateKey(selectedSlot.date) : ''
  const timesForDate = openSlots.filter((slot) => toDateKey(slot.date) === selectedDate)

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (patientNameValue.trim().length < 2) {
      push('أدخل اسم المريض (حرفان على الأقل)', 'error')
      return
    }

    const date = selectedSlot ? toDateKey(selectedSlot.date) : customDate
    const time = selectedSlot ? normalizeTime(selectedSlot.time) : normalizeTime(customTime)
    if (!date || !time) {
      push('اختر تاريخاً ووقتاً للموعد', 'error')
      return
    }

    setSubmitting(true)
    try {
      await manualBook({
        patientName: patientNameValue.trim(),
        patientPhone: phone.trim() || undefined,
        date,
        time,
        notes: notes.trim() || undefined,
      })
      push('تم حجز الموعد اليدوي', 'success')
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

        {openSlots.length > 0 ? (
          <div>
            <p className="mb-2 text-sm font-medium text-slate-700">اختر موعداً إلكترونياً متاحاً</p>
            <div className="mb-2 flex flex-wrap gap-2">
              {datesWithSlots.map((day) => (
                <button
                  key={day}
                  type="button"
                  onClick={() => {
                    const first = openSlots.find((slot) => toDateKey(slot.date) === day)
                    if (first) setSelectedSlotId(first.id)
                  }}
                  className={
                    selectedDate === day
                      ? 'rounded-full bg-brand-600 px-3 py-1 text-xs font-medium text-white'
                      : 'rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600'
                  }
                >
                  {formatDateAr(day)}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              {timesForDate.map((slot) => {
                const selected = selectedSlotId === slot.id
                return (
                  <button
                    key={slot.id}
                    type="button"
                    onClick={() => setSelectedSlotId(slot.id)}
                    className={
                      selected
                        ? 'rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-medium text-white'
                        : 'rounded-lg bg-slate-50 px-3 py-1.5 text-sm text-slate-700 ring-1 ring-surface-border hover:bg-brand-50'
                    }
                  >
                    {normalizeTime(slot.time)}
                  </button>
                )
              })}
            </div>
            {selectedSlot && (
              <p className="mt-2 text-xs text-slate-500">
                الموعد المحدد: {formatDateAr(selectedSlot.date)} · {normalizeTime(selectedSlot.time)}
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
              لا توجد فترات إلكترونية متاحة. يمكنك إدخال التاريخ والوقت يدوياً، أو أنشئ مواعيد إلكترونية أولاً.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <Field label="التاريخ">
                <Input type="date" value={customDate} onChange={(event) => setCustomDate(event.target.value)} required />
              </Field>
              <Field label="الوقت">
                <Input type="time" value={customTime} onChange={(event) => setCustomTime(event.target.value)} required />
              </Field>
            </div>
          </div>
        )}

        <Field label="ملاحظات">
          <Textarea value={notes} onChange={(event) => setNotes(event.target.value)} />
        </Field>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose}>
            إلغاء
          </Button>
          <Button type="submit" loading={submitting} disabled={openSlots.length > 0 && !selectedSlot}>
            حجز الموعد
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

function PrivateAppointmentModal({
  appointment,
  onClose,
  onSaved,
  onDeleted,
}: {
  appointment: Appointment | null
  onClose: () => void
  onSaved: () => Promise<void>
  onDeleted: (id: string) => Promise<void>
}) {
  const { push } = useToast()
  const isEditing = Boolean(appointment)
  const patientsState = useAsync(() => listPatients(), [])
  const patients = patientsState.data ?? []

  const [date, setDate] = useState(appointment ? toDateKey(appointment.date) : todayKey())
  const [startTime, setStartTime] = useState(appointment ? normalizeTime(appointment.time) : '09:00')
  const [endTime, setEndTime] = useState(
    appointment?.endTime ? normalizeTime(appointment.endTime) : '10:00',
  )
  const [patientNameValue, setPatientNameValue] = useState(
    appointment?.patientName || appointment?.patient?.name || '',
  )
  const [phone, setPhone] = useState(appointment?.patientPhone || appointment?.patient?.phone || '')
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(appointment?.patientId ?? null)
  const [notes, setNotes] = useState(appointment?.notes ?? '')
  const [submitting, setSubmitting] = useState(false)
  const [deleting, setDeleting] = useState(false)

  function selectPatient(patient: PatientSummary) {
    if (selectedPatientId === patient.id) {
      setSelectedPatientId(null)
      setPatientNameValue('')
      setPhone('')
      return
    }
    setSelectedPatientId(patient.id)
    setPatientNameValue(patient.name)
    setPhone(patient.phone)
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!date) {
      push('اختر تاريخ الموعد', 'error')
      return
    }
    const start = normalizeTime(startTime)
    const end = normalizeTime(endTime)
    if (!start || !end) {
      push('حدد وقت البداية والنهاية', 'error')
      return
    }
    if (start >= end) {
      push('وقت النهاية يجب أن يكون بعد وقت البداية', 'error')
      return
    }
    if (!selectedPatientId && patientNameValue.trim().length < 2) {
      push('أدخل اسم المريض (حرفان على الأقل) أو اختره من القائمة', 'error')
      return
    }

    setSubmitting(true)
    try {
      const payload = {
        date,
        startTime: start,
        endTime: end,
        patientId: selectedPatientId ?? undefined,
        patientName: patientNameValue.trim() || undefined,
        patientPhone: phone.trim() || undefined,
        notes: notes.trim() || undefined,
      }
      if (appointment) {
        await updatePrivateAppointment(appointment.id, payload)
        push('تم تحديث الموعد الخاص', 'success')
      } else {
        await createPrivateAppointment(payload)
        push('تم إنشاء الموعد الخاص', 'success')
      }
      await onSaved()
    } catch (error) {
      push(errorMessage(error), 'error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal title={isEditing ? 'تعديل الموعد الخاص' : 'إنشاء موعد خاص'} onClose={onClose}>
      <form className="space-y-3" onSubmit={handleSubmit}>
        <div className="rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 text-sm text-violet-800">
          هذا الموعد خاص ولن يظهر للمريض إطلاقاً. سيتم حجز هذه الفترة بالكامل وتعطيل جميع الأوقات الواقعة خلالها.
        </div>
        <Field label="التاريخ">
          <Input type="date" value={date} onChange={(event) => setDate(event.target.value)} required />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="وقت البداية">
            <Input type="time" value={startTime} onChange={(event) => setStartTime(event.target.value)} required />
          </Field>
          <Field label="وقت النهاية">
            <Input type="time" value={endTime} onChange={(event) => setEndTime(event.target.value)} required />
          </Field>
        </div>

        <div>
          <p className="mb-2 text-sm font-medium text-slate-700">اختر من قائمة المرضى (اختياري)</p>
          {patientsState.loading ? (
            <p className="text-xs text-slate-500">جاري تحميل المرضى...</p>
          ) : patients.length === 0 ? (
            <p className="text-xs text-slate-500">لا يوجد مرضى سابقون — يمكنك إدخال الاسم يدوياً.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {patients.map((patient) => {
                const selected = selectedPatientId === patient.id
                return (
                  <button
                    key={patient.id}
                    type="button"
                    onClick={() => selectPatient(patient)}
                    className={
                      selected
                        ? 'rounded-lg border border-violet-400 bg-violet-100 px-3 py-2 text-start'
                        : 'rounded-lg border border-surface-border bg-white px-3 py-2 text-start hover:bg-slate-50'
                    }
                  >
                    <span className={`block text-sm font-medium ${selected ? 'text-violet-900' : 'text-slate-800'}`}>
                      {patient.name}
                    </span>
                    {patient.phone ? (
                      <span className={`block text-xs ${selected ? 'text-violet-700' : 'text-slate-500'}`}>
                        {patient.phone}
                      </span>
                    ) : null}
                  </button>
                )
              })}
            </div>
          )}
        </div>

        <div className="rounded-lg border border-surface-border bg-slate-50 p-3">
          <p className="mb-3 text-sm font-semibold text-slate-800">معلومات المريض</p>
          <div className="space-y-3">
            <Field label="اسم المريض">
              <Input
                value={patientNameValue}
                onChange={(event) => {
                  setPatientNameValue(event.target.value)
                  if (selectedPatientId) setSelectedPatientId(null)
                }}
                placeholder="اسم المريض"
                required={!selectedPatientId}
              />
            </Field>
            <Field label="الهاتف">
              <Input
                value={phone}
                onChange={(event) => {
                  setPhone(event.target.value)
                  if (selectedPatientId) setSelectedPatientId(null)
                }}
                placeholder="05xxxxxxxx"
              />
            </Field>
          </div>
        </div>

        <Field label="ملاحظات">
          <Textarea value={notes} onChange={(event) => setNotes(event.target.value)} />
        </Field>

        <div className="flex flex-wrap justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose}>
            إلغاء
          </Button>
          {isEditing && appointment && (
            <Button
              variant="danger"
              loading={deleting}
              onClick={async () => {
                setDeleting(true)
                try {
                  await onDeleted(appointment.id)
                } finally {
                  setDeleting(false)
                }
              }}
            >
              حذف
            </Button>
          )}
          <Button type="submit" loading={submitting}>
            حفظ الموعد الخاص
          </Button>
        </div>
      </form>
    </Modal>
  )
}

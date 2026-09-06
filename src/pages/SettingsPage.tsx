import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardTitle } from '@/components/ui/Card'
import { Field, Input, Select, Textarea } from '@/components/ui/Field'
import { DOCTOR_SPECIALTIES, matchSpecialty } from '@/constants/specialties'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/contexts/ToastContext'
import { useAsync } from '@/hooks/useAsync'
import {
  errorMessage,
  listSchedules,
  setOnlineStatus,
  syncWeeklySchedules,
  updateMe,
} from '@/services/api'
import type { DayOfWeek, DoctorSchedule } from '@/types'
import { mediaUrl } from '@/utils/media'

const MAX_CLINIC_PHOTOS = 6

type ClinicPhoto =
  | { kind: 'remote'; url: string }
  | { kind: 'local'; file: File; preview: string }

const DAYS: Array<{ id: DayOfWeek; label: string }> = [
  { id: 'SATURDAY', label: 'السبت' },
  { id: 'SUNDAY', label: 'الأحد' },
  { id: 'MONDAY', label: 'الإثنين' },
  { id: 'TUESDAY', label: 'الثلاثاء' },
  { id: 'WEDNESDAY', label: 'الأربعاء' },
  { id: 'THURSDAY', label: 'الخميس' },
  { id: 'FRIDAY', label: 'الجمعة' },
]

export function SettingsPage() {
  const { doctor, refresh, logout } = useAuth()
  const { push } = useToast()
  const navigate = useNavigate()
  const schedulesState = useAsync(() => listSchedules(), [])

  const [name, setName] = useState(doctor?.name ?? '')
  const [phone, setPhone] = useState(doctor?.phone ?? '')
  const [specialization, setSpecialization] = useState(matchSpecialty(doctor?.specialization ?? ''))
  const [city, setCity] = useState(doctor?.city ?? '')
  const [location, setLocation] = useState(doctor?.location ?? '')
  const [clinicInfo, setClinicInfo] = useState(doctor?.clinicInfo ?? '')
  const [description, setDescription] = useState(doctor?.description ?? '')
  const [photos, setPhotos] = useState<ClinicPhoto[]>([])
  const [photosTouched, setPhotosTouched] = useState(false)
  const [saving, setSaving] = useState(false)
  const [onlineBusy, setOnlineBusy] = useState(false)
  const [days, setDays] = useState<Record<DayOfWeek, { enabled: boolean; startTime: string; endTime: string }>>(
    emptyDays(),
  )

  useEffect(() => {
    if (!doctor) return
    setName(doctor.name)
    setPhone(doctor.phone)
    setSpecialization(matchSpecialty(doctor.specialization ?? ''))
    setCity(doctor.city)
    setLocation(doctor.location ?? '')
    setClinicInfo(doctor.clinicInfo ?? '')
    setDescription(doctor.description ?? '')
    if (!photosTouched) {
      setPhotos((doctor.clinicPhotos ?? []).map((url) => ({ kind: 'remote', url })))
    }
  }, [doctor, photosTouched])

  useEffect(() => {
    if (!schedulesState.data) return
    setDays(fromSchedules(schedulesState.data))
  }, [schedulesState.data])

  async function handleProfile(event: FormEvent) {
    event.preventDefault()
    if (!name.trim() || phone.trim().length < 8 || !specialization.trim() || !city.trim() || !location.trim()) {
      push('أكمل الاسم والهاتف والتخصص والمدينة والموقع مثل التطبيق', 'error')
      return
    }
    setSaving(true)
    try {
      await updateMe({
        name: name.trim(),
        phone: phone.trim(),
        specialization: specialization.trim(),
        city: city.trim(),
        location: location.trim(),
        clinicInfo: clinicInfo.trim() || undefined,
        description: description.trim() || undefined,
        existingClinicPhotos: photosTouched
          ? photos.filter((item) => item.kind === 'remote').map((item) => item.url)
          : undefined,
        clinicPhotoFiles: photosTouched
          ? photos.filter((item): item is Extract<ClinicPhoto, { kind: 'local' }> => item.kind === 'local').map((item) => item.file)
          : undefined,
      })
      setPhotosTouched(false)
      await refresh()
      push('تم حفظ الحساب. سيظهر نفس التعديل في تطبيق MyDoc.', 'success')
    } catch (error) {
      push(errorMessage(error), 'error')
    } finally {
      setSaving(false)
    }
  }

  function addPhotos(files: FileList | null) {
    if (!files?.length) return
    const remaining = MAX_CLINIC_PHOTOS - photos.length
    const next = Array.from(files)
      .filter((file) => file.type.startsWith('image/'))
      .slice(0, remaining)
      .map((file) => ({ kind: 'local' as const, file, preview: URL.createObjectURL(file) }))
    if (next.length === 0) return
    setPhotos((current) => [...current, ...next].slice(0, MAX_CLINIC_PHOTOS))
    setPhotosTouched(true)
  }

  function removePhoto(index: number) {
    setPhotos((current) => {
      const item = current[index]
      if (item?.kind === 'local') URL.revokeObjectURL(item.preview)
      return current.filter((_, itemIndex) => itemIndex !== index)
    })
    setPhotosTouched(true)
  }

  async function handleOnline() {
    if (!doctor) return
    setOnlineBusy(true)
    try {
      await setOnlineStatus(!doctor.isOnline)
      await refresh()
    } catch (error) {
      push(errorMessage(error), 'error')
    } finally {
      setOnlineBusy(false)
    }
  }

  async function handleSchedules(event: FormEvent) {
    event.preventDefault()
    const selected = DAYS.filter((day) => days[day.id].enabled).map((day) => ({
      dayOfWeek: day.id,
      startTime: days[day.id].startTime,
      endTime: days[day.id].endTime,
    }))
    if (selected.length === 0) {
      push('اختر يوماً واحداً على الأقل', 'error')
      return
    }
    setSaving(true)
    try {
      await syncWeeklySchedules(selected)
      await schedulesState.reload()
      push('تم حفظ الجدول الأسبوعي', 'success')
    } catch (error) {
      push(errorMessage(error), 'error')
    } finally {
      setSaving(false)
    }
  }

  async function handleLogout() {
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-slate-900">الإعدادات</h1>
        <p className="mt-1 text-sm text-slate-500">نفس حساب الطبيب المستخدم في تطبيق MyDoc.</p>
      </div>

      <Card>
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-slate-900">الحالة</h2>
            <p className="mt-1 text-sm text-slate-500">{doctor?.email}</p>
          </div>
          <Button variant={doctor?.isOnline ? 'success' : 'outline'} loading={onlineBusy} onClick={handleOnline}>
            {doctor?.isOnline ? 'متاح الآن' : 'غير متصل'}
          </Button>
        </div>
      </Card>

      <Card>
        <CardTitle>تعديل الحساب</CardTitle>
        <p className="mb-4 text-sm text-slate-500">
          حدّث معلومات حسابك كما في التطبيق. البريد الإلكتروني لا يمكن تغييره من هنا، وأي تعديل يظهر في الموقع والتطبيق معاً.
        </p>
        <form className="grid gap-3 sm:grid-cols-2" onSubmit={handleProfile}>
          <Field label="الاسم">
            <Input value={name} onChange={(event) => setName(event.target.value)} required />
          </Field>
          <Field label="البريد الإلكتروني">
            <Input value={doctor?.email ?? ''} disabled className="bg-slate-50 text-slate-500" />
          </Field>
          <Field label="الهاتف">
            <Input
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              placeholder="رقم الهاتف"
              required
            />
          </Field>
          <Field label="التخصص">
            <Select value={specialization} onChange={(event) => setSpecialization(event.target.value)} required>
              <option value="">اختر التخصص</option>
              {specialization && !DOCTOR_SPECIALTIES.includes(specialization as (typeof DOCTOR_SPECIALTIES)[number]) && (
                <option value={specialization}>{specialization}</option>
              )}
              {DOCTOR_SPECIALTIES.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="المدينة">
            <Input value={city} onChange={(event) => setCity(event.target.value)} required />
          </Field>
          <Field label="الموقع">
            <Input value={location} onChange={(event) => setLocation(event.target.value)} required />
          </Field>
          <Field label="معلومات العيادة" className="sm:col-span-2">
            <Textarea value={clinicInfo} onChange={(event) => setClinicInfo(event.target.value)} />
          </Field>
          <Field label="نبذة عن الطبيب" className="sm:col-span-2">
            <Textarea value={description} onChange={(event) => setDescription(event.target.value)} />
          </Field>
          <div className="sm:col-span-2">
            <p className="mb-1.5 text-sm font-medium text-slate-700">صور العيادة</p>
            <div className="flex flex-wrap gap-3">
              {photos.map((photo, index) => (
                <div key={`${photo.kind}-${index}`} className="relative h-20 w-20 overflow-hidden rounded-lg bg-slate-100">
                  <img
                    src={photo.kind === 'remote' ? mediaUrl(photo.url) : photo.preview}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => removePhoto(index)}
                    className="absolute end-1 top-1 rounded-full bg-white p-0.5 text-slate-600"
                    aria-label="حذف الصورة"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
              {photos.length < MAX_CLINIC_PHOTOS && (
                <label className="flex h-20 w-20 cursor-pointer items-center justify-center rounded-lg border border-dashed border-surface-border text-xs text-slate-500">
                  إضافة
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={(event) => {
                      addPhotos(event.target.files)
                      event.target.value = ''
                    }}
                  />
                </label>
              )}
            </div>
            <p className="mt-2 text-xs text-slate-500">حتى {MAX_CLINIC_PHOTOS} صور، كما في التطبيق.</p>
          </div>
          <div className="sm:col-span-2">
            <Button type="submit" loading={saving}>
              حفظ الحساب
            </Button>
          </div>
        </form>
      </Card>

      <Card>
        <CardTitle>الجدول الأسبوعي</CardTitle>
        <p className="mb-4 text-sm text-slate-500">
          يُستخدم لإنشاء المواعيد الإلكترونية التي يحجزها المرضى من التطبيق.
        </p>
        <form className="space-y-3" onSubmit={handleSchedules}>
          {DAYS.map((day) => (
            <div key={day.id} className="grid items-center gap-3 rounded-lg bg-slate-50 p-3 sm:grid-cols-[140px_1fr_1fr]">
              <label className="flex items-center gap-2 text-sm font-medium">
                <input
                  type="checkbox"
                  checked={days[day.id].enabled}
                  onChange={(event) =>
                    setDays((current) => ({
                      ...current,
                      [day.id]: { ...current[day.id], enabled: event.target.checked },
                    }))
                  }
                />
                {day.label}
              </label>
              <Input
                type="time"
                value={days[day.id].startTime}
                disabled={!days[day.id].enabled}
                onChange={(event) =>
                  setDays((current) => ({
                    ...current,
                    [day.id]: { ...current[day.id], startTime: event.target.value },
                  }))
                }
              />
              <Input
                type="time"
                value={days[day.id].endTime}
                disabled={!days[day.id].enabled}
                onChange={(event) =>
                  setDays((current) => ({
                    ...current,
                    [day.id]: { ...current[day.id], endTime: event.target.value },
                  }))
                }
              />
            </div>
          ))}
          <Button type="submit" loading={saving}>
            حفظ الجدول
          </Button>
        </form>
      </Card>

      <Card>
        <CardTitle>الحساب</CardTitle>
        <Button variant="outline" onClick={handleLogout}>
          تسجيل الخروج
        </Button>
      </Card>
    </div>
  )
}

function emptyDays(): Record<DayOfWeek, { enabled: boolean; startTime: string; endTime: string }> {
  return {
    SATURDAY: { enabled: false, startTime: '09:00', endTime: '17:00' },
    SUNDAY: { enabled: false, startTime: '09:00', endTime: '17:00' },
    MONDAY: { enabled: false, startTime: '09:00', endTime: '17:00' },
    TUESDAY: { enabled: false, startTime: '09:00', endTime: '17:00' },
    WEDNESDAY: { enabled: false, startTime: '09:00', endTime: '17:00' },
    THURSDAY: { enabled: false, startTime: '09:00', endTime: '17:00' },
    FRIDAY: { enabled: false, startTime: '09:00', endTime: '17:00' },
  }
}

function fromSchedules(schedules: DoctorSchedule[]) {
  const next = emptyDays()
  for (const schedule of schedules) {
    next[schedule.dayOfWeek] = {
      enabled: true,
      startTime: schedule.startTime,
      endTime: schedule.endTime,
    }
  }
  return next
}

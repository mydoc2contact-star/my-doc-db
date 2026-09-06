import type {
  Appointment,
  AttendanceStatus,
  AvailabilitySlot,
  DayOfWeek,
  DoctorSchedule,
  DoctorUser,
  LoginResult,
  Paginated,
  PatientSummary,
  TodayQueue,
} from '@/types'
import { http } from './client'
import { ApiError } from './errors'
import { clearToken, setToken } from './token'

export { http } from './client'
export { setUnauthorizedHandler } from './client'
export { errorMessage, ApiError } from './errors'
export { getToken, setToken, clearToken } from './token'

export async function login(email: string, password: string): Promise<LoginResult> {
  const result = await http.post<LoginResult>(
    '/auth/login',
    { email: email.trim().toLowerCase(), password, userType: 'DOCTOR' },
    { anonymous: true },
  )

  if (result.userType !== 'DOCTOR') {
    throw new ApiError('هذا الحساب ليس حساب طبيب. استخدم حساب الطبيب نفسه المستخدم في تطبيق MyDoc.', 403)
  }

  setToken(result.token)
  return result
}

export async function logout(): Promise<void> {
  await http.post<null>('/auth/logout').catch(() => null)
  clearToken()
}

export async function getMe(): Promise<DoctorUser> {
  return http.get<DoctorUser>('/doctor/me')
}

export interface UpdateDoctorPayload {
  name: string
  phone: string
  specialization: string
  city: string
  location: string
  clinicInfo?: string
  description?: string
  existingClinicPhotos?: string[]
  clinicPhotoFiles?: File[]
}

export async function updateMe(payload: UpdateDoctorPayload): Promise<DoctorUser> {
  const hasPhotoUpdate =
    payload.existingClinicPhotos !== undefined || Boolean(payload.clinicPhotoFiles?.length)

  if (!hasPhotoUpdate) {
    return http.patch<DoctorUser>('/doctor/me', {
      name: payload.name,
      phone: payload.phone,
      specialization: payload.specialization,
      city: payload.city,
      location: payload.location,
      clinicInfo: payload.clinicInfo,
      description: payload.description,
    })
  }

  const form = new FormData()
  form.append('name', payload.name)
  form.append('phone', payload.phone)
  form.append('specialization', payload.specialization)
  form.append('city', payload.city)
  form.append('location', payload.location)
  if (payload.clinicInfo) form.append('clinicInfo', payload.clinicInfo)
  if (payload.description) form.append('description', payload.description)
  if (payload.existingClinicPhotos !== undefined) {
    form.append('existingClinicPhotos', JSON.stringify(payload.existingClinicPhotos))
  }
  for (const file of payload.clinicPhotoFiles ?? []) {
    form.append('clinicPhotos', file)
  }
  return http.patch<DoctorUser>('/doctor/me', form)
}

export async function setOnlineStatus(isOnline: boolean): Promise<DoctorUser> {
  return http.patch<DoctorUser>('/doctor/me/online', { isOnline })
}

export async function listAppointments(
  params: Record<string, string | number | undefined> = {},
  signal?: AbortSignal,
): Promise<Appointment[]> {
  const data = await http.get<Paginated<Appointment> | Appointment[]>('/appointments', {
    params,
    signal,
  })
  if (Array.isArray(data)) return data
  return data.items ?? []
}

export async function listAllAppointments(
  params: Record<string, string | number | undefined> = {},
  signal?: AbortSignal,
): Promise<Appointment[]> {
  const items: Appointment[] = []
  let page = 1
  let totalPages = 1

  while (page <= totalPages) {
    const data = await http.get<Paginated<Appointment>>('/appointments', {
      params: { ...params, page, limit: 500 },
      signal,
    })
    items.push(...(data.items ?? []))
    totalPages = Math.max(1, data.meta?.totalPages ?? 1)
    if (!data.items?.length) break
    page += 1
  }

  return items
}

export async function getTodayQueue(signal?: AbortSignal): Promise<TodayQueue> {
  return http.get<TodayQueue>('/doctor/me/queue/today', { signal })
}

export async function startReception(): Promise<TodayQueue> {
  return http.post<TodayQueue>('/doctor/me/queue/start')
}

export async function advanceQueue(): Promise<TodayQueue> {
  return http.post<TodayQueue>('/doctor/me/queue/next')
}

export async function markAttendance(
  appointmentId: string,
  attendanceStatus: Extract<AttendanceStatus, 'ATTENDED' | 'ABSENT' | 'LATE'>,
): Promise<Appointment> {
  return http.patch<Appointment>(`/appointments/${appointmentId}/attendance`, {
    attendanceStatus,
  })
}

export async function cancelAppointment(appointmentId: string): Promise<Appointment> {
  return http.post<Appointment>(`/appointments/${appointmentId}/cancel`)
}

export async function acceptAppointment(appointmentId: string): Promise<Appointment> {
  return http.post<Appointment>(`/appointments/${appointmentId}/accept`)
}

export async function manualBook(payload: {
  patientName: string
  patientPhone?: string
  date: string
  time: string
  notes?: string
}): Promise<Appointment> {
  return http.post<Appointment>('/appointments/manual', payload)
}

export async function listPatients(): Promise<PatientSummary[]> {
  const data = await http.get<PatientSummary[] | { items?: PatientSummary[] }>('/doctor/me/patients')
  return Array.isArray(data) ? data : (data.items ?? [])
}

export async function listSchedules(): Promise<DoctorSchedule[]> {
  const data = await http.get<DoctorSchedule[]>('/doctor/me/schedules')
  return Array.isArray(data) ? data : []
}

export async function syncWeeklySchedules(
  days: Array<{ dayOfWeek: DayOfWeek; startTime: string; endTime: string }>,
): Promise<DoctorSchedule[]> {
  const data = await http.put<DoctorSchedule[]>('/doctor/me/schedules/weekly', { days })
  return Array.isArray(data) ? data : []
}

export async function listAvailability(params: {
  from?: string
  to?: string
  date?: string
}): Promise<AvailabilitySlot[]> {
  const data = await http.get<AvailabilitySlot[] | { items?: AvailabilitySlot[] }>(
    '/doctor/me/availability',
    { params },
  )
  return Array.isArray(data) ? data : (data.items ?? [])
}

export async function generateAvailability(payload: {
  date: string
  startTime: string
  endTime: string
  slotDurationMinutes?: number
  gapMinutes?: number
  breakStart?: string
  breakEnd?: string
}): Promise<{ createdCount?: number; skippedCount?: number }> {
  return http.post('/doctor/me/availability/generate', payload)
}

export async function generateFromWeeklySchedule(payload: {
  slotDurationMinutes?: number
  daysAhead?: number
  gapMinutes?: number
  breakStart?: string
  breakEnd?: string
}): Promise<{ createdCount?: number; skippedCount?: number }> {
  return http.post('/doctor/me/availability/generate-from-schedule', payload)
}

export async function deleteAvailabilitySlot(slotId: string): Promise<void> {
  await http.delete(`/doctor/me/availability/${slotId}`)
}

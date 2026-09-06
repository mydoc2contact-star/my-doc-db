export type UserType = 'ADMIN' | 'CLINIC' | 'DOCTOR' | 'PATIENT'

export type EntityStatus = 'ACTIVE' | 'INACTIVE' | 'PENDING' | 'SUSPENDED' | 'DISABLED'

export type AppointmentStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'CANCELLED'
  | 'COMPLETED'
  | 'NO_SHOW'
  | 'REJECTED'

export type AttendanceStatus = 'PENDING' | 'ATTENDED' | 'ABSENT' | 'LATE'

export type DayOfWeek =
  | 'SATURDAY'
  | 'SUNDAY'
  | 'MONDAY'
  | 'TUESDAY'
  | 'WEDNESDAY'
  | 'THURSDAY'
  | 'FRIDAY'

export type DisplayStatus = 'upcoming' | 'attended' | 'absent' | 'completed' | 'cancelled'

export interface DoctorUser {
  id: string
  serialNumber?: string
  name: string
  email: string
  phone: string
  specialization: string
  city: string
  location?: string | null
  clinicInfo?: string | null
  clinicPhotos?: string[]
  description?: string | null
  image?: string | null
  rating?: number
  ratingCount?: number
  status: EntityStatus
  isOnline?: boolean
  clinicId?: string | null
}

export interface PatientSummary {
  id: string
  name: string
  phone: string
  email?: string
  attendancePoints?: number
}

export interface Appointment {
  id: string
  doctorId: string
  patientId?: string | null
  date: string
  time: string
  endTime?: string | null
  isPrivate?: boolean
  status: AppointmentStatus
  notes?: string | null
  patientName?: string | null
  patientPhone?: string | null
  attendanceStatus: AttendanceStatus
  queueNumber?: number | null
  createdAt: string
  patient?: PatientSummary | null
}

export interface Paginated<T> {
  items: T[]
  meta: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export interface QueueSession {
  isActive: boolean
  isCompleted: boolean
  currentNumber: number
  startedAt: string | null
  completedAt: string | null
}

export interface TodayQueue {
  date: string
  session: QueueSession
  appointments: Appointment[]
  totalActive: number
  maxQueueNumber: number
}

export interface DoctorSchedule {
  id: string
  doctorId: string
  dayOfWeek: DayOfWeek
  startTime: string
  endTime: string
}

export interface AvailabilitySlot {
  id: string
  doctorId: string
  date: string
  time: string
  isBooked: boolean
}

export interface LoginResult {
  user: DoctorUser
  userType: UserType
  token: string
  expiresAt: string
}

export interface ApiEnvelope<T> {
  success: boolean
  message?: string
  data: T
}

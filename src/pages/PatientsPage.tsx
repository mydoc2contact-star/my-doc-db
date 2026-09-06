import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Field'
import { StatusBadge } from '@/components/StatusBadge'
import { useAsync } from '@/hooks/useAsync'
import { listAllAppointments, listPatients } from '@/services/api'
import type { Appointment, PatientSummary } from '@/types'
import { formatDateAr, toDateKey } from '@/utils/dates'

interface PatientRow extends PatientSummary {
  appointmentCount: number
  lastAppointment: Appointment | null
}

function buildRows(patients: PatientSummary[], appointments: Appointment[]): PatientRow[] {
  const byPatient = new Map<string, Appointment[]>()

  for (const appointment of appointments) {
    const key = appointment.patientId || appointment.patient?.id
    if (!key) continue
    const list = byPatient.get(key) ?? []
    list.push(appointment)
    byPatient.set(key, list)
  }

  return patients
    .map((patient) => {
      const list = (byPatient.get(patient.id) ?? []).sort(
        (a, b) => `${toDateKey(b.date)} ${b.time}`.localeCompare(`${toDateKey(a.date)} ${a.time}`),
      )
      return {
        ...patient,
        appointmentCount: list.length,
        lastAppointment: list[0] ?? null,
      }
    })
    .sort((a, b) => a.name.localeCompare(b.name, 'ar'))
}

export function PatientsPage() {
  const [query, setQuery] = useState('')
  const state = useAsync(async () => {
    const [patients, appointments] = await Promise.all([listPatients(), listAllAppointments({ limit: 500 })])
    return buildRows(patients, appointments)
  }, [])

  const rows = useMemo(() => {
    const items = state.data ?? []
    const q = query.trim()
    if (!q) return items
    return items.filter((item) => item.name.includes(q) || item.phone.includes(q))
  }, [state.data, query])

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">المرضى</h1>
          <p className="mt-1 text-sm text-slate-500">كل المرضى الذين سبق لهم حجز موعد عندك، وليس مرضى اليوم فقط.</p>
        </div>
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="بحث بالاسم أو الهاتف"
          className="sm:max-w-xs"
        />
      </div>

      <Card className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="px-5 py-3 text-start font-medium">اسم المريض</th>
                <th className="px-5 py-3 text-start font-medium">عدد المواعيد</th>
                <th className="px-5 py-3 text-start font-medium">آخر موعد</th>
                <th className="px-5 py-3 text-start font-medium">حالة آخر موعد</th>
                <th className="px-5 py-3 text-start font-medium" />
              </tr>
            </thead>
            <tbody>
              {state.loading ? (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-slate-500">
                    جاري التحميل...
                  </td>
                </tr>
              ) : state.error ? (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-rose-600">
                    {state.error}
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-slate-500">
                    لا يوجد مرضى بعد.
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.id} className="border-t border-surface-border">
                    <td className="px-5 py-3">
                      <p className="font-medium text-slate-900">{row.name}</p>
                      <p className="text-xs text-slate-500">{row.phone}</p>
                    </td>
                    <td className="px-5 py-3 text-slate-600">{row.appointmentCount}</td>
                    <td className="px-5 py-3 text-slate-600">
                      {row.lastAppointment
                        ? `${formatDateAr(row.lastAppointment.date)} · ${row.lastAppointment.time}`
                        : '—'}
                    </td>
                    <td className="px-5 py-3">
                      {row.lastAppointment ? (
                        <StatusBadge appointment={row.lastAppointment} />
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <Link to={`/patients/${row.id}`} className="text-sm font-medium text-brand-700 hover:text-brand-800">
                        فتح الملف
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}

import { useParams } from 'react-router-dom'
import { Card, CardTitle } from '@/components/ui/Card'
import { StatusBadge } from '@/components/StatusBadge'
import { useAsync } from '@/hooks/useAsync'
import { listAllAppointments, listPatients } from '@/services/api'
import { formatDateAr, toDateKey } from '@/utils/dates'
import { getDisplayStatus } from '@/utils/status'

export function PatientDetailsPage() {
  const { id } = useParams<{ id: string }>()

  const state = useAsync(async () => {
    const [patients, appointments] = await Promise.all([listPatients(), listAllAppointments({ limit: 500 })])
    const patient = patients.find((item) => item.id === id) ?? null
    const history = appointments
      .filter((item) => item.patientId === id || item.patient?.id === id)
      .sort((a, b) => `${toDateKey(b.date)} ${b.time}`.localeCompare(`${toDateKey(a.date)} ${a.time}`))
    return { patient, history }
  }, [id])

  const patient = state.data?.patient
  const history = state.data?.history ?? []
  const attended = history.filter((item) => getDisplayStatus(item) === 'attended' || getDisplayStatus(item) === 'completed').length
  const absent = history.filter((item) => getDisplayStatus(item) === 'absent').length

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-slate-900">{patient?.name ?? 'ملف المريض'}</h1>
        <p className="mt-1 text-sm text-slate-500">{patient?.phone ?? ''}</p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Card>
          <p className="text-sm text-slate-500">المواعيد</p>
          <p className="mt-1 text-2xl font-bold">{history.length}</p>
        </Card>
        <Card>
          <p className="text-sm text-slate-500">حضور</p>
          <p className="mt-1 text-2xl font-bold">{attended}</p>
        </Card>
        <Card>
          <p className="text-sm text-slate-500">غياب</p>
          <p className="mt-1 text-2xl font-bold">{absent}</p>
        </Card>
      </div>

      <Card>
        <CardTitle>سجل المواعيد</CardTitle>
        {state.loading ? (
          <p className="text-sm text-slate-500">جاري التحميل...</p>
        ) : history.length === 0 ? (
          <p className="text-sm text-slate-500">لا توجد مواعيد مسجّلة.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="text-slate-500">
                <tr>
                  <th className="pb-3 text-start font-medium">التاريخ</th>
                  <th className="pb-3 text-start font-medium">الوقت</th>
                  <th className="pb-3 text-start font-medium">الحالة</th>
                </tr>
              </thead>
              <tbody>
                {history.map((item) => (
                  <tr key={item.id} className="border-t border-surface-border">
                    <td className="py-3 text-slate-700">{formatDateAr(item.date)}</td>
                    <td className="py-3 text-slate-700">{item.time}</td>
                    <td className="py-3">
                      <StatusBadge appointment={item} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}

import { Navigate, Outlet, Route, Routes } from 'react-router-dom'
import { DashboardLayout } from '@/layouts/DashboardLayout'
import { useAuth } from '@/contexts/AuthContext'
import { AppointmentsPage } from '@/pages/AppointmentsPage'
import { HomePage } from '@/pages/HomePage'
import { LoginPage } from '@/pages/LoginPage'
import { PatientDetailsPage } from '@/pages/PatientDetailsPage'
import { PatientsPage } from '@/pages/PatientsPage'
import { SettingsPage } from '@/pages/SettingsPage'
import { StatisticsPage } from '@/pages/StatisticsPage'

function Protected() {
  const { isAuthenticated, loading } = useAuth()
  if (loading) {
    return <div className="flex min-h-full items-center justify-center text-sm text-slate-500">جاري التحميل...</div>
  }
  if (!isAuthenticated) return <Navigate to="/login" replace />
  return <Outlet />
}

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<Protected />}>
        <Route element={<DashboardLayout />}>
          <Route index element={<HomePage />} />
          <Route path="appointments" element={<AppointmentsPage />} />
          <Route path="patients" element={<PatientsPage />} />
          <Route path="patients/:id" element={<PatientDetailsPage />} />
          <Route path="statistics" element={<StatisticsPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

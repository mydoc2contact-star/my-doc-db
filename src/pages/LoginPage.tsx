import { useState, type FormEvent } from 'react'
import { Navigate } from 'react-router-dom'
import { Eye, EyeOff, Lock, Mail } from 'lucide-react'
import { Logo } from '@/components/Logo'
import { Button } from '@/components/ui/Button'
import { Field, Input } from '@/components/ui/Field'
import { useAuth } from '@/contexts/AuthContext'
import { errorMessage } from '@/services/api'

export function LoginPage() {
  const { isAuthenticated, loading, login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!loading && isAuthenticated) return <Navigate to="/" replace />

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      await login(email, password)
    } catch (caught) {
      setError(errorMessage(caught))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-full items-center justify-center bg-surface-muted px-4">
      <div className="w-full max-w-md rounded-2xl border border-surface-border bg-white p-6 shadow-card sm:p-8">
        <Logo size="lg" className="max-w-[320px]" />
        <h1 className="mt-6 text-xl font-bold text-slate-900">تسجيل دخول الطبيب</h1>
        <p className="mt-1 text-sm text-slate-500">
          استخدم نفس حساب الطبيب في تطبيق MyDoc. لا يوجد نظام دخول منفصل.
        </p>

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          {error && (
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {error}
            </div>
          )}

          <Field label="البريد الإلكتروني">
            <div className="relative">
              <Mail className="pointer-events-none absolute end-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="pe-10"
                placeholder="doctor@mydoc.com"
                required
                autoComplete="email"
              />
            </div>
          </Field>

          <Field label="كلمة المرور">
            <div className="relative">
              <Lock className="pointer-events-none absolute end-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="pe-10"
                required
                autoComplete="current-password"
              />
              <button
                type="button"
                className="absolute start-3 top-1/2 -translate-y-1/2 text-slate-400"
                onClick={() => setShowPassword((value) => !value)}
                aria-label={showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </Field>

          <Button type="submit" fullWidth loading={submitting}>
            دخول
          </Button>
        </form>
      </div>
    </div>
  )
}

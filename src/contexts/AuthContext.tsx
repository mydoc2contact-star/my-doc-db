import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { DoctorUser } from '@/types'
import {
  clearToken,
  getMe,
  getToken,
  login as loginRequest,
  logout as logoutRequest,
  setUnauthorizedHandler,
} from '@/services/api'

interface AuthContextValue {
  doctor: DoctorUser | null
  loading: boolean
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  refresh: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [doctor, setDoctor] = useState<DoctorUser | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    if (!getToken()) {
      setDoctor(null)
      return
    }
    const profile = await getMe()
    setDoctor(profile)
  }, [])

  useEffect(() => {
    setUnauthorizedHandler(() => setDoctor(null))
    refresh()
      .catch(() => {
        clearToken()
        setDoctor(null)
      })
      .finally(() => setLoading(false))

    return () => setUnauthorizedHandler(null)
  }, [refresh])

  const login = useCallback(async (email: string, password: string) => {
    const result = await loginRequest(email, password)
    try {
      setDoctor(await getMe())
    } catch {
      setDoctor(result.user)
    }
  }, [])

  const logout = useCallback(async () => {
    await logoutRequest()
    setDoctor(null)
  }, [])

  const value = useMemo(
    () => ({
      doctor,
      loading,
      isAuthenticated: Boolean(doctor),
      login,
      logout,
      refresh,
    }),
    [doctor, loading, login, logout, refresh],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used inside AuthProvider')
  return context
}

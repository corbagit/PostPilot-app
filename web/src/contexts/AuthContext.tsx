import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react'
import api from '../api/client'

export interface User {
  id: string
  email: string
  name: string
  avatar_url: string | null
  subscription_tier: string
  subscription_status: string
  posts_generated: number
  stripe_customer_id: string | null
  created_at: string
  updated_at: string
}

interface AuthContextType {
  user: User | null
  loading: boolean
  login: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>
  register: (name: string, email: string, password: string) => Promise<{ ok: boolean; error?: string }>
  logout: () => void
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('postpilot_user')
    return saved ? JSON.parse(saved) : null
  })
  const [loading, setLoading] = useState(false)

  // On mount, try to verify the token is still valid
  useEffect(() => {
    const token = localStorage.getItem('postpilot_token')
    if (token) {
      setLoading(true)
      api.get('/auth/me')
        .then((res) => {
          setUser(res.data.user)
          localStorage.setItem('postpilot_user', JSON.stringify(res.data.user))
        })
        .catch(() => {
          // Token invalid — clear
          localStorage.removeItem('postpilot_token')
          localStorage.removeItem('postpilot_user')
          setUser(null)
        })
        .finally(() => setLoading(false))
    }
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    try {
      const res = await api.post('/auth/login', { email, password })
      const { user: u, token } = res.data
      localStorage.setItem('postpilot_token', token)
      localStorage.setItem('postpilot_user', JSON.stringify(u))
      setUser(u)
      return { ok: true }
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Login failed. Please try again.'
      return { ok: false, error: msg }
    }
  }, [])

  const register = useCallback(async (name: string, email: string, password: string) => {
    try {
      const res = await api.post('/auth/register', { name, email, password })
      const { user: u, token } = res.data
      localStorage.setItem('postpilot_token', token)
      localStorage.setItem('postpilot_user', JSON.stringify(u))
      setUser(u)
      return { ok: true }
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Registration failed. Please try again.'
      return { ok: false, error: msg }
    }
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('postpilot_token')
    localStorage.removeItem('postpilot_user')
    setUser(null)
  }, [])

  const refreshUser = useCallback(async () => {
    try {
      const res = await api.get('/auth/me')
      setUser(res.data.user)
      localStorage.setItem('postpilot_user', JSON.stringify(res.data.user))
    } catch {
      // ignore
    }
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
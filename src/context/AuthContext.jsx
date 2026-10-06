import { createContext, useContext, useState, useEffect } from 'react'

const AuthContext = createContext(null)

const API_BASE = 'http://127.0.0.1:8000/api'
const STORAGE_KEY_USER = 'salessense_user'
const STORAGE_KEY_TOKEN = 'salessense_token'

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_USER)
      return saved ? JSON.parse(saved) : null
    } catch {
      return null
    }
  })

  const [token, setToken] = useState(() => {
    return localStorage.getItem(STORAGE_KEY_TOKEN) || null
  })

  const [loading, setLoading] = useState(false)

  // Sync state to localStorage
  useEffect(() => {
    if (user) {
      localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(user))
    } else {
      localStorage.removeItem(STORAGE_KEY_USER)
    }
  }, [user])

  useEffect(() => {
    if (token) {
      localStorage.setItem(STORAGE_KEY_TOKEN, token)
    } else {
      localStorage.removeItem(STORAGE_KEY_TOKEN)
    }
  }, [token])

  const register = async ({ name, email, password, role = 'retailer' }) => {
    setLoading(true)
    try {
      const res = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, role }),
      })

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        throw new Error(errorData.detail || 'Registration failed.')
      }

      const data = await res.json()
      setUser(data.user)
      setToken(data.access_token)
      return { success: true, user: data.user }
    } catch (err) {
      // Graceful offline fallback if backend isn't reachable
      if (err.message.includes('fetch') || err.message.includes('Failed to fetch')) {
        const fallbackUser = {
          id: 'local-' + Date.now(),
          name,
          email,
          role,
          created_at: new Date().toISOString(),
        }
        setUser(fallbackUser)
        setToken('local-dev-mock-token')
        return { success: true, user: fallbackUser, isOffline: true }
      }
      throw err
    } finally {
      setLoading(false)
    }
  }

  const login = async ({ email, password }) => {
    setLoading(true)
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        throw new Error(errorData.detail || 'Invalid email or password.')
      }

      const data = await res.json()
      setUser(data.user)
      setToken(data.access_token)
      return { success: true, user: data.user }
    } catch (err) {
      // Graceful offline fallback if backend isn't reachable
      if (err.message.includes('fetch') || err.message.includes('Failed to fetch')) {
        const fallbackUser = {
          id: 'local-demo-user',
          name: email.split('@')[0] || 'Store Manager',
          email,
          role: 'retailer',
        }
        setUser(fallbackUser)
        setToken('local-dev-mock-token')
        return { success: true, user: fallbackUser, isOffline: true }
      }
      throw err
    } finally {
      setLoading(false)
    }
  }

  const logout = () => {
    setUser(null)
    setToken(null)
    localStorage.removeItem(STORAGE_KEY_USER)
    localStorage.removeItem(STORAGE_KEY_TOKEN)
  }

  const requestPasswordReset = async (email) => {
    try {
      const res = await fetch(`${API_BASE}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.detail || 'Could not send reset link.')
      }
      return await res.json()
    } catch (err) {
      if (err.message.includes('fetch') || err.message.includes('Failed to fetch')) {
        return { status: 'success', message: 'Demo reset link dispatched' }
      }
      throw err
    }
  }

  const updateUserRole = (newRole) => {
    if (!user) return
    const updated = { ...user, role: newRole }
    setUser(updated)
    localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(updated))
  }

  const updateProfile = (data) => {
    if (!user) return
    const updated = { ...user, ...data }
    setUser(updated)
    localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(updated))
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
        requestPasswordReset,
        updateUserRole,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return ctx
}

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react"

const API = "http://localhost:3001"

export interface AuthUser {
  id: string
  email: string
  displayName: string
}

interface AuthContextValue {
  token: string
  user: AuthUser | null
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<void>
  signup: (email: string, password: string, displayName: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState(() => localStorage.getItem("cc_token") ?? "")
  const [user, setUser] = useState<AuthUser | null>(() => {
    try {
      return JSON.parse(localStorage.getItem("cc_user") ?? "null")
    } catch {
      return null
    }
  })

  const persist = useCallback((t: string, u: AuthUser) => {
    setToken(t)
    setUser(u)
    localStorage.setItem("cc_token", t)
    localStorage.setItem("cc_user", JSON.stringify(u))
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    const res = await fetch(`${API}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.message || "Login failed")
    persist(data.access_token, data.user)
  }, [persist])

  const signup = useCallback(async (email: string, password: string, displayName: string) => {
    const res = await fetch(`${API}/auth/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, displayName }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.message || "Signup failed")
    persist(data.access_token, data.user)
  }, [persist])

  const logout = useCallback(() => {
    setToken("")
    setUser(null)
    localStorage.removeItem("cc_token")
    localStorage.removeItem("cc_user")
  }, [])

  // Validate token on mount
  useEffect(() => {
    if (!token) return
    fetch(`${API}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error()
        return res.json()
      })
      .then((data) => {
        setUser({ id: data.id, email: data.email, displayName: data.displayName })
      })
      .catch(() => {
        logout()
      })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <AuthContext.Provider value={{ token, user, isAuthenticated: !!token && !!user, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used within AuthProvider")
  return ctx
}

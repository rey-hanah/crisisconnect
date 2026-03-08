import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react"
import { API_URL as API } from "@/lib/api"

export interface AuthUser {
  id: string
  email: string
  displayName: string
  city?: string
  country?: string
}

interface AuthContextValue {
  token: string
  user: AuthUser | null
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<void>
  signup: (data: SignupData) => Promise<void>
  logout: () => void
}

export interface SignupData {
  email: string
  password: string
  displayName: string
  city?: string
  country?: string
  lat?: number
  lng?: number
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

  const signup = useCallback(async (signupData: SignupData) => {
    const res = await fetch(`${API}/auth/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(signupData),
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

  // Validate token whenever auth token changes
  useEffect(() => {
    if (!token) return
    let cancelled = false

    fetch(`${API}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error()
        return res.json()
      })
      .then((data) => {
        if (cancelled) return
        const updated: AuthUser = {
          id: data.id,
          email: data.email,
          displayName: data.displayName,
          city: data.city,
          country: data.country,
        }
        setUser(updated)
        localStorage.setItem("cc_user", JSON.stringify(updated))
      })
      .catch(() => {
        if (cancelled) return
        setToken("")
        setUser(null)
        localStorage.removeItem("cc_token")
        localStorage.removeItem("cc_user")
      })

    return () => {
      cancelled = true
    }
  }, [token])

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

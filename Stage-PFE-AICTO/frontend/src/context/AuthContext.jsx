import { createContext, useContext, useState, useEffect } from 'react'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(null)

  useEffect(() => {
    const storedUser = localStorage.getItem('user') || sessionStorage.getItem('user')
    const storedToken = localStorage.getItem('access_token') || sessionStorage.getItem('access_token')
    if (storedUser) {
      try { setUser(JSON.parse(storedUser)) } catch { setUser(null) }
    }
    if (storedToken) setToken(storedToken)
  }, [])

  const login = (tokenVal, userVal, remember) => {
    const storage = remember ? localStorage : sessionStorage
    storage.setItem('access_token', tokenVal)
    storage.setItem('user', JSON.stringify(userVal))
    setToken(tokenVal)
    setUser(userVal)
  }

  const logout = () => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('user')
    sessionStorage.removeItem('access_token')
    sessionStorage.removeItem('user')
    setToken(null)
    setUser(null)
  }

  const role = user?.role || null
  const isAdmin = role === 'admin'
  const isLoggedIn = !!user

  return (
    <AuthContext.Provider value={{ user, token, role, isAdmin, isLoggedIn, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

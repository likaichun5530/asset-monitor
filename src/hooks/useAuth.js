import { useState, useCallback, useMemo } from 'react'

const AUTH_KEY = 'youshu-auth-token'
const API_BASE = import.meta.env.VITE_API_BASE || (typeof window !== 'undefined' ? window.location.origin : '')

function isTokenExpired(token) {
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
    return Date.now() / 1000 > payload.exp
  } catch {
    return true
  }
}

export function useAuth() {
  const [token, setToken] = useState(() => {
    const saved = localStorage.getItem(AUTH_KEY)
    if (saved && !isTokenExpired(saved)) return saved
    if (saved) localStorage.removeItem(AUTH_KEY)
    return null
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const isLoggedIn = Boolean(token)

  const username = useMemo(() => {
    if (!token) return null
    try {
      const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
      return payload.username || null
    } catch { return null }
  }, [token])

  const logout = useCallback(() => {
    localStorage.removeItem(AUTH_KEY)
    localStorage.setItem('youshu-demo-mode', 'true')
    setToken(null)
  }, [])

  const login = useCallback(async (username, password) => {
    setLoading(true)
    setError(null)
    try {
      const resp = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })
      if (!resp.ok) {
        const err = await resp.json()
        throw new Error(err.error || '登录失败')
      }
      const data = await resp.json()
      localStorage.setItem(AUTH_KEY, data.token)
      localStorage.setItem('youshu-demo-mode', 'false')
      setToken(data.token)
      window.location.reload()
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  return { isLoggedIn, token, username, loading, error, login, logout }
}
import { useState, useCallback, useMemo } from 'react'
import { apiUrl } from '../utils/api.js'

const AUTH_KEY = 'youshu-auth-token'

// 解析 JWT payload（缓存避免重复解码）
let cachedPayload = null
let cachedToken = null

function parseToken(token) {
  if (!token) return null
  if (cachedToken === token && cachedPayload) return cachedPayload
  try {
    const encoded = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
    const padded = encoded.padEnd(Math.ceil(encoded.length / 4) * 4, '=')
    const payload = JSON.parse(atob(padded))
    cachedToken = token
    cachedPayload = payload
    return payload
  } catch {
    return null
  }
}

function isTokenExpired(token) {
  const payload = parseToken(token)
  if (!payload) return true
  return Date.now() / 1000 > payload.exp
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
    const payload = parseToken(token)
    return payload?.username || null
  }, [token])

  const logout = useCallback(() => {
    localStorage.removeItem(AUTH_KEY)
    localStorage.removeItem('youshu-demo-mode')
    cachedToken = null
    cachedPayload = null
    setToken(null)
  }, [])

  const login = useCallback(async (username, password) => {
    setLoading(true)
    setError(null)
    try {
      const resp = await fetch(apiUrl('auth/login'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })
      if (!resp.ok) {
        const err = await resp.json()
        throw new Error(err.error || '登录失败')
      }
      const data = await resp.json()
      cachedToken = data.token
      cachedPayload = null
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

import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth.js'

export default function Login() {
  const navigate = useNavigate()
  const { isLoggedIn, login, loading, error } = useAuth()

  useEffect(() => {
    if (isLoggedIn) navigate('/', { replace: true })
  }, [isLoggedIn, navigate])

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const inputRef = useRef(null)

  useEffect(() => { inputRef.current?.focus() }, [])

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!username || !password) return
    login(username, password)
  }

  const handleDemoMode = () => {
    localStorage.setItem('youshu-demo-mode', 'true')
    window.location.replace('/')
  }

  return (
    <div className="min-h-full flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
      <div className="w-full max-w-sm -mt-[60px] sm:mt-0">
        <div className="flex justify-center mb-8">
          <img src="/Transparent-Chinese.png" alt="有数" className="w-[108px] h-[40px] object-cover object-center block dark:hidden" />
          <img src="/white-Chinese.png" alt="有数" className="w-[108px] h-[40px] object-cover object-center hidden dark:block" />
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700 p-6">
          <h1 className="text-lg font-semibold text-gray-800 dark:text-gray-200 text-center mb-6">登录</h1>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">用户名</label>
              <input ref={inputRef} type="text" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="请输入用户名"
                className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-colors"
                autoComplete="username" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">密码</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="请输入密码"
                className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-colors"
                autoComplete="current-password" />
            </div>
            {error && <div className="text-xs text-red-500 text-center">{error}</div>}
            <button type="submit" disabled={loading || !username || !password}
              className="w-full py-2.5 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
              {loading ? (
                <span className="inline-flex items-center gap-2">
                  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.3" />
                    <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                  </svg>登录中...
                </span>
              ) : '登录'}
            </button>
          </form>
          <div className="mt-4 text-center">
            <button onClick={handleDemoMode}
              className="text-xs text-brand-600 hover:text-brand-700 transition-colors bg-transparent border-none cursor-pointer">
              以演示模式浏览 →
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
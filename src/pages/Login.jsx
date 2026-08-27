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
    <div className="min-h-full flex bg-gray-50 dark:bg-gray-900">
      <section className="hidden lg:flex lg:w-[52%] relative overflow-hidden bg-slate-950 px-14 py-12 text-white flex-col justify-between">
        <div className="absolute -left-32 -bottom-40 h-[520px] w-[520px] rounded-full bg-brand-600/20 blur-3xl" />
        <div className="absolute right-12 top-20 h-56 w-56 rounded-full border-[36px] border-white/5" />
        <img src="/white-Chinese.png" alt="有数" className="relative w-[126px] h-[46px] object-cover object-center" />
        <div className="relative max-w-xl">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-300"><span className="h-1.5 w-1.5 rounded-full bg-green-400" />个人资产配置工作台</div>
          <h1 className="text-4xl font-semibold leading-tight tracking-tight">让每一笔资产，<br />都处在清晰的视野里。</h1>
          <p className="mt-5 max-w-md text-sm leading-7 text-slate-400">集中查看持仓、行情、趋势和配置偏差，用一致的数据口径理解整个资产组合。</p>
          <div className="mt-10 grid grid-cols-3 gap-3">
            {['多市场持仓', '目标偏差提醒', '历史资产趋势'].map((feature) => <div key={feature} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-sm text-slate-300">{feature}</div>)}
          </div>
        </div>
        <p className="relative text-xs text-slate-600">资产配置，心中有数</p>
      </section>
      <div className="flex flex-1 items-center justify-center px-4 sm:px-10">
      <div className="w-full max-w-sm -mt-16 sm:mt-0">
        <div className="flex justify-center mb-8">
          <img src="/Transparent-Chinese.png" alt="有数" className="w-[108px] h-[40px] object-cover object-center block dark:hidden" />
          <img src="/white-Chinese.png" alt="有数" className="w-[108px] h-[40px] object-cover object-center hidden dark:block" />
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg sm:rounded-2xl shadow-sm sm:shadow-xl sm:shadow-slate-200/50 dark:shadow-none border border-gray-100 dark:border-gray-700 p-6 sm:p-8">
          <h1 className="text-lg sm:text-2xl font-semibold text-gray-800 dark:text-gray-200 text-center sm:text-left mb-1">欢迎回来</h1>
          <p className="hidden sm:block text-sm text-gray-400 mb-7">登录后查看你的资产工作台</p>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">用户名</label>
              <input ref={inputRef} type="text" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="请输入用户名"
                className="w-full h-11 px-3 py-2 rounded-lg sm:rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-colors"
                autoComplete="username" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">密码</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="请输入密码"
                className="w-full h-11 px-3 py-2 rounded-lg sm:rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-colors"
                autoComplete="current-password" />
            </div>
            {error && <div className="text-xs text-red-500 text-center">{error}</div>}
            <button type="submit" disabled={loading || !username || !password}
              className="w-full h-11 py-2.5 rounded-lg sm:rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
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
    </div>
  )
}

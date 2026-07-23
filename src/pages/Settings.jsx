import { useState } from 'react'

const THEME_KEY = 'youshu-theme'

function applyTheme(t) {
  const root = document.documentElement
  if (t === 'dark') {
    root.classList.add('dark')
  } else if (t === 'light') {
    root.classList.remove('dark')
  } else {
    const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    if (isDark) root.classList.add('dark')
    else root.classList.remove('dark')
  }
}

export function initTheme() {
  const saved = localStorage.getItem(THEME_KEY) || 'system'
  applyTheme(saved)
}

export default function Settings() {
  const [theme, setTheme] = useState(() => localStorage.getItem(THEME_KEY) || 'system')

  function handleThemeChange(t) {
    setTheme(t)
    localStorage.setItem(THEME_KEY, t)
    applyTheme(t)
  }

  const themes = [
    { key: 'light', label: '白天模式', icon: '☀️' },
    { key: 'dark', label: '暗夜模式', icon: '🌙' },
    { key: 'system', label: '跟随系统', icon: '💻' },
  ]

  return (
    <div className="space-y-4">
      <div className="card">
        <h3 className="text-base font-semibold text-gray-800 mb-4">皮肤选择</h3>
        <div className="space-y-2">
          {themes.map((t) => (
            <button
              key={t.key}
              onClick={() => handleThemeChange(t.key)}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-lg border transition-colors ${
                theme === t.key
                  ? 'border-brand-500 bg-brand-50 dark:bg-brand-500/10 dark:border-brand-400'
                  : 'border-gray-100 dark:border-gray-700 hover:border-gray-200 dark:hover:border-gray-600'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-xl">{t.icon}</span>
                <span className="text-sm font-medium text-gray-800">{t.label}</span>
              </div>
              {theme === t.key && (
                <svg className="w-5 h-5 text-brand-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="card">
        <h3 className="text-base font-semibold text-gray-800 mb-4">关于</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">应用名称</span>
            <span className="text-gray-800 font-medium">有数</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">版本</span>
            <span className="text-gray-800">1.0.0</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Slogan</span>
            <span className="text-gray-800">资产配置，心中有数</span>
          </div>
        </div>
      </div>
    </div>
  )
}
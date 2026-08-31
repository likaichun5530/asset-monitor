import React from 'react'
import ReactDOM from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import App from './App.jsx'
import './index.css'

// PWA Service Worker 注册（vite-plugin-pwa 自动注入）

// 真机诊断开关：在 WebView DevTools 中设置 youshu-keyboard-debug=true 后刷新。
// 只记录事件目标与坐标，不读取输入内容，也不改变事件默认行为。
try {
  if (localStorage.getItem('youshu-keyboard-debug') === 'true') {
    const logKeyboardEvent = (event) => {
      const point = event.touches?.[0] || event
      const target = event.target instanceof Element
        ? `${event.target.tagName.toLowerCase()}${event.target.id ? `#${event.target.id}` : ''}`
        : 'unknown'
      console.info('[keyboard-debug]', {
        type: event.type,
        target,
        x: Number.isFinite(point.clientX) ? Math.round(point.clientX) : null,
        y: Number.isFinite(point.clientY) ? Math.round(point.clientY) : null,
        activeElement: document.activeElement?.tagName?.toLowerCase() || null,
        innerHeight: window.innerHeight,
        visualViewportHeight: window.visualViewport ? Math.round(window.visualViewport.height) : null,
      })
    }
    ;['focusin', 'focusout', 'pointerdown', 'touchstart'].forEach((type) => {
      document.addEventListener(type, logKeyboardEvent, { capture: true, passive: true })
    })
  }
} catch {
  // 调试能力不可用时不影响应用启动。
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </React.StrictMode>
)

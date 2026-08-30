import React from 'react'
import ReactDOM from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import App from './App.jsx'
import '@fontsource/roboto-condensed/latin-400.css'
import '@fontsource/roboto-condensed/latin-700.css'
import './index.css'

// PWA Service Worker 注册（vite-plugin-pwa 自动注入）

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </React.StrictMode>
)

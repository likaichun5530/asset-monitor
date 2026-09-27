import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

const deferProductionStyles = () => ({
  name: 'defer-production-styles',
  enforce: 'post',
  transformIndexHtml: {
    order: 'post',
    handler(html, context) {
      if (!context.bundle) return html
      return html.replace(
        /<link rel="stylesheet"([^>]*?)href="([^"]+)"([^>]*)>/,
        '<link id="app-styles" rel="preload" as="style"$1href="$2"$3 onload="this.onload=null;this.rel=\'stylesheet\'">' +
          '<noscript><link rel="stylesheet"$1href="$2"$3></noscript>',
      )
    },
  },
})

export default defineConfig({
  plugins: [
    react(),
    deferProductionStyles(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,jpg,woff2}'],
      },
      // 使用 public 中的唯一 manifest，避免插件再生成一份。
      manifest: false,
    }),
  ],
  server: {
    host: true,
    port: 5173,
  },
  build: {
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'chart-vendor': ['recharts'],
        },
      },
    },
  },
})

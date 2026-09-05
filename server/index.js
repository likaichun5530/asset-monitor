// 本地开发服务器复用 Vercel Functions，确保两种运行方式行为一致。
import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'

dotenv.config()

const routes = [
  ['/api/auth/login', '../api/auth/login.js'],
  ['/api/auth/change-password', '../api/auth/change-password.js'],
  ['/api/ai-chat', '../api/ai-chat.js'],
  ['/api/ai-rules', '../api/ai-rules.js'],
  ['/api/futures', '../api/futures.js'],
  ['/api/health', '../api/health.js'],
  ['/api/history', '../api/history.js'],
  ['/api/holdings', '../api/holdings.js'],
  ['/api/market', '../api/market.js'],
  ['/api/snapshot', '../api/snapshot.js'],
  ['/api/snapshot-auto', '../api/snapshot-auto.js'],
  ['/api/target', '../api/target.js'],
]

const app = express()
app.use(cors())
app.use(express.json({ limit: '5mb' }))

for (const [path, modulePath] of routes) {
  const { default: handler } = await import(modulePath)
  app.all(path, (req, res) => handler(req, res))
}

const port = process.env.PORT || 8787
app.listen(port, () => {
  console.log(`Asset Monitor API listening on http://localhost:${port}`)
})

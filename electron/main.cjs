const { app, BrowserWindow, Menu } = require('electron')
const path = require('path')

let mainWindow = null
let serverStarted = false

// 检查端口是否被占用，如果是则尝试杀掉
function killPort(port) {
  try {
    const { execSync } = require('child_process')
    execSync(`lsof -ti:${port} | xargs kill -9 2>/dev/null`, { stdio: 'ignore' })
  } catch {
    // ignore
  }
}

async function startServer() {
  const isDev = !app.isPackaged
  const serverPath = isDev
    ? path.join(__dirname, '..', 'server')
    : path.join(process.resourcesPath, 'server')

  console.log('Starting server from:', serverPath)

  // 先杀掉可能占用 8787 端口的进程
  killPort(8787)

  try {
    // 设置环境变量
    process.chdir(serverPath)

    // 加载 .env
    const fs = require('fs')
    const envPath = path.join(serverPath, '.env')
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, 'utf8')
      envContent.split('\n').forEach((line) => {
        const match = line.match(/^([^#=]+)=(.*)$/)
        if (match) {
          process.env[match[1].trim()] = match[2].trim().replace(/^["']|["']$/g, '')
        }
      })
    }

    // 设置代理，确保 Node.js 能访问 Google API
    if (!process.env.HTTPS_PROXY && !process.env.https_proxy) {
      process.env.HTTPS_PROXY = 'http://127.0.0.1:7890'
      process.env.https_proxy = 'http://127.0.0.1:7890'
    }

    // 动态 import 后端（ES module）
    const serverModule = await import(path.join(serverPath, 'index.js'))
    serverStarted = true
    console.log('Server started successfully')
  } catch (e) {
    console.error('Failed to start server:', e)
    // 如果 import 失败，尝试用 fork
    try {
      const { fork } = require('child_process')
      const child = fork(path.join(serverPath, 'index.js'), [], {
        cwd: serverPath,
        env: { ...process.env },
        stdio: 'pipe',
      })
      child.stdout.on('data', (d) => console.log('server:', d.toString()))
      child.stderr.on('data', (d) => console.error('server err:', d.toString()))
      serverStarted = true
    } catch (e2) {
      console.error('Fork also failed:', e2)
    }
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    title: '有数 · 资产配置，心里有数',
    show: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  const isDev = !app.isPackaged
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'))
  }

  if (!isDev) {
    Menu.setApplicationMenu(null)
  }
}

app.whenReady().then(async () => {
  await startServer()
  // 等待后端启动后再创建窗口
  setTimeout(createWindow, 1500)

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  app.quit()
})

app.on('before-quit', () => {
  // 后端是同进程的，不需要 kill
})
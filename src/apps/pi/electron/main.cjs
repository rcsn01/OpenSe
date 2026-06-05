const { app, BrowserWindow, dialog, ipcMain, shell } = require('electron')
const { createReadStream, existsSync } = require('node:fs')
const { createServer } = require('node:http')
const { extname, join, resolve } = require('node:path')
const { createAssistantService, registerAssistantIpc } = require('./assistant-service.cjs')

const DEFAULT_WEB_PORT = '5995'
const APP_NAME = 'Open Pi'
const APP_ID = 'com.opense.pi'
const isDev = process.env.OPEN_PI_DESKTOP_DEV === '1'

let mainWindow
let staticServer
let assistantService

app.setName(APP_NAME)
app.setPath('userData', join(app.getPath('appData'), APP_NAME))

if (process.platform === 'darwin') {
  app.setAboutPanelOptions({
    applicationName: APP_NAME,
    applicationVersion: app.getVersion(),
    copyright: 'Copyright OpenSe',
  })
}

const contentTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
}

const waitForUrl = async (url, attempts = 60) => {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      const response = await fetch(url)
      if (response.ok) return
    } catch {
      // The dev server may still be booting.
    }

    await new Promise((resolveWait) => setTimeout(resolveWait, 500))
  }

  throw new Error(`Timed out waiting for ${url}`)
}

const startStaticServer = async () => {
  const distDir = resolve(app.getAppPath(), process.env.OPEN_PI_DESKTOP_DIST || 'dist')
  const indexPath = join(distDir, 'index.html')
  const webPort = Number(process.env.OPEN_PI_WEB_PORT || DEFAULT_WEB_PORT)

  if (!existsSync(indexPath)) {
    throw new Error(`Open Pi build output was not found at ${indexPath}`)
  }

  staticServer = createServer((request, response) => {
    const requestUrl = new URL(request.url || '/', 'http://127.0.0.1')
    const cleanPath = decodeURIComponent(requestUrl.pathname).replace(/^\/+/, '')
    const requestedPath = cleanPath ? resolve(distDir, cleanPath) : indexPath
    const isInsideDist = requestedPath === distDir || requestedPath.startsWith(`${distDir}/`)
    if (!isInsideDist) {
      response.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' })
      response.end('Forbidden')
      return
    }

    const filePath = existsSync(requestedPath) ? requestedPath : indexPath
    const extension = extname(filePath)

    response.writeHead(200, {
      'Content-Type': contentTypes[extension] || 'application/octet-stream',
    })
    createReadStream(filePath).pipe(response)
  })

  await new Promise((resolveListen, rejectListen) => {
    staticServer.once('error', rejectListen)
    staticServer.listen(webPort, '127.0.0.1', resolveListen)
  })

  return `http://127.0.0.1:${webPort}`
}

const getRendererUrl = async () => {
  if (isDev) {
    const webPort = process.env.OPEN_PI_WEB_PORT || DEFAULT_WEB_PORT
    const devUrl = process.env.OPEN_PI_DESKTOP_URL || `http://127.0.0.1:${webPort}`
    await waitForUrl(devUrl)
    return devUrl
  }

  return startStaticServer()
}

const createWindow = async () => {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 940,
    minWidth: 1000,
    minHeight: 680,
    title: APP_NAME,
    backgroundColor: '#ffffff',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      preload: join(__dirname, 'preload.cjs'),
    },
  })

  mainWindow.on('closed', () => {
    mainWindow = undefined
  })

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url)
    return { action: 'deny' }
  })

  await mainWindow.loadURL(await getRendererUrl())

  if (isDev) {
    mainWindow.webContents.openDevTools({ mode: 'detach' })
  }
}

const registerSubscriptions = () => {
  const sessionSubscriptions = new Map()
  ipcMain.handle('assistant:subscribe-session', (event, sessionId) => {
    const senderId = event.sender.id
    const key = `${senderId}:${sessionId}`
    if (sessionSubscriptions.has(key)) return

    const unsubscribe = assistantService.onSessionEvent(sessionId, (payload) => {
      if (!event.sender.isDestroyed()) {
        event.sender.send(`assistant:session-event:${sessionId}`, payload)
      }
    })
    sessionSubscriptions.set(key, unsubscribe)
  })

  ipcMain.handle('assistant:unsubscribe-session', (event, sessionId) => {
    const key = `${event.sender.id}:${sessionId}`
    const unsubscribe = sessionSubscriptions.get(key)
    if (unsubscribe) {
      unsubscribe()
      sessionSubscriptions.delete(key)
    }
  })

  const terminalSubscriptions = new Map()
  ipcMain.handle('assistant:subscribe-terminal', (event, terminalId) => {
    const senderId = event.sender.id
    const key = `${senderId}:${terminalId}`
    if (terminalSubscriptions.has(key)) return

    const unsubscribe = assistantService.onTerminalEvent(terminalId, (payload) => {
      if (!event.sender.isDestroyed()) {
        event.sender.send(`assistant:terminal-event:${terminalId}`, payload)
      }
    })
    terminalSubscriptions.set(key, unsubscribe)
  })

  ipcMain.handle('assistant:unsubscribe-terminal', (event, terminalId) => {
    const key = `${event.sender.id}:${terminalId}`
    const unsubscribe = terminalSubscriptions.get(key)
    if (unsubscribe) {
      unsubscribe()
      terminalSubscriptions.delete(key)
    }
  })
}

const lock = app.requestSingleInstanceLock()

if (!lock) {
  app.quit()
} else {
  app.setAppUserModelId(APP_ID)

  app.on('second-instance', () => {
    const [window] = BrowserWindow.getAllWindows()
    if (!window) return
    if (window.isMinimized()) window.restore()
    window.focus()
  })

  app.whenReady().then(() => {
    assistantService = createAssistantService({
      userDataPath: app.getPath('userData'),
      appDataPath: app.getPath('appData'),
      chooseDirectory: async () => {
        const result = await dialog.showOpenDialog(mainWindow, {
          title: 'Choose a directory for Open Pi',
          properties: ['openDirectory', 'createDirectory'],
        })
        return result.canceled ? null : result.filePaths[0] ?? null
      },
    })
    registerAssistantIpc({ ipcMain, service: assistantService })
    registerSubscriptions()
    return createWindow()
  }).catch((error) => {
    console.error(error)
    app.quit()
  })

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      void createWindow()
    }
  })

  app.on('before-quit', () => {
    try {
      assistantService?.dispose?.()
    } catch {}
  })

  app.on('window-all-closed', () => {
    if (staticServer) {
      staticServer.close()
      staticServer = undefined
    }

    if (process.platform !== 'darwin') {
      app.quit()
    }
  })
}

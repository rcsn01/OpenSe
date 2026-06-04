const fs = require('node:fs')
const path = require('node:path')
const { app, BrowserWindow, dialog, ipcMain, protocol, shell } = require('electron')
const { fetchDiscoveryConfig, normalizeAccountsUrl, validateStoredDesktopConfig } = require('./discovery.cjs')
const { createProtocolHandler } = require('./protocol-router.cjs')
const { serializeDesktopRuntimeConfig } = require('./runtime-config.cjs')
const { createAssistantService, registerAssistantIpc } = require('./assistant-service.cjs')

protocol.registerSchemesAsPrivileged([
  {
    scheme: 'opense',
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: true,
      stream: true,
    },
  },
])

let mainWindow = null
let storedDiscovery = null
const useDevServers = process.env.OPENSE_DESKTOP_DEV_SERVERS === '1'

const DEV_APP_URLS = {
  accounts: 'http://localhost:5991',
  ass: 'http://localhost:5995',
  etl: 'http://localhost:5992',
  stoqr: 'http://localhost:5993',
}

if (useDevServers) {
  app.setPath('userData', path.join(app.getPath('temp'), 'opense-desktop-dev'))
}

const getConfigPath = () => path.join(app.getPath('userData'), 'desktop-config.json')

const readStoredDiscovery = () => {
  if (storedDiscovery) return storedDiscovery

  try {
    storedDiscovery = validateStoredDesktopConfig(JSON.parse(fs.readFileSync(getConfigPath(), 'utf8')))
    return storedDiscovery
  } catch (error) {
    if (fs.existsSync(getConfigPath())) {
      console.error('Ignoring invalid desktop config:', error)
      clearStoredDiscovery()
    }
    return null
  }
}

const writeStoredDiscovery = (accountsUrl, discovery) => {
  storedDiscovery = {
    accountsUrl: normalizeAccountsUrl(accountsUrl),
    discovery,
    configuredAt: new Date().toISOString(),
  }

  fs.mkdirSync(path.dirname(getConfigPath()), { recursive: true })
  fs.writeFileSync(getConfigPath(), JSON.stringify(storedDiscovery, null, 2))
  return storedDiscovery
}

const clearStoredDiscovery = () => {
  storedDiscovery = null
  try {
    fs.unlinkSync(getConfigPath())
  } catch {}
}

const getAppsRoot = () =>
  app.isPackaged
    ? path.join(process.resourcesPath, 'apps')
    : path.resolve(__dirname, '..', '..')

const getConfigScript = () => {
  const config = readStoredDiscovery()
  return serializeDesktopRuntimeConfig(config?.discovery)
}

const translateDesktopUrlToDevServer = (url) => {
  try {
    const parsed = new URL(url)
    if (parsed.protocol !== 'opense:' || parsed.hostname !== 'desktop') {
      return url
    }

    const [, appName, ...rest] = parsed.pathname.split('/')
    const appBaseUrl = DEV_APP_URLS[appName]
    if (!appBaseUrl) {
      return DEV_APP_URLS.accounts
    }

    const pathSuffix = rest.length > 0 ? `/${rest.join('/')}` : '/'
    return `${appBaseUrl}${pathSuffix}${parsed.search}${parsed.hash}`
  } catch {
    return url
  }
}

const loadInitialPage = async () => {
  if (useDevServers) {
    await mainWindow.loadURL(DEV_APP_URLS.accounts)
    return
  }

  const configured = readStoredDiscovery()
  await mainWindow.loadURL(configured ? 'opense://desktop/accounts/' : 'opense://desktop/accounts/setup')
}

const createMainWindow = async () => {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 960,
    minHeight: 640,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, 'preload.cjs'),
    },
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })

  mainWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription, validatedURL) => {
    console.error('Desktop page failed to load:', { errorCode, errorDescription, validatedURL })
  })

  mainWindow.webContents.on('console-message', (_event, level, message, line, sourceId) => {
    console.log('Desktop renderer console:', { level, message, line, sourceId })
  })

  mainWindow.webContents.on('render-process-gone', (_event, details) => {
    console.error('Desktop renderer process gone:', details)
  })

  await loadInitialPage()
}

const navigateDeepLink = (url) => {
  if (!url.startsWith('opense://desktop/')) return
  const targetUrl = useDevServers ? translateDesktopUrlToDevServer(url) : url

  if (mainWindow) {
    void mainWindow.loadURL(targetUrl)
    if (mainWindow.isMinimized()) mainWindow.restore()
    mainWindow.focus()
    return
  }

  app.whenReady().then(createMainWindow)
}

const gotSingleInstanceLock = app.requestSingleInstanceLock()
if (!gotSingleInstanceLock) {
  app.quit()
}

app.on('second-instance', (_event, argv) => {
  const deepLink = argv.find((arg) => arg.startsWith('opense://'))
  if (deepLink) navigateDeepLink(deepLink)
})

app.on('open-url', (event, url) => {
  event.preventDefault()
  navigateDeepLink(url)
})

app.whenReady().then(async () => {
  app.setAsDefaultProtocolClient('opense')

  const assistantService = createAssistantService({
    userDataPath: app.getPath('userData'),
    chooseDirectory: async () => {
      const result = await dialog.showOpenDialog(mainWindow, {
        title: 'Choose a directory for Open-Ass',
        properties: ['openDirectory', 'createDirectory'],
      })
      return result.canceled ? null : result.filePaths[0] ?? null
    },
  })
  globalThis.__openseAssistantService = assistantService

  protocol.handle(
    'opense',
    createProtocolHandler({
      appsRoot: getAppsRoot(),
      getConfigScript,
    }),
  )

  ipcMain.handle('desktop:configure', async (_event, accountsUrl) => {
    const discovery = await fetchDiscoveryConfig(accountsUrl)
    const stored = writeStoredDiscovery(accountsUrl, discovery)
    await mainWindow.loadURL('opense://desktop/accounts/')
    return stored
  })

  ipcMain.handle('desktop:get-configuration', async () => readStoredDiscovery())

  registerAssistantIpc({ ipcMain, service: assistantService })

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

  ipcMain.handle('desktop:open-external', async (_event, url) => {
    const parsed = new URL(url)
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
      throw new Error('Only http and https URLs can be opened externally.')
    }
    await shell.openExternal(url)
  })

  ipcMain.handle('desktop:reset-configuration', async () => {
    clearStoredDiscovery()
    await mainWindow.loadURL('opense://desktop/accounts/setup')
  })

  await createMainWindow()
})

app.on('before-quit', () => {
  try {
    const assistantService = globalThis.__openseAssistantService
    assistantService?.dispose?.()
  } catch {}
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    void createMainWindow()
  }
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

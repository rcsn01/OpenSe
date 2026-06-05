const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const crypto = require('node:crypto')
const { EventEmitter } = require('node:events')

const MAX_TERMINAL_REPLAY_SIZE = 200_000
const MAX_TERMINAL_WRITE_SIZE = 100_000
const DEFAULT_TERMINAL_COLS = 80
const DEFAULT_TERMINAL_ROWS = 24
const REGISTRY_DIR = 'open-pi'
const DIRECTORIES_FILE = 'directories.json'
const LEGACY_SESSIONS_FILE = 'sessions.json'
const VALID_TERMINAL_ID = /^term_[a-zA-Z0-9_-]{8,120}$/

const nowIso = () => new Date().toISOString()

const ensureDirectory = (directoryPath) => {
  fs.mkdirSync(directoryPath, { recursive: true })
}

const readJsonFile = (filePath, fallback) => {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'))
  } catch {
    return fallback
  }
}

const writeJsonFile = (filePath, value) => {
  ensureDirectory(path.dirname(filePath))
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2))
}

const expandHomePath = (value, homeDir = os.homedir()) => {
  if (typeof value !== 'string' || !value.trim()) return value
  if (value === '~') return homeDir
  if (value.startsWith('~/') || value.startsWith('~\\')) return path.join(homeDir, value.slice(2))
  return value
}

const resolveDirectoryPath = (directoryPath) => {
  if (typeof directoryPath !== 'string' || !directoryPath.trim()) {
    throw new Error('A directory path is required.')
  }
  const resolved = path.resolve(expandHomePath(directoryPath.trim()))
  const stat = fs.statSync(resolved)
  if (!stat.isDirectory()) throw new Error(`${resolved} is not a directory.`)
  return resolved
}

const directoryIdFromPath = (directoryPath) =>
  `dir_${crypto.createHash('sha256').update(path.resolve(directoryPath)).digest('hex').slice(0, 24)}`

const terminalIdFromPath = (directoryPath) =>
  `term_${crypto.createHash('sha256').update(`${path.resolve(directoryPath)}:${Date.now()}:${Math.random()}`).digest('hex').slice(0, 32)}`

const basenameForDirectory = (directoryPath) => path.basename(directoryPath) || directoryPath

const normalizeDirectoryRecord = (record) => {
  if (!record || typeof record !== 'object' || Array.isArray(record)) return null
  const rawPath = typeof record.path === 'string' ? record.path : typeof record.directoryPath === 'string' ? record.directoryPath : ''
  if (!rawPath.trim()) return null
  let resolved
  try {
    resolved = resolveDirectoryPath(rawPath)
  } catch {
    return null
  }
  const timestamp = typeof record.createdAt === 'string' ? record.createdAt : nowIso()
  return {
    id: directoryIdFromPath(resolved),
    path: resolved,
    name: typeof record.name === 'string' && record.name.trim() ? record.name.trim() : basenameForDirectory(resolved),
    createdAt: timestamp,
    updatedAt: typeof record.updatedAt === 'string' ? record.updatedAt : timestamp,
    lastOpenedAt: typeof record.lastOpenedAt === 'string' ? record.lastOpenedAt : timestamp,
  }
}

const normalizeDirectoryList = (value) => {
  const records = Array.isArray(value) ? value : Array.isArray(value?.directories) ? value.directories : []
  const byPath = new Map()
  for (const record of records) {
    const normalized = normalizeDirectoryRecord(record)
    if (normalized) byPath.set(normalized.path, normalized)
  }
  return Array.from(byPath.values()).sort((left, right) => right.lastOpenedAt.localeCompare(left.lastOpenedAt))
}

const getPtySpawn = () => {
  try {
    return require('node-pty').spawn
  } catch {
    return null
  }
}

const getDefaultShell = (env = process.env) => {
  if (process.platform === 'win32') return env.COMSPEC || 'cmd.exe'
  return env.SHELL || '/bin/zsh'
}

const getDefaultShellArgs = () => {
  if (process.platform === 'win32') return []
  return ['-l']
}

const validateTerminalId = (terminalId) => {
  if (typeof terminalId !== 'string' || !VALID_TERMINAL_ID.test(terminalId)) {
    throw new Error('Invalid Open Pi terminal id.')
  }
  return terminalId
}

const createTerminalService = ({
  userDataPath,
  chooseDirectory,
  ptySpawn = getPtySpawn(),
  env = process.env,
} = {}) => {
  if (!userDataPath) throw new Error('Open Pi terminal service requires a user data path.')

  const emitter = new EventEmitter()
  const registryPath = path.join(userDataPath, REGISTRY_DIR, DIRECTORIES_FILE)
  const legacySessionsPath = path.join(userDataPath, REGISTRY_DIR, LEGACY_SESSIONS_FILE)
  const terminals = new Map()
  const terminalsByDirectory = new Map()

  const readDirectories = () => {
    const existing = normalizeDirectoryList(readJsonFile(registryPath, { directories: [] }))
    if (existing.length || fs.existsSync(registryPath)) return existing

    const migrated = normalizeDirectoryList(readJsonFile(legacySessionsPath, []))
    if (migrated.length) writeJsonFile(registryPath, { directories: migrated })
    return migrated
  }

  const writeDirectories = (directories) => {
    writeJsonFile(registryPath, { directories })
  }

  const upsertDirectory = (directoryPath) => {
    const resolved = resolveDirectoryPath(directoryPath)
    const timestamp = nowIso()
    const directories = readDirectories()
    const existing = directories.find((directory) => directory.path === resolved)
    const nextRecord = {
      id: directoryIdFromPath(resolved),
      path: resolved,
      name: existing?.name ?? basenameForDirectory(resolved),
      createdAt: existing?.createdAt ?? timestamp,
      updatedAt: timestamp,
      lastOpenedAt: timestamp,
    }
    const nextDirectories = [nextRecord, ...directories.filter((directory) => directory.path !== resolved)]
    writeDirectories(nextDirectories)
    return nextRecord
  }

  const serializeTerminal = (terminal) => ({
    id: terminal.id,
    directoryPath: terminal.directoryPath,
    status: terminal.status,
    initialData: terminal.replay || undefined,
  })

  const emitTerminalEvent = (terminalId, event) => {
    emitter.emit(`terminal:${terminalId}`, event)
  }

  const appendTerminalReplay = (terminal, data) => {
    terminal.replay = `${terminal.replay}${data}`.slice(-MAX_TERMINAL_REPLAY_SIZE)
  }

  const removeTerminal = (terminal) => {
    terminals.delete(terminal.id)
    if (terminalsByDirectory.get(terminal.directoryPath) === terminal.id) terminalsByDirectory.delete(terminal.directoryPath)
  }

  const attachTerminalDataListener = (terminal, child) => {
    if (typeof child.onData === 'function') {
      terminal.dataDisposable = child.onData((data) => {
        const text = String(data)
        appendTerminalReplay(terminal, text)
        emitTerminalEvent(terminal.id, { type: 'data', id: terminal.id, data: text })
      })
      return
    }
    if (typeof child.on === 'function') {
      child.on('data', (data) => {
        const text = String(data)
        appendTerminalReplay(terminal, text)
        emitTerminalEvent(terminal.id, { type: 'data', id: terminal.id, data: text })
      })
    }
  }

  const attachTerminalExitListener = (terminal, child) => {
    const onExit = (eventOrCode, maybeSignal) => {
      if (terminal.closedNotified) return
      terminal.closedNotified = true
      const exitCode = typeof eventOrCode === 'object' && eventOrCode !== null ? eventOrCode.exitCode : eventOrCode
      const signal = typeof eventOrCode === 'object' && eventOrCode !== null ? eventOrCode.signal : maybeSignal
      terminal.status = terminal.closing ? 'closed' : 'exited'
      removeTerminal(terminal)
      emitTerminalEvent(terminal.id, {
        type: 'status',
        id: terminal.id,
        status: terminal.status,
        exitCode: typeof exitCode === 'number' ? exitCode : undefined,
        signal: signal == null ? undefined : String(signal),
      })
    }

    if (typeof child.onExit === 'function') {
      terminal.exitDisposable = child.onExit(onExit)
      return
    }
    if (typeof child.once === 'function') child.once('exit', onExit)
    else if (typeof child.on === 'function') child.on('exit', onExit)
  }

  const getTerminal = (terminalId) => {
    const id = validateTerminalId(terminalId)
    const terminal = terminals.get(id)
    if (!terminal) throw new Error('Open Pi terminal was not found.')
    return terminal
  }

  const closeTerminal = (terminal) => {
    if (terminal.closedNotified) return
    terminal.closing = true
    terminal.dataDisposable?.dispose?.()
    terminal.exitDisposable?.dispose?.()
    try {
      if (typeof terminal.child.kill === 'function') terminal.child.kill()
    } finally {
      if (terminal.closedNotified) return
      terminal.closedNotified = true
      terminal.status = 'closed'
      removeTerminal(terminal)
      emitTerminalEvent(terminal.id, { type: 'status', id: terminal.id, status: 'closed' })
    }
  }

  const service = {
    getStatus: async () => {
      if (typeof ptySpawn !== 'function') {
        return { available: false, error: 'node-pty is not available. Reinstall Open Pi dependencies.' }
      }
      return { available: true, shell: getDefaultShell(env) }
    },

    listDirectories: async () => readDirectories(),

    chooseDirectory: async () => {
      if (typeof chooseDirectory !== 'function') throw new Error('Directory picker is not available.')
      const selected = await chooseDirectory()
      if (!selected) return null
      return upsertDirectory(selected)
    },

    removeDirectory: async (directoryId) => {
      if (typeof directoryId !== 'string' || !directoryId.startsWith('dir_')) {
        throw new Error('Invalid Open Pi directory id.')
      }
      const directories = readDirectories()
      const removed = directories.find((directory) => directory.id === directoryId)
      writeDirectories(directories.filter((directory) => directory.id !== directoryId))
      if (removed) {
        const terminalId = terminalsByDirectory.get(removed.path)
        const terminal = terminalId ? terminals.get(terminalId) : null
        if (terminal) closeTerminal(terminal)
      }
    },

    startTerminal: async (input = {}) => {
      const directoryPath = resolveDirectoryPath(input.directoryPath || os.homedir())
      upsertDirectory(directoryPath)

      const existingId = terminalsByDirectory.get(directoryPath)
      const existing = existingId ? terminals.get(existingId) : null
      if (existing?.status === 'running') return serializeTerminal(existing)

      if (typeof ptySpawn !== 'function') throw new Error('node-pty is not available. Reinstall Open Pi dependencies.')

      const cols = Number.isFinite(input.cols) ? Math.max(20, Math.min(400, Math.floor(input.cols))) : DEFAULT_TERMINAL_COLS
      const rows = Number.isFinite(input.rows) ? Math.max(5, Math.min(120, Math.floor(input.rows))) : DEFAULT_TERMINAL_ROWS
      const terminal = {
        id: terminalIdFromPath(directoryPath),
        directoryPath,
        status: 'running',
        replay: '',
        cols,
        rows,
        closing: false,
        closedNotified: false,
      }

      const child = ptySpawn(getDefaultShell(env), getDefaultShellArgs(), {
        name: 'xterm-256color',
        cols,
        rows,
        cwd: directoryPath,
        env: {
          ...env,
          TERM: env.TERM || 'xterm-256color',
          COLORTERM: env.COLORTERM || 'truecolor',
          FORCE_COLOR: env.FORCE_COLOR || '1',
          OPEN_PI_CLIENT: env.OPEN_PI_CLIENT || 'desktop-terminal',
        },
      })

      terminal.child = child
      terminals.set(terminal.id, terminal)
      terminalsByDirectory.set(directoryPath, terminal.id)
      attachTerminalDataListener(terminal, child)
      attachTerminalExitListener(terminal, child)
      return serializeTerminal(terminal)
    },

    writeTerminal: async (terminalId, data) => {
      const terminal = getTerminal(terminalId)
      const text = String(data ?? '')
      if (!text) return
      if (text.length > MAX_TERMINAL_WRITE_SIZE) throw new Error('Terminal write is too large.')
      if (terminal.status !== 'running') throw new Error('Open Pi terminal is not running.')
      terminal.child.write(text)
    },

    resizeTerminal: async (terminalId, cols, rows) => {
      const terminal = getTerminal(terminalId)
      const nextCols = Math.max(20, Math.min(400, Math.floor(Number(cols) || DEFAULT_TERMINAL_COLS)))
      const nextRows = Math.max(5, Math.min(120, Math.floor(Number(rows) || DEFAULT_TERMINAL_ROWS)))
      terminal.cols = nextCols
      terminal.rows = nextRows
      if (terminal.status === 'running' && typeof terminal.child.resize === 'function') terminal.child.resize(nextCols, nextRows)
    },

    stopTerminal: async (terminalId) => {
      closeTerminal(getTerminal(terminalId))
    },

    onTerminalEvent: (terminalId, callback) => {
      const id = validateTerminalId(terminalId)
      const eventName = `terminal:${id}`
      emitter.on(eventName, callback)
      return () => emitter.off(eventName, callback)
    },

    dispose: () => {
      for (const terminal of Array.from(terminals.values())) closeTerminal(terminal)
      emitter.removeAllListeners()
    },
  }

  return service
}

const registerTerminalIpc = ({ ipcMain, service }) => {
  ipcMain.handle('terminal:get-status', () => service.getStatus())
  ipcMain.handle('terminal:list-directories', () => service.listDirectories())
  ipcMain.handle('terminal:choose-directory', () => service.chooseDirectory())
  ipcMain.handle('terminal:remove-directory', (_event, directoryId) => service.removeDirectory(directoryId))
  ipcMain.handle('terminal:start', (_event, input) => service.startTerminal(input))
  ipcMain.handle('terminal:write', (_event, terminalId, data) => service.writeTerminal(terminalId, data))
  ipcMain.handle('terminal:resize', (_event, terminalId, cols, rows) => service.resizeTerminal(terminalId, cols, rows))
  ipcMain.handle('terminal:stop', (_event, terminalId) => service.stopTerminal(terminalId))
}

module.exports = {
  createTerminalService,
  registerTerminalIpc,
  directoryIdFromPath,
}

const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const crypto = require('node:crypto')
const { EventEmitter } = require('node:events')
const childProcess = require('node:child_process')

const VALID_ID = /^[a-zA-Z0-9_-]{3,140}$/
const VALID_PERMISSION_RESPONSE = new Set(['once', 'always', 'reject'])
const MAX_TEXT_SIZE = 100_000
const RPC_RESPONSE_TIMEOUT_MS = 30_000
const MAX_STDERR_SIZE = 64_000
const MAX_TERMINAL_REPLAY_SIZE = 200_000
const MAX_TERMINAL_WRITE_SIZE = 100_000
const DEFAULT_TERMINAL_COLS = 80
const DEFAULT_TERMINAL_ROWS = 24
const OPEN_ASS_UI_REQUEST_PREFIX = 'open_ass_ui_'
const OPEN_ASS_SESSION_ID_PREFIX = 'ses_'
const OPEN_PI_REGISTRY_DIR = 'open-pi'
const LEGACY_OPEN_ASS_REGISTRY_DIR = 'open-ass'
const PI_AGENT_DIR_ENV = 'PI_CODING_AGENT_DIR'
const PI_SESSION_DIR_ENV = 'PI_CODING_AGENT_SESSION_DIR'
const PI_TUI_BUILTIN_COMMANDS = [
  { name: 'settings', source: 'builtin', description: 'Open settings menu' },
  { name: 'model', source: 'builtin', description: 'Select model (opens selector UI)' },
  { name: 'scoped-models', source: 'builtin', description: 'Enable/disable models for Ctrl+P cycling' },
  { name: 'export', source: 'builtin', description: 'Export session (HTML default, or specify path: .html/.jsonl)' },
  { name: 'import', source: 'builtin', description: 'Import and resume a session from a JSONL file' },
  { name: 'share', source: 'builtin', description: 'Share session as a secret GitHub gist' },
  { name: 'copy', source: 'builtin', description: 'Copy last agent message to clipboard' },
  { name: 'name', source: 'builtin', description: 'Set session display name' },
  { name: 'session', source: 'builtin', description: 'Show session info and stats' },
  { name: 'changelog', source: 'builtin', description: 'Show changelog entries' },
  { name: 'hotkeys', source: 'builtin', description: 'Show all keyboard shortcuts' },
  { name: 'fork', source: 'builtin', description: 'Create a new fork from a previous user message' },
  { name: 'clone', source: 'builtin', description: 'Duplicate the current session at the current position' },
  { name: 'tree', source: 'builtin', description: 'Navigate session tree (switch branches)' },
  { name: 'login', source: 'builtin', description: 'Configure provider authentication' },
  { name: 'logout', source: 'builtin', description: 'Remove provider authentication' },
  { name: 'new', source: 'builtin', description: 'Start a new session' },
  { name: 'compact', source: 'builtin', description: 'Manually compact the session context' },
  { name: 'resume', source: 'builtin', description: 'Resume a different session' },
  { name: 'reload', source: 'builtin', description: 'Reload keybindings, extensions, skills, prompts, and themes' },
  { name: 'quit', source: 'builtin', description: 'Quit Pi' },
]
const OPEN_ASS_ONLY_COMMANDS = [
  { name: 'todos', source: 'open-pi', description: 'Show the current todo state in the native Open Pi UI.' },
]
const OPEN_ASS_FEATURE_FLAGS = [
  { name: 'subagents', description: 'Parallel subagent delegation (scout/researcher/worker)', default: true, stage: 'experimental' },
  { name: 'memories', description: 'Read and write persistent project memory (MEMORY.md)', default: false, stage: 'experimental' },
  { name: 'websearch', description: 'Search the web via DuckDuckGo (no API key)', default: false, stage: 'experimental' },
  { name: 'unified_exec', description: 'Use unified execution model for bash commands', default: false, stage: 'experimental' },
  { name: 'shell_snapshot', description: 'Snapshot shell environment before each turn', default: false, stage: 'experimental' },
  { name: 'auto_commit', description: 'Automatically git commit after each successful turn', default: false, stage: 'experimental' },
  { name: 'parallel_tools', description: 'Execute independent tool calls in parallel', default: true, stage: 'beta' },
  { name: 'stream_responses', description: 'Stream LLM responses token by token', default: true, stage: 'stable' },
  { name: 'smart_compaction', description: 'Use intelligent compaction heuristic', default: true, stage: 'beta' },
]
const PI_TUI_BUILTIN_COMMAND_NAMES = new Set(PI_TUI_BUILTIN_COMMANDS.map((command) => command.name))
const OPEN_ASS_ONLY_COMMAND_NAMES = new Set(OPEN_ASS_ONLY_COMMANDS.map((command) => command.name))

const nowIso = () => new Date().toISOString()
let tuiIdSequence = 0
const createTuiId = (prefix) => {
  tuiIdSequence = (tuiIdSequence + 1) % Number.MAX_SAFE_INTEGER
  return `${prefix}_${Date.now().toString(36)}${tuiIdSequence.toString(36).padStart(4, '0')}`
}
const createPromptIds = () => ({
  messageID: createTuiId('msg'),
  textPartID: createTuiId('prt'),
})

const expandHomePath = (value, homeDir = os.homedir()) => {
  if (typeof value !== 'string' || value.trim() === '') return value
  if (value === '~') return homeDir
  if (value.startsWith('~/') || value.startsWith('~\\')) return path.join(homeDir, value.slice(2))
  return value
}

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

const featuresFilePath = (cwd) => path.join(cwd, '.pi', 'features.json')

const readFeatureState = (cwd) => {
  const state = readJsonFile(featuresFilePath(cwd), { flags: {} })
  return state && typeof state === 'object' && !Array.isArray(state) && state.flags && typeof state.flags === 'object'
    ? state
    : { flags: {} }
}

const featureEnabled = (feature, state) =>
  typeof state.flags?.[feature.name] === 'boolean' ? state.flags[feature.name] : Boolean(feature.default)

const validateSessionId = (sessionId) => {
  if (typeof sessionId !== 'string' || !VALID_ID.test(sessionId)) {
    throw new Error('Invalid Open Pi session id.')
  }
  return sessionId
}

const sessionIdFromPath = (filePath) => {
  const hash = crypto.createHash('sha256').update(path.resolve(filePath)).digest('hex').slice(0, 32)
  return `${OPEN_ASS_SESSION_ID_PREFIX}${hash}`
}

const encodePiCwd = (cwd) => `--${path.resolve(cwd).replace(/^[/\\]/, '').replace(/[/\\:]/g, '-')}--`

const getPiAgentDir = (env = process.env) => {
  const configured = env[PI_AGENT_DIR_ENV]
  return path.resolve(expandHomePath(configured || path.join(os.homedir(), '.pi', 'agent')))
}

const readPiSettingsSessionDir = (agentDir) => {
  const settings = readJsonFile(path.join(agentDir, 'settings.json'), {})
  const sessionDir = typeof settings?.sessionDir === 'string' ? settings.sessionDir.trim() : ''
  return sessionDir ? path.resolve(expandHomePath(sessionDir)) : undefined
}

const resolvePiSessionDir = (cwd, env = process.env) => {
  const envSessionDir = typeof env[PI_SESSION_DIR_ENV] === 'string' ? env[PI_SESSION_DIR_ENV].trim() : ''
  if (envSessionDir) return path.resolve(expandHomePath(envSessionDir))

  const agentDir = getPiAgentDir(env)
  const settingsSessionDir = readPiSettingsSessionDir(agentDir)
  if (settingsSessionDir) return settingsSessionDir

  return path.join(agentDir, 'sessions', encodePiCwd(cwd))
}

const resolveComparablePath = (value) => {
  const resolved = path.resolve(value)
  try {
    return fs.realpathSync(resolved)
  } catch {
    return resolved
  }
}

const sameResolvedPath = (left, right) => resolveComparablePath(left) === resolveComparablePath(right)

const validateDirectoryPath = (directoryPath) => {
  if (typeof directoryPath !== 'string' || directoryPath.trim() === '') {
    throw new Error('A directory path is required.')
  }

  const resolved = path.resolve(directoryPath)
  if (!fs.existsSync(resolved) || !fs.statSync(resolved).isDirectory()) {
    throw new Error('The selected directory does not exist.')
  }
  return resolved
}

const normalizeRegistryDirectoryPath = (directoryPath) => {
  if (typeof directoryPath !== 'string' || directoryPath.trim() === '') {
    throw new Error('Invalid registry directory path.')
  }
  return path.resolve(directoryPath)
}

const validateText = (value, label = 'Text') => {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`${label} is required.`)
  }
  if (value.length > MAX_TEXT_SIZE) {
    throw new Error(`${label} is too large.`)
  }
  return value
}

const validateCommand = (command) => validateText(command, 'Command')
const validateStreamingBehavior = (behavior) => {
  if (behavior == null) return 'followUp'
  return validateOneOf(behavior, ['steer', 'followUp'], 'Streaming behavior')
}
const validatePromptIds = (promptIds) => {
  const generated = createPromptIds()
  if (promptIds == null) return generated
  if (typeof promptIds !== 'object' || Array.isArray(promptIds)) return generated
  const messageID = typeof promptIds.messageID === 'string' && promptIds.messageID.startsWith('msg_')
    ? promptIds.messageID
    : generated.messageID
  const textPartID = typeof promptIds.textPartID === 'string' && promptIds.textPartID.startsWith('prt_')
    ? promptIds.textPartID
    : generated.textPartID
  return { messageID, textPartID }
}
const buildPromptPayload = (message, behavior, promptIds) => {
  const ids = validatePromptIds(promptIds)
  const text = validateCommand(message)
  return {
    type: 'prompt',
    message: text,
    streamingBehavior: validateStreamingBehavior(behavior),
    messageID: ids.messageID,
    textPartID: ids.textPartID,
    parts: [{ id: ids.textPartID, type: 'text', text }],
  }
}
const validateBoolean = (value, label) => {
  if (typeof value !== 'boolean') throw new Error(`${label} must be true or false.`)
  return value
}

const validatePositiveInteger = (value, label) => {
  const number = Number(value)
  if (!Number.isInteger(number) || number <= 0 || number > 1000) {
    throw new Error(`${label} must be a positive integer.`)
  }
  return number
}

const validateOneOf = (value, allowed, label) => {
  if (!allowed.includes(value)) throw new Error(`${label} is invalid.`)
  return value
}

const validateCreateSessionInput = (input) => {
  if (input == null) return {}
  if (typeof input !== 'object' || Array.isArray(input)) {
    throw new Error('Invalid create session input.')
  }
  const directoryPath = input.directoryPath == null ? undefined : validateDirectoryPath(input.directoryPath)
  const title = input.title == null ? undefined : validateText(input.title, 'Title')
  const agent = input.agent == null ? undefined : validateText(input.agent, 'Agent')
  const model =
    input.model && typeof input.model === 'object' && !Array.isArray(input.model)
      ? {
          providerID: validateText(input.model.providerID, 'Provider id'),
          id: validateText(input.model.id ?? input.model.modelID, 'Model id'),
          variant: input.model.variant == null ? undefined : validateText(input.model.variant, 'Variant'),
        }
      : undefined
  return { directoryPath, title, agent, model }
}

const validateStartTerminalInput = (input) => {
  if (input == null) return {}
  if (typeof input !== 'object' || Array.isArray(input)) {
    throw new Error('Invalid start terminal input.')
  }
  const directoryPath = input.directoryPath == null ? undefined : validateDirectoryPath(input.directoryPath)
  return { directoryPath }
}

const PI_CONFIG_REPO = 'rcsn01/Pi-Config'
const PI_CONFIG_BRANCH = 'main'
const PI_CONFIG_TARBALL_URL = `https://codeload.github.com/${PI_CONFIG_REPO}/tar.gz/${PI_CONFIG_BRANCH}`

const validateInitializePiConfigInput = (input) => {
  if (input == null || typeof input !== 'object' || Array.isArray(input)) {
    throw new Error('Invalid initialise Pi config input.')
  }
  const directoryPath = validateDirectoryPath(input.directoryPath)
  const replace = input.replace === true
  return { directoryPath, replace }
}

const downloadFile = async (url, destination) => {
  if (typeof fetch !== 'function') {
    throw new Error('Network downloads are unavailable in this environment.')
  }
  const response = await fetch(url, { redirect: 'follow' })
  if (!response.ok) {
    throw new Error(`Failed to download Pi config (${response.status}).`)
  }
  const bytes = Buffer.from(await response.arrayBuffer())
  fs.writeFileSync(destination, bytes)
}

const listExtensionPackageDirs = (piPath) => {
  const extensionsRoot = path.join(piPath, 'extensions')
  if (!fs.existsSync(extensionsRoot)) return []

  const packageDirs = []
  for (const entry of fs.readdirSync(extensionsRoot, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue
    const extensionDir = path.join(extensionsRoot, entry.name)
    if (fs.existsSync(path.join(extensionDir, 'package.json'))) {
      packageDirs.push(extensionDir)
    }
  }
  return packageDirs.sort()
}

const resolveNpmCommand = () => {
  const candidates = process.platform === 'win32' ? ['npm.cmd', 'npm'] : ['npm']
  for (const command of candidates) {
    try {
      childProcess.execFileSync(command, ['--version'], { stdio: 'pipe' })
      return command
    } catch {
      // Try the next candidate.
    }
  }
  throw new Error('npm was not found on PATH. Install Node.js to initialise extension dependencies.')
}

const installExtensionDependencies = (piPath) => {
  const packageDirs = listExtensionPackageDirs(piPath)
  if (!packageDirs.length) return []

  const npm = resolveNpmCommand()
  const installed = []
  const failures = []

  for (const extensionDir of packageDirs) {
    try {
      childProcess.execFileSync(npm, ['install', '--omit=dev'], {
        cwd: extensionDir,
        stdio: 'pipe',
        env: {
          ...process.env,
          npm_config_audit: 'false',
          npm_config_fund: 'false',
        },
      })
      installed.push(path.basename(extensionDir))
    } catch (error) {
      failures.push({
        name: path.basename(extensionDir),
        message: error instanceof Error ? error.message : String(error),
      })
    }
  }

  if (failures.length) {
    const summary = failures.map((failure) => failure.name).join(', ')
    throw new Error(
      `Failed to install extension dependencies for: ${summary}. Ensure npm and network access are available.`,
    )
  }

  return installed
}

const installPiConfigFromGitHub = async (directoryPath, options = {}) => {
  const resolvedDirectory = validateDirectoryPath(directoryPath)
  const targetPi = path.join(resolvedDirectory, '.pi')
  if (fs.existsSync(targetPi) && !options.replace) {
    throw new Error('`.pi` already exists in this directory. Remove it first to re-initialise.')
  }

  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'pi-config-install-'))
  const archivePath = path.join(tmpRoot, 'archive.tar.gz')
  const extractRoot = path.join(tmpRoot, 'extract')

  try {
    await downloadFile(PI_CONFIG_TARBALL_URL, archivePath)
    ensureDirectory(extractRoot)
    childProcess.execFileSync('tar', ['-xzf', archivePath, '-C', extractRoot], { stdio: 'pipe' })

    const entries = fs.readdirSync(extractRoot)
    const repoRoot =
      entries.length === 1 && fs.statSync(path.join(extractRoot, entries[0])).isDirectory()
        ? path.join(extractRoot, entries[0])
        : extractRoot
    const sourcePi = path.join(repoRoot, '.pi')
    if (!fs.existsSync(sourcePi) || !fs.statSync(sourcePi).isDirectory()) {
      throw new Error('Downloaded Pi config did not include a `.pi` folder.')
    }

    if (fs.existsSync(targetPi)) {
      fs.rmSync(targetPi, { recursive: true, force: true })
    }
    fs.cpSync(sourcePi, targetPi, { recursive: true })
    const extensionDependenciesInstalled = installExtensionDependencies(targetPi)

    return { directoryPath: resolvedDirectory, piPath: targetPi, extensionDependenciesInstalled }
  } finally {
    fs.rmSync(tmpRoot, { recursive: true, force: true })
  }
}

const validateTerminalId = (terminalId) => {
  if (typeof terminalId !== 'string' || !VALID_ID.test(terminalId) || !terminalId.startsWith('term_')) {
    throw new Error('Invalid Open Pi terminal id.')
  }
  return terminalId
}

const validateTerminalWriteData = (data) => {
  if (typeof data !== 'string') throw new Error('Terminal input must be text.')
  if (data.length > MAX_TERMINAL_WRITE_SIZE) throw new Error('Terminal input is too large.')
  return data
}

const validateTerminalDimension = (value, label) => {
  const number = Number(value)
  if (!Number.isInteger(number) || number < 2 || number > 500) {
    throw new Error(`${label} must be between 2 and 500.`)
  }
  return number
}

const validateObject = (value, label) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`${label} is invalid.`)
  return value
}

const parseEnvOutput = (output) => {
  if (typeof output !== 'string') return {}
  return output.split(/\r?\n/).reduce((parsed, line) => {
    const separator = line.indexOf('=')
    if (separator <= 0) return parsed
    parsed[line.slice(0, separator)] = line.slice(separator + 1)
    return parsed
  }, {})
}

const loadLoginShellEnv = (env = process.env, spawnSync = childProcess.spawnSync) => {
  if (env.OPEN_PI_DISABLE_SHELL_ENV === '1' || env.OPENASS_DISABLE_SHELL_ENV === '1' || process.platform === 'win32') return {}
  const shell = env.SHELL || '/bin/zsh'
  try {
    const result = spawnSync(shell, ['-lc', 'env'], {
      encoding: 'utf8',
      env,
      timeout: 5000,
    })
    if (result.error || result.status !== 0) return {}
    return parseEnvOutput(result.stdout)
  } catch {
    return {}
  }
}

const buildPiRuntimeEnv = (env = process.env, spawnSync = childProcess.spawnSync) => ({
  ...env,
  ...loadLoginShellEnv(env, spawnSync),
  OPENCODE_CLIENT: env.OPENCODE_CLIENT ?? 'desktop',
})

const sanitizeSession = (session, fallbackDirectoryPath) => {
  const directoryPath = normalizeRegistryDirectoryPath(session.directoryPath ?? fallbackDirectoryPath)
  const id = validateSessionId(session.id)
  return {
    id,
    directoryPath,
    piSessionId: typeof session.piSessionId === 'string' ? session.piSessionId : id,
    piSessionFile: typeof session.piSessionFile === 'string' ? session.piSessionFile : undefined,
    firstMessage: typeof session.firstMessage === 'string' ? session.firstMessage : undefined,
    messageCount: typeof session.messageCount === 'number' ? session.messageCount : undefined,
    parentSessionPath: typeof session.parentSessionPath === 'string' ? session.parentSessionPath : undefined,
    displayName: String(session.displayName || session.title || path.basename(directoryPath) || directoryPath),
    title: session.title == null ? undefined : String(session.title),
    createdAt: typeof session.createdAt === 'string' ? session.createdAt : nowIso(),
    updatedAt: typeof session.updatedAt === 'string' ? session.updatedAt : nowIso(),
    status: ['closed', 'starting', 'running', 'error'].includes(session.status) ? session.status : 'closed',
    model: typeof session.model === 'string' ? session.model : undefined,
    agent: typeof session.agent === 'string' ? session.agent : undefined,
    shareUrl: typeof session.shareUrl === 'string' ? session.shareUrl : undefined,
    lastError: typeof session.lastError === 'string' ? session.lastError : undefined,
  }
}

const isUsablePiSessionFile = (filePath) => {
  if (typeof filePath !== 'string' || !filePath.endsWith('.jsonl')) return false
  try {
    return fs.existsSync(filePath) && fs.statSync(filePath).isFile()
  } catch {
    return false
  }
}

const readJsonLines = (filePath) => {
  const content = fs.readFileSync(filePath, 'utf8')
  return content
    .trim()
    .split('\n')
    .filter((line) => line.trim() !== '')
    .flatMap((line) => {
      try {
        return [JSON.parse(line)]
      } catch {
        return []
      }
    })
}

const messageActivityTime = (entry) => {
  if (entry?.type !== 'message') return undefined
  const role = entry.message?.role
  if (role !== 'user' && role !== 'assistant') return undefined
  const messageTimestamp = entry.message?.timestamp
  if (typeof messageTimestamp === 'number' && Number.isFinite(messageTimestamp)) return messageTimestamp
  const entryTimestamp = Date.parse(entry.timestamp)
  return Number.isNaN(entryTimestamp) ? undefined : entryTimestamp
}

const parsePiSessionFile = (filePath, projectDirectoryPath) => {
  try {
    if (!isUsablePiSessionFile(filePath)) return null
    const entries = readJsonLines(filePath)
    if (!entries.length || entries[0]?.type !== 'session') return null
    const header = entries[0]
    if (typeof header.cwd !== 'string' || !sameResolvedPath(header.cwd, projectDirectoryPath)) return null

    const stats = fs.statSync(filePath)
    let latestName
    let firstMessage
    let messageCount = 0
    let latestActivityTime

    for (const entry of entries) {
      if (entry?.type === 'session_info') latestName = entry.name?.trim() || undefined
      if (entry?.type !== 'message') {
        continue
      }

      messageCount++
      const activityTime = messageActivityTime(entry)
      if (typeof activityTime === 'number') latestActivityTime = Math.max(latestActivityTime ?? 0, activityTime)

      if (firstMessage || entry.message?.role !== 'user') continue
      const text = contentToText(entry.message?.content ?? entry.message?.text ?? entry.message?.message).replace(/\s+/g, ' ').trim()
      if (text) firstMessage = text
    }

    const createdAt = typeof header.timestamp === 'string' && !Number.isNaN(Date.parse(header.timestamp))
      ? new Date(header.timestamp).toISOString()
      : stats.birthtime.toISOString()
    const updatedAt = latestActivityTime
      ? new Date(latestActivityTime).toISOString()
      : createdAt

    return sanitizeSession({
      id: sessionIdFromPath(filePath),
      directoryPath: header.cwd,
      piSessionId: typeof header.id === 'string' ? header.id : sessionIdFromPath(filePath),
      piSessionFile: path.resolve(filePath),
      displayName: latestName || firstMessage || header.id || path.basename(filePath, '.jsonl'),
      title: latestName,
      firstMessage,
      messageCount,
      parentSessionPath: typeof header.parentSession === 'string' ? header.parentSession : undefined,
      createdAt,
      updatedAt,
      status: 'closed',
    })
  } catch {
    return null
  }
}

const scanPiSessionsForProject = (projectDirectoryPath, env = process.env) => {
  const directoryPath = validateDirectoryPath(projectDirectoryPath)
  const sessionDirectory = resolvePiSessionDir(directoryPath, env)
  let entries
  try {
    entries = fs.readdirSync(sessionDirectory, { withFileTypes: true })
  } catch {
    return []
  }

  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith('.jsonl'))
    .map((entry) => parsePiSessionFile(path.join(sessionDirectory, entry.name), directoryPath))
    .filter(Boolean)
    .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))
}

const contentToText = (content) => {
  if (content == null) return ''
  if (typeof content === 'string') return content
  if (Array.isArray(content)) return content.map(contentToText).filter(Boolean).join('')
  if (typeof content === 'object') {
    if (typeof content.text === 'string') return content.text
    if (typeof content.content === 'string') return content.content
    if (Array.isArray(content.content)) return contentToText(content.content)
    if (typeof content.value === 'string') return content.value
  }
  return ''
}

const normalizePartId = (part, messageId, index, type) => {
  if (part && typeof part === 'object' && !Array.isArray(part)) {
    const explicit = part.id ?? part.partId ?? part.partID
    if (explicit != null) return String(explicit)
    if (type === 'toolCall' && (part.toolCallId ?? part.toolCallID) != null) return String(part.toolCallId ?? part.toolCallID)
  }
  return `${messageId}:part:${index}`
}

const normalizeMessagePart = (part, index = 0, messageId = `msg-${index}`) => {
  if (part == null) return null
  if (typeof part === 'string') {
    return { id: `${messageId}:part:${index}`, messageId, type: 'text', text: part, raw: part }
  }
  if (typeof part !== 'object' || Array.isArray(part)) {
    return { id: `${messageId}:part:${index}`, messageId, type: 'unknown', label: 'value', value: part, raw: part }
  }

  const type = String(part.type ?? part.kind ?? '')
  if (type === 'text' || typeof part.text === 'string') {
    return {
      id: normalizePartId(part, messageId, index, 'text'),
      messageId,
      type: 'text',
      text: String(part.text ?? part.content ?? ''),
      raw: part,
    }
  }
  if (type === 'thinking' || type === 'reasoning') {
    return {
      id: normalizePartId(part, messageId, index, 'thinking'),
      messageId,
      type: 'thinking',
      text: String(part.text ?? part.content ?? part.delta ?? ''),
      raw: part,
    }
  }
  if (type === 'toolCall' || type === 'tool_call') {
    const id = normalizePartId(part, messageId, index, 'toolCall')
    return {
      id,
      messageId,
      type: 'toolCall',
      toolCallId: String(part.toolCallId ?? part.toolCallID ?? id),
      name: String(part.name ?? part.toolName ?? part.tool ?? 'tool'),
      arguments: part.arguments ?? part.args ?? part.input,
      status: typeof part.status === 'string' ? part.status : undefined,
      raw: part,
    }
  }
  if (type === 'image' || type === 'image_url' || typeof part.image === 'string' || typeof part.url === 'string') {
    return {
      id: normalizePartId(part, messageId, index, 'image'),
      messageId,
      type: 'image',
      url: typeof part.url === 'string' ? part.url : typeof part.image === 'string' ? part.image : undefined,
      data: typeof part.data === 'string' ? part.data : undefined,
      mimeType: typeof part.mimeType === 'string' ? part.mimeType : typeof part.mediaType === 'string' ? part.mediaType : undefined,
      alt: typeof part.alt === 'string' ? part.alt : undefined,
      raw: part,
    }
  }
  return {
    id: normalizePartId(part, messageId, index, type || 'unknown'),
    messageId,
    type: 'unknown',
    label: type || 'part',
    value: part,
    raw: part,
  }
}

const normalizeMessageParts = (content, messageId) => {
  if (content == null) return undefined
  const parts = (Array.isArray(content) ? content : [content])
    .map((part, index) => normalizeMessagePart(part, index, messageId))
    .filter(Boolean)
  return parts.length ? parts : undefined
}

const messageRole = (message) => {
  if (typeof message?.role === 'string' && message.role.trim()) return message.role
  return 'user'
}

const normalizeTimestamp = (value) => {
  if (typeof value === 'string' && value.trim()) return value
  if (typeof value === 'number' && Number.isFinite(value)) {
    const millis = value < 1_000_000_000_000 ? value * 1000 : value
    return new Date(millis).toISOString()
  }
  return undefined
}

const stableMessageId = (message) => {
  const id = message?.id ?? message?.entryId ?? message?.messageId ?? message?.messageID ?? message?.info?.id
  return id == null || String(id).trim() === '' ? null : String(id)
}

const stableParentMessageId = (message) => {
  const id = message?.parentMessageId
    ?? message?.parentMessageID
    ?? message?.parentId
    ?? message?.parentID
    ?? message?.info?.parentMessageId
    ?? message?.info?.parentMessageID
    ?? message?.info?.parentId
    ?? message?.info?.parentID
  return id == null || String(id).trim() === '' ? undefined : String(id)
}

const normalizeMessageRecord = (message, index = 0) => {
  const id = stableMessageId(message)
  if (!id) return null
  const nestedMessage = message?.type === 'message' && message?.message && typeof message.message === 'object' && !Array.isArray(message.message)
    ? message.message
    : null
  const messageData = nestedMessage ?? message
  const role = messageRole(messageData)
  const content = messageData && typeof messageData === 'object'
    ? Object.prototype.hasOwnProperty.call(messageData, 'content')
      ? messageData.content
      : Object.prototype.hasOwnProperty.call(messageData, 'text')
        ? messageData.text
        : Object.prototype.hasOwnProperty.call(messageData, 'message')
          ? messageData.message
          : ''
    : messageData
  return {
    id,
    role,
    content: contentToText(content),
    createdAt: normalizeTimestamp(message?.timestamp ?? messageData?.createdAt ?? messageData?.timestamp ?? message?.createdAt),
    status: messageData?.stopReason === 'error' ? 'error' : messageData?.stopReason === 'aborted' ? 'error' : 'complete',
    parentMessageId: stableParentMessageId(message),
    raw: message,
    parts: normalizeMessageParts(content, id),
    toolCallId: (messageData?.toolCallId ?? message?.toolCallId) == null ? undefined : String(messageData?.toolCallId ?? message?.toolCallId),
    toolName: messageData?.toolName == null && messageData?.name == null && messageData?.tool == null && message?.toolName == null && message?.name == null && message?.tool == null
      ? undefined
      : String(messageData?.toolName ?? messageData?.name ?? messageData?.tool ?? message?.toolName ?? message?.name ?? message?.tool),
    details: messageData?.details ?? messageData?.result?.details ?? message?.details ?? message?.result?.details,
  }
}

const transcriptInfoFromMessage = (message) => ({
  id: message.id,
  role: message.role,
  content: message.content,
  createdAt: message.createdAt,
  status: message.status,
  parentMessageId: message.parentMessageId,
  raw: message.raw,
  toolCallId: message.toolCallId,
  toolName: message.toolName,
  details: message.details,
})

const transcriptItemFromMessage = (message) => ({
  info: transcriptInfoFromMessage(message),
  parts: Array.isArray(message.parts) ? message.parts : [],
})

const transcriptEventsFromMessage = (sessionId, message) => {
  if (!message) return []
  const item = transcriptItemFromMessage(message)
  return [
    { type: 'transcript_message_upsert', sessionId, info: item.info },
    ...item.parts.map((part) => ({ type: 'transcript_part_upsert', sessionId, part })),
  ]
}

const normalizeTranscriptSnapshot = (messages) =>
  messages.map(normalizeMessageRecord).filter(Boolean).map(transcriptItemFromMessage)

const transcriptItemsFromSessionFile = (filePath) => {
  if (!isUsablePiSessionFile(filePath)) return []
  try {
    return normalizeTranscriptSnapshot(readJsonLines(filePath).filter((entry) => entry?.type === 'message'))
  } catch {
    return []
  }
}

const partIdForDelta = (messageId, assistantEvent, partType) => {
  const part = assistantEvent?.part && typeof assistantEvent.part === 'object' ? assistantEvent.part : {}
  const explicit = assistantEvent?.partId
    ?? assistantEvent?.partID
    ?? part.id
    ?? part.partId
    ?? part.partID
  if (explicit != null) return String(explicit)
  return `${messageId}:${partType}`
}

const getRpcMessagesArray = (payload) => {
  if (Array.isArray(payload)) return payload
  if (Array.isArray(payload?.messages)) return payload.messages
  if (Array.isArray(payload?.items)) return payload.items
  return []
}

const transcriptItemCandidates = (payload) => {
  if (Array.isArray(payload)) return payload
  if (Array.isArray(payload?.items)) return payload.items
  return []
}

const normalizeTranscriptItemRecord = (item) => {
  if (!item || typeof item !== 'object' || Array.isArray(item)) return null
  const info = item.info
  if (!info || typeof info !== 'object' || Array.isArray(info)) return null
  const id = stableMessageId(info)
  if (!id) return null
  const parts = Array.isArray(item.parts)
    ? item.parts.map((part, index) => normalizeMessagePart(part, index, id)).filter(Boolean)
    : []
  const infoTime = info.time && typeof info.time === 'object' && !Array.isArray(info.time) ? info.time : {}
  const content = contentToText(
    info.content
      ?? info.text
      ?? info.message
      ?? parts.filter((part) => part.type === 'text').map((part) => part.text).join(''),
  )
  return {
    info: {
      id,
      role: messageRole(info),
      content,
      createdAt: normalizeTimestamp(info.createdAt ?? info.timestamp ?? infoTime.created ?? infoTime.completed),
      status: info.stopReason === 'error' || info.stopReason === 'aborted' ? 'error' : typeof info.status === 'string' ? info.status : 'complete',
      parentMessageId: stableParentMessageId(info),
      raw: info.raw ?? info,
      toolCallId: info.toolCallId == null && info.toolCallID == null ? undefined : String(info.toolCallId ?? info.toolCallID),
      toolName: info.toolName == null && info.name == null && info.tool == null
        ? undefined
        : String(info.toolName ?? info.name ?? info.tool),
      details: info.details ?? info.result?.details,
    },
    parts,
  }
}

const normalizeTranscriptPagePayload = (payload, options = {}) => {
  const rawItems = transcriptItemCandidates(payload).map(normalizeTranscriptItemRecord).filter(Boolean)
  const items = rawItems.length ? rawItems : normalizeTranscriptSnapshot(getRpcMessagesArray(payload))
  const isObjectPayload = payload && typeof payload === 'object' && !Array.isArray(payload)
  const hasPageMetadata = isObjectPayload && (
    Object.prototype.hasOwnProperty.call(payload, 'cursor') ||
    Object.prototype.hasOwnProperty.call(payload, 'complete') ||
    Object.prototype.hasOwnProperty.call(payload, 'hasMore')
  )
  const cursor = hasPageMetadata && payload.cursor != null ? String(payload.cursor) : undefined
  const complete = hasPageMetadata
    ? typeof payload.complete === 'boolean'
      ? payload.complete
      : typeof payload.hasMore === 'boolean'
        ? !payload.hasMore
        : !cursor
    : true
  return {
    items,
    cursor,
    complete,
    mode: options.before && hasPageMetadata ? 'prepend' : 'replace',
  }
}

const normalizeTodoStatus = (value, fallback) => {
  const status = String(value ?? fallback ?? 'pending')
  return ['pending', 'in_progress', 'completed', 'cancelled'].includes(status) ? status : 'pending'
}

const normalizeTodoDetails = (details) => {
  const items = Array.isArray(details?.todos) ? details.todos : null
  if (!items) return null
  return items.map((item, index) => {
    const record = item && typeof item === 'object' && !Array.isArray(item) ? item : { text: item }
    return {
      id: String(record.id ?? index + 1),
      content: String(record.content ?? record.text ?? record.title ?? ''),
      status: normalizeTodoStatus(record.status, typeof record.done === 'boolean' ? (record.done ? 'completed' : 'pending') : undefined),
      explanation: typeof record.explanation === 'string' ? record.explanation : undefined,
    }
  }).filter((todo) => todo.content.trim() !== '')
}

const todosFromToolResult = (result) => {
  const toolName = String(result?.toolName ?? result?.name ?? result?.tool ?? '')
  if (toolName !== 'todo') return null
  return normalizeTodoDetails(result?.details ?? result?.result?.details)
}

const extractLatestTodosFromMessages = (messages) => {
  let latest = null
  for (const message of Array.isArray(messages) ? messages : []) {
    const toolName = String(message?.toolName ?? message?.name ?? message?.tool ?? '')
    const role = message?.role
    if (role !== 'toolResult' && role !== 'tool' && toolName !== 'todo') continue
    const todos = todosFromToolResult(message)
    if (todos) latest = todos
  }
  return latest
}

const normalizeQueueItem = (item, index) => {
  if (typeof item === 'string') {
    const content = item.trim()
    return content ? { content } : null
  }
  if (!item || typeof item !== 'object' || Array.isArray(item)) return null
  const content = String(item.content ?? item.text ?? item.message ?? '').trim()
  if (!content) return null
  return {
    id: item.id == null ? undefined : String(item.id),
    content,
    createdAt: typeof item.createdAt === 'string' ? item.createdAt : typeof item.timestamp === 'string' ? item.timestamp : undefined,
  }
}

const normalizeQueueItems = (items) =>
  (Array.isArray(items) ? items : []).map(normalizeQueueItem).filter(Boolean)

const buildSteerQueueState = ({ active, queuedCount = 0 } = {}) => ({
  active: Boolean(active),
  queuedCount,
  canSteer: Boolean(active),
  canQueue: Boolean(active),
  hint: active ? 'Enter steers the active turn. Tab queues a follow-up.' : '',
})

const normalizePiEvent = (sessionId, event, knownPartIds) => {
  if (!event || typeof event !== 'object') return []

  const eventMessageId = (assistantEvent = {}) => {
    const id = event.message?.id
      ?? event.messageId
      ?? event.messageID
      ?? assistantEvent.messageId
      ?? assistantEvent.messageID
      ?? assistantEvent.part?.messageId
      ?? assistantEvent.part?.messageID
    return id == null ? undefined : String(id)
  }

  if (event.type === 'agent_start') {
    return [
      { type: 'status', sessionId, status: 'running' },
      { type: 'metadata', sessionId, metadata: { steerQueue: buildSteerQueueState({ active: true }) } },
    ]
  }

  if (event.type === 'agent_end') {
    const todos = extractLatestTodosFromMessages(event.messages)
    return [
      ...(todos ? [{ type: 'todos', sessionId, todos }] : []),
      { type: 'metadata', sessionId, metadata: { steerQueue: buildSteerQueueState({ active: false }) } },
      { type: 'status', sessionId, status: 'running' },
    ]
  }

  if (event.type === 'message_start' || event.type === 'message_end') {
    return event.message ? transcriptEventsFromMessage(sessionId, normalizeMessageRecord(event.message)) : []
  }

  if (event.type === 'turn_end') {
    const events = []
    if (event.message) events.push(...transcriptEventsFromMessage(sessionId, normalizeMessageRecord(event.message)))
    for (const result of Array.isArray(event.toolResults) ? event.toolResults : []) {
      const todos = todosFromToolResult(result)
      if (todos) events.push({ type: 'todos', sessionId, todos })
      events.push({
        type: 'tool',
        sessionId,
        tool: {
          id: String(result.toolCallId ?? result.id ?? crypto.randomUUID()),
          name: String(result.toolName ?? 'tool'),
          status: result.isError ? 'error' : 'complete',
          summary: contentToText(result.content ?? result.result),
          createdAt: nowIso(),
        },
      })
    }
    return events
  }

  if (event.type === 'message_update') {
    const assistantEvent = event.assistantMessageEvent ?? {}
    const events = []
    const messageId = eventMessageId(assistantEvent)
    const message = event.message ? normalizeMessageRecord(event.message) : null
    if (message) events.push({ type: 'transcript_message_upsert', sessionId, info: transcriptInfoFromMessage(message) })

    if (assistantEvent.type === 'text_delta' || assistantEvent.type === 'thinking_delta') {
      const delta = String(assistantEvent.delta ?? '')
      const partType = assistantEvent.type === 'text_delta' ? 'text' : 'thinking'
      if (!messageId) {
        events.push({
          type: 'transcript_unkeyed_delta',
          sessionId,
          content: delta,
          partType,
          raw: assistantEvent,
        })
      } else {
        const partId = partIdForDelta(messageId, assistantEvent, partType)
        if (!knownPartIds || !knownPartIds.has(`${messageId}:${partId}`)) {
          events.push({
            type: 'transcript_part_upsert',
            sessionId,
            part: {
              id: partId,
              messageId,
              type: partType,
              text: '',
              raw: assistantEvent,
            },
          })
          knownPartIds?.add(`${messageId}:${partId}`)
        }
        events.push({
          type: 'transcript_part_delta',
          sessionId,
          messageId,
          partId,
          partType,
          delta,
          raw: assistantEvent,
        })
      }
    } else if (assistantEvent.type === 'toolcall_start' || assistantEvent.type === 'toolcall_end') {
      const toolCall = assistantEvent.toolCall ?? {}
      const toolCallId = String(toolCall.id ?? assistantEvent.id ?? crypto.randomUUID())
      const toolName = String(toolCall.name ?? assistantEvent.name ?? 'tool')
      const toolArgs = toolCall.arguments ?? assistantEvent.arguments ?? assistantEvent.args
      if (!messageId) {
        events.push({
          type: 'transcript_unkeyed_delta',
          sessionId,
          content: toolName,
          partType: 'toolCall',
          part: {
            type: 'toolCall',
            id: toolCallId,
            name: toolName,
            arguments: toolArgs,
            status: assistantEvent.type === 'toolcall_end' ? 'complete' : 'running',
            raw: assistantEvent,
          },
          raw: assistantEvent,
        })
      } else {
        events.push({
          type: 'transcript_part_upsert',
          sessionId,
          part: {
            id: toolCallId,
            messageId,
            type: 'toolCall',
            toolCallId,
            name: toolName,
            arguments: toolArgs,
            status: assistantEvent.type === 'toolcall_end' ? 'complete' : 'running',
            raw: assistantEvent,
          },
        })
      }
    } else if (assistantEvent.type === 'error') {
      events.push({ type: 'error', sessionId, error: String(assistantEvent.error ?? assistantEvent.reason ?? 'Pi agent error') })
    }
    return events
  }

  if (event.type === 'tool_execution_start' || event.type === 'tool_execution_update' || event.type === 'tool_execution_end') {
    const events = [
      {
        type: 'tool',
        sessionId,
        tool: {
          id: String(event.toolCallId ?? crypto.randomUUID()),
          name: String(event.toolName ?? 'tool'),
          status: event.type === 'tool_execution_end' ? (event.isError ? 'error' : 'complete') : 'running',
          summary: contentToText(event.partialResult?.content ?? event.result?.content ?? event.args),
          createdAt: nowIso(),
        },
      },
    ]
    if (event.type === 'tool_execution_end') {
      const todos = todosFromToolResult(event)
      if (todos) events.push({ type: 'todos', sessionId, todos })
    }
    return events
  }

  if (event.type === 'queue_update') {
    const steering = normalizeQueueItems(event.steering)
    const followUp = normalizeQueueItems(event.followUp)
    const queuedCount = steering.length + followUp.length
    const active = event.active === false
      ? false
      : Boolean(event.active ?? event.agentActive ?? event.streaming ?? event.isStreaming ?? true)
    return [
      {
        type: 'metadata',
        sessionId,
        metadata: {
          queue: {
            steering,
            followUp,
          },
          steerQueue: buildSteerQueueState({ active, queuedCount }),
        },
      },
    ]
  }

  if (event.type === 'compaction_start' || event.type === 'compaction_end') {
    return [{ type: 'metadata', sessionId, metadata: { compaction: event } }]
  }

  if (event.type === 'extension_ui_request') {
    const dialogRequest = normalizeExtensionUiRequest(event)
    if (dialogRequest) return [{ type: 'extension_ui', sessionId, request: dialogRequest }]
    return [{ type: 'metadata', sessionId, metadata: normalizeExtensionUiMetadata(event) }]
  }

  if (event.type === 'extension_error') {
    return [{ type: 'error', sessionId, error: `${event.extensionPath ?? 'Extension'}: ${event.error ?? 'Extension error'}` }]
  }

  return [{ type: 'sdk_event', sessionId, event }]
}

const modelLabelFromState = (state) =>
  state?.model
    ? `${state.model.provider ?? state.model.providerID ?? state.model.providerName ?? ''}/${state.model.id ?? state.model.modelId ?? state.model.modelID ?? ''}`.replace(/^\/|\/$/g, '')
    : undefined

const modelProviderFromRecord = (model) =>
  String(model?.provider ?? model?.providerID ?? model?.providerId ?? model?.providerName ?? '').trim()

const modelIdFromRecord = (model) =>
  String(model?.id ?? model?.modelID ?? model?.modelId ?? '').trim()

const modelSelectionValue = (provider, modelId) => JSON.stringify({ provider, modelId })

const parseModelSelectionValue = (value) => {
  if (typeof value !== 'string') throw new Error('Model selection is invalid.')
  if (value.trim().startsWith('{')) {
    try {
      const parsed = JSON.parse(value)
      return {
        provider: validateText(parsed.provider, 'Provider'),
        modelId: validateText(parsed.modelId, 'Model'),
      }
    } catch {
      throw new Error('Model selection is invalid.')
    }
  }
  const separator = value.indexOf('/')
  const provider = separator === -1 ? '' : value.slice(0, separator).trim()
  const modelId = separator === -1 ? '' : value.slice(separator + 1).trim()
  return {
    provider: validateText(provider, 'Provider'),
    modelId: validateText(modelId, 'Model'),
  }
}

const normalizeModelSelectOptions = (models) => {
  const items = Array.isArray(models?.models) ? models.models : Array.isArray(models) ? models : []
  return items.flatMap((model) => {
    const provider = modelProviderFromRecord(model)
    const modelId = modelIdFromRecord(model)
    if (!provider || !modelId) return []
    return [{
      label: modelLabelFromState({ model }) || `${provider}/${modelId}`,
      value: modelSelectionValue(provider, modelId),
    }]
  })
}

const formatValue = (value) => {
  if (value == null || value === '') return 'n/a'
  if (typeof value === 'boolean') return value ? 'yes' : 'no'
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

const formatSessionResult = (state, stats) => {
  const lines = [
    'Session',
    `Name: ${formatValue(state?.sessionName)}`,
    `Pi session: ${formatValue(state?.sessionId)}`,
    `File: ${formatValue(state?.sessionFile)}`,
    `Model: ${formatValue(modelLabelFromState(state))}`,
    `Streaming: ${formatValue(state?.isStreaming)}`,
    `Compacting: ${formatValue(state?.isCompacting)}`,
    `Messages: ${formatValue(state?.messageCount ?? stats?.totalMessages)}`,
    `Pending messages: ${formatValue(state?.pendingMessageCount)}`,
  ]

  if (stats && typeof stats === 'object') {
    for (const [key, value] of Object.entries(stats)) {
      if (key === 'totalMessages') continue
      lines.push(`${key}: ${formatValue(value)}`)
    }
  }

  return lines.join('\n')
}

const formatUnsupportedBuiltinCommandMessage = (commandName) => {
  const command = PI_TUI_BUILTIN_COMMANDS.find((item) => item.name === commandName) ?? OPEN_ASS_ONLY_COMMANDS.find((item) => item.name === commandName)
  const description = command?.description ? ` Pi TUI uses it to: ${command.description}.` : ''
  return `/${commandName} is a Pi TUI built-in command, but Open Pi does not expose that TUI workflow yet.${description}`
}

const formatOpenAssFallbackPanelMessage = (commandName) => {
  const command = PI_TUI_BUILTIN_COMMANDS.find((item) => item.name === commandName)
  const description = command?.description ? `\n\nPi TUI behavior: ${command.description}.` : ''
  return `/${commandName} is handled inside Open Pi for this session.${description}\n\nUse the Session sidebar and Runtime controls for the Open Pi-native workflow.`
}

const formatHotkeysMessage = () => [
  'Hotkeys',
  'Enter: send',
  'Shift+Enter: newline',
  'Tab during an active turn: queue a follow-up',
  '/: open slash command autocomplete',
  'Arrow Up/Down: move through slash commands or picker options',
  'Escape: dismiss autocomplete or cancel a picker',
].join('\n')

const formatChangelogMessage = () => [
  'Changelog',
  'Open Pi now handles Pi built-in slash commands natively where Pi RPC exposes the behavior.',
  'Extension, prompt, and skill commands still execute through Pi unchanged.',
  'Extension UI requests are rendered with Open Pi pickers and dialogs.',
].join('\n')

const formatSettingsMessage = (state) => [
  'Settings',
  `Model: ${formatValue(modelLabelFromState(state))}`,
  `Thinking: ${formatValue(state?.thinkingLevel)}`,
  `Steering: ${formatValue(state?.steeringMode)}`,
  `Follow-up: ${formatValue(state?.followUpMode)}`,
  `Auto compaction: ${formatValue(state?.autoCompactionEnabled)}`,
  `Auto retry: ${formatValue(state?.autoRetryEnabled)}`,
  '',
  'Use the Runtime controls sidebar to change these settings.',
].join('\n')

const getDefaultClipboard = () => {
  if (!process.versions.electron) return null
  try {
    return require('electron')?.clipboard ?? null
  } catch {
    return null
  }
}

const getDefaultPtySpawn = () => {
  try {
    return require('node-pty').spawn
  } catch {
    return null
  }
}

const getCommandItems = (commands) => (
  Array.isArray(commands?.commands) ? commands.commands : Array.isArray(commands) ? commands : []
)

const getCommandName = (command) => {
  const name = typeof command === 'string' ? command : command?.name
  return typeof name === 'string' ? name.replace(/^\//, '').trim() : ''
}

const normalizeCommandList = (commands) => {
  const items = getCommandItems(commands)
  const normalized = []
  const seen = new Set()

  for (const command of [...PI_TUI_BUILTIN_COMMANDS, ...OPEN_ASS_ONLY_COMMANDS, ...items]) {
    const record = typeof command === 'string' ? { name: command } : command
    const name = getCommandName(record)
    if (!name) continue
    const source = typeof record.source === 'string' ? record.source : 'prompt'
    if (seen.has(name)) continue
    seen.add(name)
    normalized.push({
      ...record,
      name,
      source,
      description: typeof record.description === 'string' ? record.description : undefined,
    })
  }

  return normalized
}

const hasPiCommand = (commands, commandName) => {
  return getCommandItems(commands).some((command) => getCommandName(command) === commandName)
}

const normalizeExtensionUiRequest = (request) => {
  const method = String(request.method ?? 'notify')
  const normalizeOption = (option) => {
    if (typeof option === 'string') return { label: option, value: option }
    return {
      label: String(option.label ?? option.value ?? option),
      value: String(option.value ?? option.label ?? option),
      description: typeof option.description === 'string' ? option.description : undefined,
      checked: typeof option.checked === 'boolean' ? option.checked : undefined,
      disabled: typeof option.disabled === 'boolean' ? option.disabled : undefined,
    }
  }
  const options = Array.isArray(request.options) ? request.options.map(normalizeOption) : []
  if (method === 'select') {
    return { id: request.id, type: 'select', title: request.title, message: request.message, options }
  }
  if (method === 'optionList' || method === 'checklist') {
    const selectionMode = method === 'checklist' ? 'multiple' : request.selectionMode === 'multiple' ? 'multiple' : 'single'
    return { id: request.id, type: 'option-list', title: request.title, message: request.message, selectionMode, options }
  }
  if (method === 'confirm') return { id: request.id, type: 'confirm', title: request.title, message: request.message }
  if (method === 'input') return { id: request.id, type: 'input', title: request.title, placeholder: request.placeholder }
  if (method === 'editor') return { id: request.id, type: 'editor', title: request.title, value: request.prefill ?? request.value }
  return null
}

const normalizeExtensionUiMetadata = (request) => {
  const method = String(request.method ?? 'notify')
  if (method === 'setStatus') {
    const key = String(request.statusKey ?? 'default')
    return { extensionStatuses: { [key]: request.statusText ?? '' } }
  }
  if (method === 'setWidget') {
    const key = String(request.widgetKey ?? 'default')
    if (key === 'todo-list') return {}
    const rawLines = request.widgetLines ?? request.lines ?? request.content ?? request.widgetContent
    const lines = Array.isArray(rawLines)
      ? rawLines.map(String)
      : typeof rawLines === 'string'
        ? rawLines.split(/\r?\n/)
        : []
    return {
      extensionWidgets: {
        [key]: {
          lines,
          placement: request.widgetPlacement,
        },
      },
    }
  }
  if (method === 'setTitle') return { extensionTitle: request.title ?? '' }
  if (method === 'set_editor_text') return { editorText: request.text ?? '' }
  if (method === 'notify') {
    return {
      extensionNotification: {
        id: request.id,
        message: request.message,
        type: request.notifyType,
      },
    }
  }
  return { extensionUi: { id: request.id, method, ...request } }
}

const createAssistantService = ({
  userDataPath,
  appDataPath,
  spawn = childProcess.spawn,
  ptySpawn = getDefaultPtySpawn(),
  spawnSync = childProcess.spawnSync,
  chooseDirectory = async () => null,
  clipboard = getDefaultClipboard(),
  env = process.env,
} = {}) => {
  if (!userDataPath) throw new Error('userDataPath is required.')

  const emitter = new EventEmitter()
  const rootDir = path.join(userDataPath, OPEN_PI_REGISTRY_DIR)
  const registryPath = path.join(rootDir, 'sessions.json')
  const legacyRegistryPath = path.join(appDataPath || path.dirname(userDataPath), 'OpenSe', LEGACY_OPEN_ASS_REGISTRY_DIR, 'sessions.json')
  const runtimeEnv = buildPiRuntimeEnv(env, spawnSync)
  const processes = new Map()
  const terminalProcesses = new Map()
  const terminalProcessesByDirectory = new Map()
  const runtimeSessions = new Map()
  const pendingOpenAssUiRequests = new Map()

  const migrateLegacyRegistry = () => {
    if (fs.existsSync(registryPath) || !fs.existsSync(legacyRegistryPath)) return

    const sessions = readJsonFile(legacyRegistryPath, [])
    if (!Array.isArray(sessions)) return
    writeJsonFile(registryPath, sessions)
  }

  migrateLegacyRegistry()

  const readRegistry = () => {
    const sessions = readJsonFile(registryPath, [])
    const runtime = Array.from(runtimeSessions.values())
    if (!Array.isArray(sessions)) return []
    return [...runtime, ...sessions].filter((session) => {
      try {
        sanitizeSession(session)
        return true
      } catch {
        return false
      }
    })
  }

  const readRegisteredProjects = () => {
    const seen = new Set()
    const projects = []
    const registry = readJsonFile(registryPath, [])
    for (const item of Array.isArray(registry) ? registry : []) {
      const rawDirectoryPath = item?.directoryPath
      if (typeof rawDirectoryPath !== 'string' || rawDirectoryPath.trim() === '') continue
      const directoryPath = path.resolve(rawDirectoryPath)
      if (seen.has(directoryPath)) continue
      seen.add(directoryPath)
      projects.push({
        directoryPath,
        createdAt: typeof item.createdAt === 'string' ? item.createdAt : nowIso(),
        updatedAt: typeof item.updatedAt === 'string' ? item.updatedAt : nowIso(),
      })
    }
    return projects
  }

  const writeProjectRegistry = (projects) => {
    const seen = new Set()
    const normalized = []
    for (const project of projects) {
      const directoryPath = normalizeRegistryDirectoryPath(project.directoryPath)
      if (seen.has(directoryPath)) continue
      seen.add(directoryPath)
      normalized.push({
        directoryPath,
        createdAt: typeof project.createdAt === 'string' ? project.createdAt : nowIso(),
        updatedAt: typeof project.updatedAt === 'string' ? project.updatedAt : nowIso(),
      })
    }
    writeJsonFile(registryPath, normalized)
  }

  const registerProject = (directoryPath) => {
    const resolvedDirectory = validateDirectoryPath(directoryPath)
    const projects = readRegisteredProjects()
    const existing = projects.find((project) => project.directoryPath === resolvedDirectory)
    if (existing) {
      writeProjectRegistry(projects.map((project) =>
        project.directoryPath === resolvedDirectory ? { ...project, updatedAt: nowIso() } : project,
      ))
      return existing
    }
    const project = { directoryPath: resolvedDirectory, createdAt: nowIso(), updatedAt: nowIso() }
    writeProjectRegistry([project, ...projects])
    return project
  }

  const migrateRegistrySessions = () => {
    const registry = readJsonFile(registryPath, [])
    if (!Array.isArray(registry)) return
    let shouldRewriteProjects = false

    for (const entry of registry) {
      let session
      try {
        session = sanitizeSession(entry)
      } catch {
        continue
      }

      registerProject(session.directoryPath)
      if (!isUsablePiSessionFile(session.piSessionFile)) {
        runtimeSessions.set(session.id, session)
        continue
      }

      const targetDir = resolvePiSessionDir(session.directoryPath, runtimeEnv)
      const targetPath = path.join(targetDir, path.basename(session.piSessionFile))
      if (sameResolvedPath(path.dirname(session.piSessionFile), targetDir) || isUsablePiSessionFile(targetPath)) {
        shouldRewriteProjects = true
        continue
      }

      ensureDirectory(targetDir)
      fs.copyFileSync(session.piSessionFile, targetPath)
      shouldRewriteProjects = true
    }

    if (shouldRewriteProjects) writeProjectRegistry(readRegisteredProjects())
  }

  const listKnownSessions = () => {
    migrateRegistrySessions()
    const byFile = new Map()
    const byId = new Map()

    for (const project of readRegisteredProjects()) {
      if (!fs.existsSync(project.directoryPath)) continue
      for (const session of scanPiSessionsForProject(project.directoryPath, runtimeEnv)) {
        byFile.set(path.resolve(session.piSessionFile), session)
        byId.set(session.id, session)
      }
    }

    for (const session of runtimeSessions.values()) {
      const sanitized = sanitizeSession(session)
      const active = processes.has(sanitized.id)
      const fileKey = sanitized.piSessionFile ? path.resolve(sanitized.piSessionFile) : undefined
      const scanned = fileKey ? byFile.get(fileKey) : undefined
      const merged = scanned
        ? sanitizeSession({
            ...scanned,
            id: active ? sanitized.id : scanned.id,
            status: sanitized.status,
            model: sanitized.model ?? scanned.model,
            agent: sanitized.agent ?? scanned.agent,
            shareUrl: sanitized.shareUrl ?? scanned.shareUrl,
            lastError: sanitized.lastError ?? scanned.lastError,
          })
        : sanitized
      if (scanned && fileKey) byFile.set(fileKey, merged)
      if (scanned && scanned.id !== merged.id) byId.delete(scanned.id)
      byId.set(merged.id, merged)
    }

    return Array.from(byId.values()).sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))
  }

  const resolveKnownSession = (sessionId) => {
    const id = validateSessionId(sessionId)
    const session = listKnownSessions().find((item) => item.id === id)
    if (!session) throw new Error('Open Pi session was not found.')
    return session
  }

  const resolveProjectSessionReference = (currentSession, reference) => {
    const value = validateText(reference, 'Session id').trim()
    const candidates = listKnownSessions().filter((session) => sameResolvedPath(session.directoryPath, currentSession.directoryPath))
    const matches = candidates.filter((session) =>
      session.id === value ||
      session.piSessionId === value ||
      session.id.startsWith(value) ||
      (session.piSessionId && session.piSessionId.startsWith(value)),
    )
    if (matches.length === 1) return matches[0]
    if (matches.length > 1) throw new Error(`Session prefix "${value}" is ambiguous.`)
    throw new Error(`No Pi session matching "${value}" was found for this project.`)
  }

  const updateRegistrySession = (sessionId, updates) => {
    const id = validateSessionId(sessionId)
    const sessions = readRegistry()
    const nextSessions = sessions.map((session) =>
      session.id === id ? sanitizeSession({ ...session, ...updates, updatedAt: nowIso() }, session.directoryPath) : session,
    )
    const updated = nextSessions.find((session) => session.id === id)
    if (updated) {
      runtimeSessions.set(id, updated)
      registerProject(updated.directoryPath)
    }
    return updated
  }

  const upsertRegistrySession = (session) => {
    const sanitized = sanitizeSession(session)
    const sessions = readRegistry()
    const index = sessions.findIndex((item) => item.id === sanitized.id)
    const nextSessions =
      index === -1
        ? [sanitized, ...sessions]
        : sessions.map((item) => (item.id === sanitized.id ? { ...item, ...sanitized, updatedAt: nowIso() } : item))
    const next = nextSessions.find((item) => item.id === sanitized.id)
    runtimeSessions.set(sanitized.id, next)
    registerProject(sanitized.directoryPath)
    return next
  }

  const emitSessionEvent = (sessionId, event) => {
    emitter.emit(`session:${sessionId}`, event)
  }

  const emitTerminalEvent = (terminalId, event) => {
    emitter.emit(`terminal:${terminalId}`, event)
  }

  const appendTerminalReplay = (terminal, data) => {
    terminal.replay = `${terminal.replay}${data}`.slice(-MAX_TERMINAL_REPLAY_SIZE)
  }

  const serializeTerminal = (terminal) => ({
    id: terminal.id,
    directoryPath: terminal.directoryPath,
    status: terminal.status,
    initialData: terminal.replay || undefined,
  })

  const removeTerminalProcess = (terminal) => {
    terminalProcesses.delete(terminal.id)
    if (terminalProcessesByDirectory.get(terminal.directoryKey) === terminal.id) {
      terminalProcessesByDirectory.delete(terminal.directoryKey)
    }
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
      const expected = terminal.closing
      terminal.status = expected ? 'closed' : 'exited'
      removeTerminalProcess(terminal)
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
    if (typeof child.once === 'function') {
      child.once('exit', onExit)
    } else if (typeof child.on === 'function') {
      child.on('exit', onExit)
    }
  }

  const closeTerminalProcess = (terminal) => {
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
      removeTerminalProcess(terminal)
      emitTerminalEvent(terminal.id, { type: 'status', id: terminal.id, status: 'closed' })
    }
  }

  const getTerminal = (terminalId) => {
    const id = validateTerminalId(terminalId)
    const terminal = terminalProcesses.get(id)
    if (!terminal) throw new Error('Open Pi terminal was not found.')
    return terminal
  }

  const cleanupOpenAssUiRequests = (sessionId) => {
    for (const [requestId, request] of pendingOpenAssUiRequests.entries()) {
      if (request.sessionId === sessionId) pendingOpenAssUiRequests.delete(requestId)
    }
  }

  const createOpenAssUiRequestId = (kind) => `${OPEN_ASS_UI_REQUEST_PREFIX}${kind}_${crypto.randomUUID()}`

  const requestOpenAssUi = (client, kind, request, data = {}) => {
    const requestId = createOpenAssUiRequestId(kind)
    const uiRequest = { ...request, id: requestId }
    pendingOpenAssUiRequests.set(requestId, {
      sessionId: client.sessionId,
      kind,
      data,
    })
    emitSessionEvent(client.sessionId, {
      type: 'extension_ui',
      sessionId: client.sessionId,
      request: uiRequest,
    })
    return { handledBy: 'builtin', uiRequest }
  }

  const requestOpenAssModelSelect = async (client) => {
    const [state, models] = await Promise.all([
      sendRpc(client, { type: 'get_state' }).catch(() => undefined),
      sendRpc(client, { type: 'get_available_models' }).catch(() => ({ models: [] })),
    ])
    const options = normalizeModelSelectOptions(models)
    if (!options.length) {
      return {
        handledBy: 'builtin',
        message: 'No available models were reported by Pi. Set a model with /model provider/model.',
      }
    }

    return requestOpenAssUi(client, 'model', {
      type: 'select',
      title: 'Choose model',
      message: `Current model: ${modelLabelFromState(state) ?? 'Default'}`,
      options,
    })
  }

  const requestOpenAssFeaturesSelect = async (client) => {
    const session = getRegisteredSession(client.sessionId)
    const state = readFeatureState(session.directoryPath)
    return requestOpenAssUi(client, 'features', {
      type: 'option-list',
      title: 'Feature Flags',
      message: `Repository: ${session.directoryPath}`,
      selectionMode: 'multiple',
      options: OPEN_ASS_FEATURE_FLAGS.map((feature) => ({
        label: feature.name,
        value: feature.name,
        description: `[${feature.stage}] ${feature.description}`,
        checked: featureEnabled(feature, state),
      })),
    })
  }

  const requestOpenAssForkSelect = async (client) => {
    const messages = getRpcMessagesArray(await sendRpc(client, { type: 'get_messages' }).catch(() => []))
    const options = messages
      .map(normalizeMessageRecord)
      .filter(Boolean)
      .filter((message) => message.role === 'user' && message.id && message.content.trim())
      .slice(-20)
      .reverse()
      .map((message) => ({
        label: `${message.content.replace(/\s+/g, ' ').slice(0, 120)}${message.content.length > 120 ? '...' : ''}`,
        value: message.id,
      }))

    if (!options.length) {
      return {
        handledBy: 'builtin',
        message: 'No previous user messages are available to fork from. Use /clone to duplicate the current session.',
      }
    }

    return requestOpenAssUi(client, 'fork', {
      type: 'select',
      title: 'Fork session',
      message: 'Choose the user message to fork from.',
      options,
    })
  }

  const requestOpenAssResumeSelect = async (client) => {
    const current = getRegisteredSession(client.sessionId)
    const sessions = listKnownSessions()
      .filter((session) => sameResolvedPath(session.directoryPath, current.directoryPath))
      .filter((session) => session.id !== current.id)

    if (!sessions.length) {
      return { handledBy: 'builtin', message: 'No other Pi sessions are available to resume for this project.' }
    }

    return requestOpenAssUi(client, 'resume', {
      type: 'select',
      title: 'Resume session',
      message: 'Choose a Pi session from this project.',
      options: sessions.map((session) => ({
        label: session.displayName || session.firstMessage || session.piSessionId,
        value: session.id,
      })),
    })
  }

  const importPiSessionFile = async (client, filePath) => {
    const resolved = path.resolve(validateText(filePath, 'JSONL session path'))
    if (!isUsablePiSessionFile(resolved)) throw new Error('Import requires an existing .jsonl session file.')

    const existing = listKnownSessions().find((session) => path.resolve(session.piSessionFile ?? '') === resolved)
    if (existing) {
      const opened = await service.openSession(existing.id)
      return { handledBy: 'builtin', message: `Opened imported session ${opened.displayName}.`, session: opened }
    }

    const current = getRegisteredSession(client.sessionId)
    const targetDir = resolvePiSessionDir(current.directoryPath, runtimeEnv)
    ensureDirectory(targetDir)
    const importedPath = path.join(targetDir, path.basename(resolved))
    if (!isUsablePiSessionFile(importedPath)) fs.copyFileSync(resolved, importedPath)
    const parsed = parsePiSessionFile(importedPath, current.directoryPath)
    if (parsed) {
      const imported = await service.openSession(parsed.id)
      return { handledBy: 'builtin', message: `Imported session from ${resolved}.`, session: imported }
    }

    const timestamp = nowIso()
    const session = upsertRegistrySession({
      id: crypto.randomUUID(),
      piSessionId: crypto.randomUUID(),
      piSessionFile: importedPath,
      directoryPath: current.directoryPath,
      displayName: path.basename(importedPath, '.jsonl') || current.displayName,
      createdAt: timestamp,
      updatedAt: timestamp,
      status: 'starting',
    })
    const imported = await service.openSession(session.id)
    return { handledBy: 'builtin', message: `Imported session from ${resolved}.`, session: imported }
  }

  const exportSession = async (client, outputPath) => {
    const trimmedOutputPath = typeof outputPath === 'string' ? outputPath.trim() : ''
    if (trimmedOutputPath.endsWith('.jsonl')) {
      const state = await sendRpc(client, { type: 'get_state' })
      const source = state?.sessionFile
      if (!isUsablePiSessionFile(source)) throw new Error('Pi did not report an exportable JSONL session file.')
      ensureDirectory(path.dirname(path.resolve(trimmedOutputPath)))
      fs.copyFileSync(source, path.resolve(trimmedOutputPath))
      return { handledBy: 'builtin', message: `Exported session to ${path.resolve(trimmedOutputPath)}.` }
    }

    const payload = { type: 'export_html' }
    if (trimmedOutputPath) payload.outputPath = trimmedOutputPath
    const result = await sendRpc(client, payload)
    const exportedPath = typeof result?.path === 'string' && result.path ? result.path : trimmedOutputPath
    return {
      handledBy: 'builtin',
      message: exportedPath ? `Exported session to ${exportedPath}.` : 'Exported session.',
    }
  }

  const copyLastAssistantText = async (client) => {
    const rpcText = await sendRpc(client, { type: 'get_last_assistant_text' }).catch(() => undefined)
    let text = typeof rpcText === 'string' ? rpcText : typeof rpcText?.text === 'string' ? rpcText.text : ''
    if (!text.trim()) {
      const messages = getRpcMessagesArray(await sendRpc(client, { type: 'get_messages' }).catch(() => []))
      const assistant = messages
        .map(normalizeMessageRecord)
        .filter(Boolean)
        .reverse()
        .find((message) => message.role === 'assistant' && message.content.trim())
      text = assistant?.content ?? ''
    }
    if (!text.trim()) return { handledBy: 'builtin', message: 'No assistant message is available to copy.' }
    if (!clipboard?.writeText) return { handledBy: 'builtin', message: 'Clipboard access is not available in this process.' }
    clipboard.writeText(text)
    return { handledBy: 'builtin', message: 'Copied the last assistant message to the clipboard.' }
  }

  const reloadSessionProcess = async (sessionId) => {
    await closeProcess(sessionId)
    const client = await startProcess(getRegisteredSession(sessionId))
    await refreshRuntimeState(client)
    await emitMessages(client)
    return { handledBy: 'builtin', message: 'Reloaded Pi RPC process and refreshed session state.', session: getRegisteredSession(sessionId) }
  }

  const respondToOpenAssUiRequest = async (client, request, response) => {
    if (response.cancelled) return { handledBy: 'builtin', message: `${request.kind} cancelled.` }
    if (request.kind === 'model') {
      const { provider, modelId } = parseModelSelectionValue(response.value)
      await sendRpc(client, { type: 'set_model', provider, modelId })
      await refreshRuntimeState(client)
      return { handledBy: 'builtin', message: `Model set to ${provider}/${modelId}.`, session: getRegisteredSession(client.sessionId) }
    }
    if (request.kind === 'name') {
      const name = validateText(String(response.value ?? ''), 'Session name')
      await sendRpc(client, { type: 'set_session_name', name })
      const session = updateRegistrySession(client.sessionId, { title: name, displayName: name }) ?? getRegisteredSession(client.sessionId)
      return { handledBy: 'builtin', message: `Renamed session to ${name}.`, session }
    }
    if (request.kind === 'export') return exportSession(client, String(response.value ?? ''))
    if (request.kind === 'import') return importPiSessionFile(client, String(response.value ?? ''))
    if (request.kind === 'fork') {
      const entryId = validateText(String(response.value ?? ''), 'Message id')
      await sendRpc(client, { type: 'fork', entryId })
      await refreshRuntimeState(client)
      await emitMessages(client)
      return { handledBy: 'builtin', message: 'Forked session.', session: getRegisteredSession(client.sessionId) }
    }
    if (request.kind === 'resume') {
      const session = await service.openSession(resolveProjectSessionReference(getRegisteredSession(client.sessionId), String(response.value ?? '')).id)
      return { handledBy: 'builtin', message: `Resumed ${session.displayName}.`, session }
    }
    if (request.kind === 'features') {
      const session = getRegisteredSession(client.sessionId)
      const selected = new Set(Array.isArray(response.values) ? response.values.map(String) : [])
      const state = readFeatureState(session.directoryPath)
      for (const feature of OPEN_ASS_FEATURE_FLAGS) {
        state.flags[feature.name] = selected.has(feature.name)
      }
      writeJsonFile(featuresFilePath(session.directoryPath), state)
      const summary = OPEN_ASS_FEATURE_FLAGS.map((feature) => `${state.flags[feature.name] ? '●' : '○'} ${feature.name}`).join('\n')
      return { handledBy: 'builtin', message: `Feature flags saved:\n${summary}` }
    }
    if (request.kind === 'quit') {
      if (!response.confirmed) return { handledBy: 'builtin', message: 'Quit cancelled.' }
      await closeProcess(client.sessionId)
      return { handledBy: 'builtin', message: 'Closed the Pi RPC process for this Open Pi session.', session: getRegisteredSession(client.sessionId) }
    }
    throw new Error('Unknown Open Pi UI request.')
  }

  const findPiCommand = () => {
    const candidates = [
      runtimeEnv.OPEN_PI_BIN_PATH,
      runtimeEnv.OPENASS_PI_BIN_PATH,
      runtimeEnv.PI_BIN_PATH,
      'pi',
    ].filter(Boolean)

    for (const command of candidates) {
      const result = spawnSync(command, ['--version'], { encoding: 'utf8', env: runtimeEnv })
      if (!result.error && result.status === 0) {
        return { command, version: String(result.stdout || result.stderr || '').trim() }
      }
    }
    return null
  }

  const rejectPending = (client, error) => {
    for (const pending of client.pending.values()) {
      clearTimeout(pending.timeout)
      pending.reject(error)
    }
    client.pending.clear()
  }

  const sendRpc = (client, command, timeoutMs = RPC_RESPONSE_TIMEOUT_MS) => {
    if (!client.child.stdin || client.child.stdin.destroyed || !client.child.stdin.writable) {
      throw new Error(`Pi RPC stdin is not writable. ${client.stderr}`.trim())
    }
    if (client.exitError) throw client.exitError

    const id = `req_${++client.requestId}`
    const payload = { ...command, id }
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        client.pending.delete(id)
        reject(new Error(`Timed out waiting for Pi RPC response to ${command.type}. ${client.stderr}`.trim()))
      }, timeoutMs)
      client.pending.set(id, {
        timeout,
        resolve: (response) => {
          clearTimeout(timeout)
          if (!response.success) {
            reject(new Error(response.error || `Pi RPC command failed: ${response.command || command.type}`))
            return
          }
          resolve(response.data)
        },
        reject,
      })
      try {
        client.child.stdin.write(`${JSON.stringify(payload)}\n`)
      } catch (error) {
        clearTimeout(timeout)
        client.pending.delete(id)
        reject(error)
      }
    })
  }

  const writeRpcEvent = (client, event) => {
    if (!client.child.stdin || client.child.stdin.destroyed || !client.child.stdin.writable) {
      throw new Error(`Pi RPC stdin is not writable. ${client.stderr}`.trim())
    }
    client.child.stdin.write(`${JSON.stringify(event)}\n`)
  }

  const handleLine = (client, line) => {
    if (!line.trim()) return
    let data
    try {
      data = JSON.parse(line)
    } catch {
      return
    }

    if (data.type === 'response' && data.id && client.pending.has(data.id)) {
      const pending = client.pending.get(data.id)
      client.pending.delete(data.id)
      pending.resolve(data)
      return
    }

    for (const event of normalizePiEvent(client.sessionId, data, client.transcriptPartIds)) {
      emitSessionEvent(client.sessionId, event)
    }
    if (data.type === 'agent_end' || data.type === 'turn_end') {
      void emitMessages(client).catch((error) => {
        emitSessionEvent(client.sessionId, {
          type: 'error',
          sessionId: client.sessionId,
          error: error instanceof Error ? error.message : String(error),
        })
      })
    }
  }

  const startProcess = async (session) => {
    const existing = processes.get(session.id)
    if (existing && existing.child.exitCode === null) return existing

    const pi = findPiCommand()
    if (!pi) throw new Error('Pi CLI was not found on PATH. Install Pi or set PI_BIN_PATH.')

    const args = ['--mode', 'rpc']
    if (isUsablePiSessionFile(session.piSessionFile)) args.push('--session', session.piSessionFile)
    if (session.title || session.displayName) args.push('--name', session.title || session.displayName)

    emitSessionEvent(session.id, { type: 'status', sessionId: session.id, status: 'starting' })
    updateRegistrySession(session.id, { status: 'starting', lastError: undefined })

    const child = spawn(pi.command, args, {
      cwd: session.directoryPath,
      env: runtimeEnv,
      stdio: ['pipe', 'pipe', 'pipe'],
    })

    const client = {
      sessionId: session.id,
      child,
      pending: new Map(),
      requestId: 0,
      stdoutBuffer: '',
      stderr: '',
      exitError: null,
      transcriptPartIds: new Set(),
    }
    processes.set(session.id, client)

    child.stdout?.on('data', (chunk) => {
      client.stdoutBuffer += String(chunk)
      const lines = client.stdoutBuffer.split('\n')
      client.stdoutBuffer = lines.pop() ?? ''
      for (const rawLine of lines) handleLine(client, rawLine.endsWith('\r') ? rawLine.slice(0, -1) : rawLine)
    })

    child.stderr?.on('data', (chunk) => {
      client.stderr = `${client.stderr}${String(chunk)}`.slice(-MAX_STDERR_SIZE)
    })

    child.once('error', (error) => {
      client.exitError = new Error(`Pi RPC process error: ${error.message}. ${client.stderr}`.trim())
      rejectPending(client, client.exitError)
      updateRegistrySession(session.id, { status: 'error', lastError: client.exitError.message })
      emitSessionEvent(session.id, { type: 'error', sessionId: session.id, error: client.exitError.message })
    })

    child.once('exit', (code, signal) => {
      processes.delete(session.id)
      const expected = client.closing
      const message = `Pi RPC process exited (code=${code} signal=${signal}). ${client.stderr}`.trim()
      client.exitError = expected ? null : new Error(message)
      if (client.exitError) rejectPending(client, client.exitError)
      updateRegistrySession(session.id, { status: expected ? 'closed' : 'error', lastError: expected ? undefined : message })
      emitSessionEvent(session.id, {
        type: 'status',
        sessionId: session.id,
        status: expected ? 'closed' : 'error',
        error: expected ? undefined : message,
      })
    })

    const state = await sendRpc(client, { type: 'get_state' })
    const model = modelLabelFromState(state)
    const updated = updateRegistrySession(session.id, {
      status: 'running',
      piSessionFile: isUsablePiSessionFile(state?.sessionFile) || !session.piSessionFile
        ? state?.sessionFile
        : session.piSessionFile,
      title: state?.sessionName ?? session.title,
      displayName: state?.sessionName ?? session.displayName,
      model,
      lastError: undefined,
    })
    emitSessionEvent(session.id, { type: 'status', sessionId: session.id, status: 'running', model })
    emitSessionEvent(session.id, { type: 'metadata', sessionId: session.id, metadata: { state } })
    await emitMessages(client)
    return { ...client, session: updated }
  }

  const getRegisteredSession = (sessionId) => {
    return resolveKnownSession(sessionId)
  }

  const ensureProcess = async (sessionId) => startProcess(getRegisteredSession(sessionId))

  const loadTranscriptPageForClient = async (client, options = {}) => {
    const command = { type: 'get_messages' }
    if (options.before) command.before = validateText(String(options.before), 'Transcript cursor')
    if (options.limit != null) command.limit = validatePositiveInteger(options.limit, 'Transcript page limit')
    const payload = await sendRpc(client, command).catch(() => [])
    const page = normalizeTranscriptPagePayload(payload, options)
    if (!page.items.length && !options.before) {
      const registered = resolveKnownSession(client.sessionId)
      const sessionFile = [registered?.piSessionFile, client.session?.piSessionFile].find(isUsablePiSessionFile)
      const fileItems = transcriptItemsFromSessionFile(sessionFile)
      if (fileItems.length) {
        page.items = fileItems
        page.cursor = undefined
        page.complete = true
        page.mode = 'replace'
      }
    }
    emitSessionEvent(client.sessionId, {
      type: 'transcript_snapshot',
      sessionId: client.sessionId,
      items: page.items,
      cursor: page.cursor,
      complete: page.complete,
      mode: page.mode,
    })
    const messages = getRpcMessagesArray(payload)
    const todos = extractLatestTodosFromMessages(messages)
    if (todos) emitSessionEvent(client.sessionId, { type: 'todos', sessionId: client.sessionId, todos })
    return page
  }

  const emitMessages = async (client) => {
    const page = await loadTranscriptPageForClient(client)
    return page.items
  }

  const refreshRuntimeState = async (client) => {
    const state = await sendRpc(client, { type: 'get_state' })
    const model = modelLabelFromState(state)
    updateRegistrySession(client.sessionId, {
      status: 'running',
      piSessionFile: state?.sessionFile,
      title: state?.sessionName,
      displayName: state?.sessionName,
      model,
      lastError: undefined,
    })
    emitSessionEvent(client.sessionId, { type: 'status', sessionId: client.sessionId, status: 'running', model })
    emitSessionEvent(client.sessionId, { type: 'metadata', sessionId: client.sessionId, metadata: { state } })
    return state
  }

  const closeProcess = async (sessionId) => {
    const id = validateSessionId(sessionId)
    cleanupOpenAssUiRequests(id)
    const client = processes.get(id)
    if (!client) {
      updateRegistrySession(id, { status: 'closed' })
      return
    }
    client.closing = true
    await new Promise((resolve) => {
      const timeout = setTimeout(() => {
        client.child.kill('SIGKILL')
        resolve()
      }, 1000)
      client.child.once('exit', () => {
        clearTimeout(timeout)
        resolve()
      })
      client.child.kill('SIGTERM')
    })
  }

  const service = {
    startTerminal: async (input) => {
      const validated = validateStartTerminalInput(input)
      const directoryPath = validated.directoryPath ?? (await chooseDirectory())
      if (!directoryPath) return null
      const resolvedDirectory = validateDirectoryPath(directoryPath)
      const directoryKey = resolveComparablePath(resolvedDirectory)
      const existingId = terminalProcessesByDirectory.get(directoryKey)
      const existing = existingId ? terminalProcesses.get(existingId) : null
      if (existing && existing.status === 'running') return serializeTerminal(existing)

      const pi = findPiCommand()
      if (!pi) throw new Error('Pi CLI was not found on PATH. Install Pi or set PI_BIN_PATH.')
      if (typeof ptySpawn !== 'function') throw new Error('node-pty is not available. Reinstall OpenSe Desktop dependencies.')

      registerProject(resolvedDirectory)
      const id = createTuiId('term')
      const terminal = {
        id,
        directoryPath: resolvedDirectory,
        directoryKey,
        status: 'running',
        replay: '',
        child: null,
        closing: false,
        cols: DEFAULT_TERMINAL_COLS,
        rows: DEFAULT_TERMINAL_ROWS,
      }

      const child = ptySpawn(pi.command, [], {
        name: 'xterm-256color',
        cols: terminal.cols,
        rows: terminal.rows,
        cwd: resolvedDirectory,
        env: {
          ...runtimeEnv,
          TERM: 'xterm-256color',
          COLORTERM: runtimeEnv.COLORTERM ?? 'truecolor',
          OPENCODE_CLIENT: runtimeEnv.OPENCODE_CLIENT ?? 'desktop-terminal',
        },
      })
      terminal.child = child
      terminalProcesses.set(id, terminal)
      terminalProcessesByDirectory.set(directoryKey, id)
      attachTerminalDataListener(terminal, child)
      attachTerminalExitListener(terminal, child)
      emitTerminalEvent(id, { type: 'status', id, status: 'running' })
      return serializeTerminal(terminal)
    },

    writeTerminal: async (terminalId, data) => {
      const terminal = getTerminal(terminalId)
      const text = validateTerminalWriteData(data)
      if (terminal.status !== 'running') throw new Error('Open Pi terminal is not running.')
      terminal.child.write(text)
    },

    resizeTerminal: async (terminalId, cols, rows) => {
      const terminal = getTerminal(terminalId)
      const nextCols = validateTerminalDimension(cols, 'Terminal columns')
      const nextRows = validateTerminalDimension(rows, 'Terminal rows')
      if (terminal.status !== 'running') return
      terminal.cols = nextCols
      terminal.rows = nextRows
      if (typeof terminal.child.resize === 'function') terminal.child.resize(nextCols, nextRows)
    },

    stopTerminal: async (terminalId) => {
      closeTerminalProcess(getTerminal(terminalId))
    },

    initializePiConfig: async (input) => {
      const validated = validateInitializePiConfigInput(input)
      return installPiConfigFromGitHub(validated.directoryPath, { replace: validated.replace })
    },

    onTerminalEvent: (terminalId, callback) => {
      const id = validateTerminalId(terminalId)
      if (typeof callback !== 'function') throw new Error('Terminal event callback is required.')
      const eventName = `terminal:${id}`
      emitter.on(eventName, callback)
      return () => emitter.off(eventName, callback)
    },

    getStatus: async () => {
      const pi = findPiCommand()
      if (!pi) return { available: false, error: 'Pi CLI was not found on PATH. Install Pi or set PI_BIN_PATH.' }
      return { available: true, version: pi.version, serverUrl: 'pi-rpc' }
    },

    listSessions: async () => listKnownSessions(),

    createSession: async (input) => {
      const validated = validateCreateSessionInput(input)
      const directoryPath = validated.directoryPath ?? (await chooseDirectory())
      if (!directoryPath) return null
      const resolvedDirectory = validateDirectoryPath(directoryPath)
      registerProject(resolvedDirectory)
      const timestamp = nowIso()
      const id = crypto.randomUUID()
      const session = upsertRegistrySession({
        id,
        piSessionId: id,
        directoryPath: resolvedDirectory,
        displayName: validated.title || path.basename(resolvedDirectory) || resolvedDirectory,
        title: validated.title,
        agent: validated.agent,
        model: validated.model ? `${validated.model.providerID}/${validated.model.id}` : undefined,
        createdAt: timestamp,
        updatedAt: timestamp,
        status: 'starting',
      })
      const client = await startProcess(session)
      return listKnownSessions().find((item) => item.id === client.sessionId) ?? session
    },

    openSession: async (sessionId) => {
      const session = getRegisteredSession(sessionId)
      registerProject(session.directoryPath)
      runtimeSessions.set(session.id, sanitizeSession({ ...session, status: 'starting' }))
      const client = await startProcess(session)
      await emitMessages(client)
      return listKnownSessions().find((item) => item.id === session.id) ?? session
    },

    loadTranscriptPage: async (sessionId, options = {}) => {
      const client = await ensureProcess(sessionId)
      return loadTranscriptPageForClient(client, options)
    },

    sendCommand: async (sessionId, command, behavior, promptIds) => {
      const client = await ensureProcess(sessionId)
      await sendRpc(client, buildPromptPayload(command, behavior, promptIds))
    },

    runSlashCommand: async (sessionId, command, args, promptIds) => {
      const slash = validateText(command, 'Slash command').replace(/^\//, '')
      const commandName = slash.trim()
      const rawArgs = typeof args === 'string' ? args : ''
      const trimmedArgs = rawArgs.trim()
      const suffix = rawArgs ? ` ${validateText(rawArgs, 'Slash command arguments')}` : ''
      const client = await ensureProcess(sessionId)

      if (commandName === 'compact') {
        const payload = { type: 'compact' }
        if (trimmedArgs) payload.customInstructions = trimmedArgs
        await sendRpc(client, payload)
        await emitMessages(client)
        return {
          handledBy: 'builtin',
          message: trimmedArgs ? `Compacted session with instructions: ${trimmedArgs}` : 'Compacted session.',
        }
      }

      if (commandName === 'name') {
        if (!trimmedArgs) {
          return requestOpenAssUi(client, 'name', {
            type: 'input',
            title: 'Rename session',
            message: 'Enter a new Open Pi session name.',
            value: getRegisteredSession(sessionId).displayName,
            placeholder: 'Session name',
          })
        }
        const name = validateText(trimmedArgs, 'Session name')
        await sendRpc(client, { type: 'set_session_name', name })
        const session = updateRegistrySession(sessionId, { title: name, displayName: name }) ?? getRegisteredSession(sessionId)
        return { handledBy: 'builtin', message: `Renamed session to ${name}.`, session }
      }

      if (commandName === 'settings') {
        const state = await sendRpc(client, { type: 'get_state' }).catch(() => undefined)
        return { handledBy: 'builtin', message: formatSettingsMessage(state) }
      }

      if (commandName === 'session') {
        const [state, stats] = await Promise.all([
          sendRpc(client, { type: 'get_state' }),
          sendRpc(client, { type: 'get_session_stats' }).catch(() => undefined),
        ])
        return { handledBy: 'builtin', message: formatSessionResult(state, stats) }
      }

      if (commandName === 'clone') {
        await sendRpc(client, { type: 'clone' })
        await refreshRuntimeState(client)
        await emitMessages(client)
        return {
          handledBy: 'builtin',
          message: 'Cloned session.',
          session: getRegisteredSession(sessionId),
        }
      }

      if (commandName === 'new') {
        const result = await sendRpc(client, { type: 'new_session' })
        if (result?.cancelled) return { handledBy: 'builtin', message: 'New session cancelled.' }
        await refreshRuntimeState(client)
        await emitMessages(client)
        return {
          handledBy: 'builtin',
          message: 'Started new session.',
          session: getRegisteredSession(sessionId),
        }
      }

      if (commandName === 'export') {
        if (!trimmedArgs) {
          return requestOpenAssUi(client, 'export', {
            type: 'input',
            title: 'Export session',
            message: 'Enter an output path ending in .html or .jsonl.',
            placeholder: '/path/to/session.html',
          })
        }
        return exportSession(client, trimmedArgs)
      }

      if (commandName === 'import') {
        if (!trimmedArgs) {
          return requestOpenAssUi(client, 'import', {
            type: 'input',
            title: 'Import session',
            message: 'Enter the path to a Pi JSONL session file.',
            placeholder: '/path/to/session.jsonl',
          })
        }
        return importPiSessionFile(client, trimmedArgs)
      }

      if (commandName === 'model') {
        if (trimmedArgs) {
          const separator = trimmedArgs.indexOf('/')
          const provider = separator === -1 ? '' : trimmedArgs.slice(0, separator).trim()
          const modelId = separator === -1 ? '' : trimmedArgs.slice(separator + 1).trim()
          if (!provider || !modelId) throw new Error('Use /model provider/model.')
          await sendRpc(client, { type: 'set_model', provider, modelId })
          await refreshRuntimeState(client)
          return {
            handledBy: 'builtin',
            message: `Model set to ${provider}/${modelId}.`,
            session: getRegisteredSession(sessionId),
          }
        }
        return requestOpenAssModelSelect(client)
      }

      if (commandName === 'features' && !trimmedArgs) return requestOpenAssFeaturesSelect(client)

      if (commandName === 'copy') return copyLastAssistantText(client)

      if (commandName === 'fork') {
        if (trimmedArgs) {
          await sendRpc(client, { type: 'fork', entryId: validateText(trimmedArgs, 'Message id') })
          await refreshRuntimeState(client)
          await emitMessages(client)
          return { handledBy: 'builtin', message: 'Forked session.', session: getRegisteredSession(sessionId) }
        }
        return requestOpenAssForkSelect(client)
      }

      if (commandName === 'resume') {
        if (trimmedArgs) {
          const session = await service.openSession(resolveProjectSessionReference(getRegisteredSession(sessionId), trimmedArgs).id)
          return { handledBy: 'builtin', message: `Resumed ${session.displayName}.`, session }
        }
        return requestOpenAssResumeSelect(client)
      }

      if (commandName === 'reload') return reloadSessionProcess(sessionId)

      if (commandName === 'quit') {
        return requestOpenAssUi(client, 'quit', {
          type: 'confirm',
          title: 'Close Pi session',
          message: 'Close the Pi RPC process for this Open Pi session? The desktop app will stay open.',
        })
      }

      if (commandName === 'changelog') return { handledBy: 'builtin', message: formatChangelogMessage() }

      if (commandName === 'hotkeys') return { handledBy: 'builtin', message: formatHotkeysMessage() }

      if (['scoped-models', 'share', 'tree', 'login', 'logout'].includes(commandName)) {
        if (commandName === 'share') {
          const session = await service.shareSession(sessionId)
          return {
            handledBy: 'builtin',
            message: session.shareUrl
              ? `Session shared: ${session.shareUrl}`
              : formatOpenAssFallbackPanelMessage(commandName),
            session,
          }
        }
        return { handledBy: 'builtin', message: formatOpenAssFallbackPanelMessage(commandName) }
      }

      if (commandName === 'todos') {
        return {
          handledBy: 'builtin',
          message: 'Todos are shown in the native Open Pi work-state panel.',
        }
      }

      if (PI_TUI_BUILTIN_COMMAND_NAMES.has(commandName) || OPEN_ASS_ONLY_COMMAND_NAMES.has(commandName)) {
        return {
          handledBy: 'builtin',
          message: formatUnsupportedBuiltinCommandMessage(commandName),
        }
      }

      const commands = await sendRpc(client, { type: 'get_commands' }).catch(() => ({ commands: [] }))
      if (hasPiCommand(commands, commandName)) {
        await sendRpc(client, buildPromptPayload(`/${slash}${suffix}`, 'followUp', promptIds))
        return { handledBy: 'pi' }
      }

      return {
        handledBy: 'builtin',
        message: `/${commandName} is not available in Open Pi for this session. Use one of the listed slash commands, or use Runtime controls for desktop-only actions.`,
      }
    },

    runShellCommand: async (sessionId, command) => {
      const client = await ensureProcess(sessionId)
      const result = await sendRpc(client, { type: 'bash', command: validateCommand(command) })
      emitSessionEvent(client.sessionId, {
        type: 'tool',
        sessionId: client.sessionId,
        tool: {
          id: `bash-${Date.now()}`,
          name: 'bash',
          status: result?.exitCode === 0 ? 'complete' : 'error',
          summary: contentToText(result?.output ?? result?.content ?? result),
          createdAt: nowIso(),
        },
      })
    },

    abort: async (sessionId) => {
      const client = await ensureProcess(sessionId)
      await sendRpc(client, { type: 'abort' })
      await sendRpc(client, { type: 'abort_bash' }).catch(() => undefined)
    },

    closeSession: async (sessionId) => closeProcess(sessionId),

    deleteSession: async (sessionId) => {
      const id = validateSessionId(sessionId)
      await closeProcess(id)
      runtimeSessions.delete(id)
    },

    renameSession: async (sessionId, title) => {
      const client = await ensureProcess(sessionId)
      await sendRpc(client, { type: 'set_session_name', name: validateText(title, 'Title') })
      return updateRegistrySession(sessionId, { title, displayName: title }) ?? getRegisteredSession(sessionId)
    },

    forkSession: async (sessionId, messageId) => {
      const client = await ensureProcess(sessionId)
      if (messageId) await sendRpc(client, { type: 'fork', entryId: validateText(messageId, 'Message id') })
      else await sendRpc(client, { type: 'clone' })
      const state = await sendRpc(client, { type: 'get_state' }).catch(() => undefined)
      const session = updateRegistrySession(sessionId, {
        piSessionFile: state?.sessionFile,
        title: state?.sessionName,
        displayName: state?.sessionName,
      })
      await emitMessages(client)
      return session ?? getRegisteredSession(sessionId)
    },

    summarizeSession: async (sessionId, _model) => {
      const client = await ensureProcess(sessionId)
      await sendRpc(client, { type: 'compact' })
      await emitMessages(client)
    },

    revertSession: async (_sessionId, _messageId) => {
      throw new Error('Undo/revert is not exposed by Pi RPC mode.')
    },

    unrevertSession: async (_sessionId) => {
      throw new Error('Redo is not exposed by Pi RPC mode.')
    },

    shareSession: async (sessionId) => {
      const session = getRegisteredSession(sessionId)
      return updateRegistrySession(sessionId, { shareUrl: undefined }) ?? session
    },

    unshareSession: async (sessionId) => {
      const session = getRegisteredSession(sessionId)
      return updateRegistrySession(sessionId, { shareUrl: undefined }) ?? session
    },

    getSessionData: async (sessionId) => getRegisteredSession(sessionId),

    listCapabilities: async (sessionId) => {
      if (!sessionId) return { commands: normalizeCommandList([]), tools: ['read', 'bash', 'edit', 'write', 'grep', 'find', 'ls'] }
      const client = await ensureProcess(sessionId)
      const [commands, models, state, stats] = await Promise.all([
        sendRpc(client, { type: 'get_commands' }).catch(() => ({ commands: [] })),
        sendRpc(client, { type: 'get_available_models' }).catch(() => ({ models: [] })),
        sendRpc(client, { type: 'get_state' }).catch(() => undefined),
        sendRpc(client, { type: 'get_session_stats' }).catch(() => undefined),
      ])
      return {
        models: models?.models ?? [],
        commands: normalizeCommandList(commands),
        tools: ['read', 'bash', 'edit', 'write', 'grep', 'find', 'ls'],
        agents: [],
        providers: {},
        mcp: {},
        lsp: {},
        vcs: {},
        state,
        stats,
      }
    },

    setModel: async (sessionId, provider, modelId) => {
      const client = await ensureProcess(sessionId)
      await sendRpc(client, {
        type: 'set_model',
        provider: validateText(provider, 'Provider'),
        modelId: validateText(modelId, 'Model'),
      })
      await refreshRuntimeState(client)
    },

    setThinkingLevel: async (sessionId, level) => {
      const client = await ensureProcess(sessionId)
      await sendRpc(client, {
        type: 'set_thinking_level',
        level: validateOneOf(level, ['off', 'minimal', 'low', 'medium', 'high', 'xhigh'], 'Thinking level'),
      })
      await refreshRuntimeState(client)
    },

    setSteeringMode: async (sessionId, mode) => {
      const client = await ensureProcess(sessionId)
      await sendRpc(client, {
        type: 'set_steering_mode',
        mode: validateOneOf(mode, ['all', 'one-at-a-time'], 'Steering mode'),
      })
      await refreshRuntimeState(client)
    },

    setFollowUpMode: async (sessionId, mode) => {
      const client = await ensureProcess(sessionId)
      await sendRpc(client, {
        type: 'set_follow_up_mode',
        mode: validateOneOf(mode, ['all', 'one-at-a-time'], 'Follow-up mode'),
      })
      await refreshRuntimeState(client)
    },

    setAutoCompaction: async (sessionId, enabled) => {
      const client = await ensureProcess(sessionId)
      await sendRpc(client, { type: 'set_auto_compaction', enabled: validateBoolean(enabled, 'Auto compaction') })
      await refreshRuntimeState(client)
    },

    setAutoRetry: async (sessionId, enabled) => {
      const client = await ensureProcess(sessionId)
      await sendRpc(client, { type: 'set_auto_retry', enabled: validateBoolean(enabled, 'Auto retry') })
      await refreshRuntimeState(client)
    },

    getDiff: async (_sessionId, _mode) => [],

    initGit: async (sessionId) => {
      const client = await ensureProcess(sessionId)
      return sendRpc(client, { type: 'bash', command: 'git init' })
    },

    respondToPermission: async (_sessionId, _permissionId, response) => {
      if (!VALID_PERMISSION_RESPONSE.has(response)) throw new Error('Invalid permission response.')
    },

    respondToQuestion: async (_sessionId, _requestId, answers) => {
      if (!Array.isArray(answers)) throw new Error('Invalid question response.')
    },

    rejectQuestion: async (_sessionId, _requestId) => undefined,

    respondToExtensionUi: async (sessionId, response) => {
      const client = await ensureProcess(sessionId)
      const value = validateObject(response, 'Extension UI response')
      const id = validateText(value.id, 'Extension UI request id')
      if (id.startsWith(OPEN_ASS_UI_REQUEST_PREFIX)) {
        const request = pendingOpenAssUiRequests.get(id)
        if (!request || request.sessionId !== client.sessionId) throw new Error('Open Pi UI request was not found.')
        pendingOpenAssUiRequests.delete(id)
        return respondToOpenAssUiRequest(client, request, value)
      }
      const payload = { type: 'extension_ui_response', id }
      if (value.cancelled) payload.cancelled = true
      else if ('confirmed' in value) payload.confirmed = Boolean(value.confirmed)
      else if ('values' in value) payload.values = Array.isArray(value.values) ? value.values : []
      else if ('value' in value) payload.value = value.value
      else payload.cancelled = true
      writeRpcEvent(client, payload)
      return undefined
    },

    executeTuiCommand: async (sessionId, command) => {
      if (!sessionId) return
      const client = await ensureProcess(sessionId)
      const message = validateCommand(command)
      const trimmed = message.trim()
      if (trimmed.startsWith('/')) {
        const [slash, ...args] = trimmed.slice(1).split(/\s+/)
        const commandName = slash.trim()
        if (PI_TUI_BUILTIN_COMMAND_NAMES.has(commandName) || OPEN_ASS_ONLY_COMMAND_NAMES.has(commandName)) {
          await service.runSlashCommand(sessionId, commandName, args.join(' '))
          return
        }
      }
      await sendRpc(client, buildPromptPayload(message, 'followUp'))
    },

    onSessionEvent: (sessionId, callback) => {
      const id = validateSessionId(sessionId)
      if (typeof callback !== 'function') throw new Error('Session event callback is required.')
      const eventName = `session:${id}`
      emitter.on(eventName, callback)
      return () => emitter.off(eventName, callback)
    },

    dispose: () => {
      for (const sessionId of Array.from(processes.keys())) {
        void closeProcess(sessionId)
      }
      for (const terminal of Array.from(terminalProcesses.values())) {
        closeTerminalProcess(terminal)
      }
    },

    _test: {
      buildPiRuntimeEnv,
      getRpcMessagesArray,
      normalizePiEvent,
      normalizeMessageRecord,
      parseEnvOutput,
      validateCommand,
      validateCreateSessionInput,
      validateDirectoryPath,
      validateSessionId,
      validateStartTerminalInput,
      validateInitializePiConfigInput,
      validateTerminalId,
      validateTerminalWriteData,
      installPiConfigFromGitHub,
      installExtensionDependencies,
      listExtensionPackageDirs,
      readRegistry,
    },
  }

  return service
}

const registerAssistantIpc = ({ ipcMain, service }) => {
  ipcMain.handle('assistant:start-terminal', (_event, input) => service.startTerminal(input))
  ipcMain.handle('assistant:write-terminal', (_event, terminalId, data) => service.writeTerminal(terminalId, data))
  ipcMain.handle('assistant:resize-terminal', (_event, terminalId, cols, rows) =>
    service.resizeTerminal(terminalId, cols, rows),
  )
  ipcMain.handle('assistant:stop-terminal', (_event, terminalId) => service.stopTerminal(terminalId))
  ipcMain.handle('assistant:initialize-pi-config', (_event, input) => service.initializePiConfig(input))
  ipcMain.handle('assistant:get-status', () => service.getStatus())
  ipcMain.handle('assistant:list-sessions', () => service.listSessions())
  ipcMain.handle('assistant:create-session', (_event, input) => service.createSession(input))
  ipcMain.handle('assistant:open-session', (_event, sessionId) => service.openSession(sessionId))
  ipcMain.handle('assistant:load-transcript-page', (_event, sessionId, options) =>
    service.loadTranscriptPage(sessionId, options),
  )
  ipcMain.handle('assistant:send-command', (_event, sessionId, command, behavior, promptIds) =>
    service.sendCommand(sessionId, command, behavior, promptIds),
  )
  ipcMain.handle('assistant:run-slash-command', (_event, sessionId, command, args, promptIds) =>
    service.runSlashCommand(sessionId, command, args, promptIds),
  )
  ipcMain.handle('assistant:run-shell-command', (_event, sessionId, command, agent) =>
    service.runShellCommand(sessionId, command, agent),
  )
  ipcMain.handle('assistant:abort', (_event, sessionId) => service.abort(sessionId))
  ipcMain.handle('assistant:close-session', (_event, sessionId) => service.closeSession(sessionId))
  ipcMain.handle('assistant:delete-session', (_event, sessionId) => service.deleteSession(sessionId))
  ipcMain.handle('assistant:rename-session', (_event, sessionId, title) => service.renameSession(sessionId, title))
  ipcMain.handle('assistant:fork-session', (_event, sessionId, messageId) => service.forkSession(sessionId, messageId))
  ipcMain.handle('assistant:summarize-session', (_event, sessionId, model) => service.summarizeSession(sessionId, model))
  ipcMain.handle('assistant:revert-session', (_event, sessionId, messageId) => service.revertSession(sessionId, messageId))
  ipcMain.handle('assistant:unrevert-session', (_event, sessionId) => service.unrevertSession(sessionId))
  ipcMain.handle('assistant:share-session', (_event, sessionId) => service.shareSession(sessionId))
  ipcMain.handle('assistant:unshare-session', (_event, sessionId) => service.unshareSession(sessionId))
  ipcMain.handle('assistant:get-session-data', (_event, sessionId) => service.getSessionData(sessionId))
  ipcMain.handle('assistant:list-capabilities', (_event, sessionId) => service.listCapabilities(sessionId))
  ipcMain.handle('assistant:set-model', (_event, sessionId, provider, modelId) =>
    service.setModel(sessionId, provider, modelId),
  )
  ipcMain.handle('assistant:set-thinking-level', (_event, sessionId, level) =>
    service.setThinkingLevel(sessionId, level),
  )
  ipcMain.handle('assistant:set-steering-mode', (_event, sessionId, mode) => service.setSteeringMode(sessionId, mode))
  ipcMain.handle('assistant:set-follow-up-mode', (_event, sessionId, mode) => service.setFollowUpMode(sessionId, mode))
  ipcMain.handle('assistant:set-auto-compaction', (_event, sessionId, enabled) =>
    service.setAutoCompaction(sessionId, enabled),
  )
  ipcMain.handle('assistant:set-auto-retry', (_event, sessionId, enabled) => service.setAutoRetry(sessionId, enabled))
  ipcMain.handle('assistant:get-diff', (_event, sessionId, mode) => service.getDiff(sessionId, mode))
  ipcMain.handle('assistant:init-git', (_event, sessionId) => service.initGit(sessionId))
  ipcMain.handle('assistant:respond-permission', (_event, sessionId, permissionId, response) =>
    service.respondToPermission(sessionId, permissionId, response),
  )
  ipcMain.handle('assistant:respond-question', (_event, sessionId, requestId, answers) =>
    service.respondToQuestion(sessionId, requestId, answers),
  )
  ipcMain.handle('assistant:reject-question', (_event, sessionId, requestId) => service.rejectQuestion(sessionId, requestId))
  ipcMain.handle('assistant:respond-extension-ui', (_event, sessionId, response) =>
    service.respondToExtensionUi(sessionId, response),
  )
  ipcMain.handle('assistant:execute-tui-command', (_event, sessionId, command) =>
    service.executeTuiCommand(sessionId, command),
  )

  return service
}

module.exports = {
  buildPiRuntimeEnv,
  createAssistantService,
  encodePiCwd,
  getRpcMessagesArray,
  normalizeMessageRecord,
  normalizePiEvent,
  normalizeTodoDetails,
  normalizeQueueItem,
  parsePiSessionFile,
  parseEnvOutput,
  registerAssistantIpc,
  resolvePiSessionDir,
  scanPiSessionsForProject,
  sessionIdFromPath,
  validateCommand,
  validateCreateSessionInput,
  validateDirectoryPath,
  validateSessionId,
  validateStartTerminalInput,
  validateInitializePiConfigInput,
  installPiConfigFromGitHub,
  installExtensionDependencies,
  listExtensionPackageDirs,
  PI_CONFIG_TARBALL_URL,
  validateTerminalId,
  validateTerminalWriteData,
}

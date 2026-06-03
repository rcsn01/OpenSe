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
const OPEN_ASS_UI_REQUEST_PREFIX = 'open_ass_ui_'
const OPEN_ASS_SESSION_ID_PREFIX = 'ses_'
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
  { name: 'todos', source: 'open-ass', description: 'Show the current todo state in the native Open-Ass UI.' },
]
const PI_TUI_BUILTIN_COMMAND_NAMES = new Set(PI_TUI_BUILTIN_COMMANDS.map((command) => command.name))
const OPEN_ASS_ONLY_COMMAND_NAMES = new Set(OPEN_ASS_ONLY_COMMANDS.map((command) => command.name))

const nowIso = () => new Date().toISOString()

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

const validateSessionId = (sessionId) => {
  if (typeof sessionId !== 'string' || !VALID_ID.test(sessionId)) {
    throw new Error('Invalid Open-Ass session id.')
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
const validateBoolean = (value, label) => {
  if (typeof value !== 'boolean') throw new Error(`${label} must be true or false.`)
  return value
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
  if (env.OPENASS_DISABLE_SHELL_ENV === '1' || process.platform === 'win32') return {}
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
    if (content.type === 'toolCall') return `${content.name ?? 'tool'} ${JSON.stringify(content.arguments ?? {})}`
  }
  return ''
}

const messageRole = (message) => {
  if (message?.role === 'assistant') return 'assistant'
  if (message?.role === 'system') return 'system'
  if (message?.role === 'tool' || message?.role === 'toolResult') return 'tool'
  return 'user'
}

const normalizeMessageRecord = (message, index = 0) => {
  const id = String(message?.id ?? message?.entryId ?? message?.messageId ?? `msg-${index}`)
  const role = messageRole(message)
  return {
    id,
    role,
    content: contentToText(message?.content ?? message?.text ?? message?.message ?? message),
    createdAt: typeof message?.timestamp === 'string' ? message.timestamp : typeof message?.createdAt === 'string' ? message.createdAt : undefined,
    status: message?.stopReason === 'error' ? 'error' : message?.stopReason === 'aborted' ? 'error' : 'complete',
  }
}

const getRpcMessagesArray = (payload) => {
  if (Array.isArray(payload)) return payload
  if (Array.isArray(payload?.messages)) return payload.messages
  return []
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

const normalizePiEvent = (sessionId, event) => {
  if (!event || typeof event !== 'object') return []

  if (event.type === 'agent_start') {
    return [
      { type: 'status', sessionId, status: 'running' },
      { type: 'metadata', sessionId, metadata: { steerQueue: buildSteerQueueState({ active: true }) } },
    ]
  }

  if (event.type === 'agent_end') {
    const messages = Array.isArray(event.messages) ? event.messages.map(normalizeMessageRecord) : []
    const todos = extractLatestTodosFromMessages(event.messages)
    return [
      ...(messages.length ? [{ type: 'messages', sessionId, messages }] : []),
      ...(todos ? [{ type: 'todos', sessionId, todos }] : []),
      { type: 'metadata', sessionId, metadata: { steerQueue: buildSteerQueueState({ active: false }) } },
      { type: 'status', sessionId, status: 'running' },
    ]
  }

  if (event.type === 'message_start' || event.type === 'message_end') {
    return event.message ? [{ type: 'message', sessionId, message: normalizeMessageRecord(event.message) }] : []
  }

  if (event.type === 'turn_end') {
    const events = []
    if (event.message) events.push({ type: 'message', sessionId, message: normalizeMessageRecord(event.message) })
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
    if (assistantEvent.type === 'text_delta' || assistantEvent.type === 'thinking_delta') {
      events.push({
        type: 'text_delta',
        sessionId,
        messageId: event.message?.id,
        delta: String(assistantEvent.delta ?? ''),
      })
    } else if (assistantEvent.type === 'toolcall_start' || assistantEvent.type === 'toolcall_end') {
      events.push({
        type: 'tool',
        sessionId,
        tool: {
          id: String(assistantEvent.toolCall?.id ?? assistantEvent.id ?? crypto.randomUUID()),
          name: String(assistantEvent.toolCall?.name ?? assistantEvent.name ?? 'tool'),
          status: assistantEvent.type === 'toolcall_end' ? 'complete' : 'running',
          summary: assistantEvent.toolCall ? JSON.stringify(assistantEvent.toolCall.arguments ?? {}) : undefined,
          createdAt: nowIso(),
        },
      })
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
  return `/${commandName} is a Pi TUI built-in command, but Open-Ass does not expose that TUI workflow yet.${description}`
}

const formatOpenAssFallbackPanelMessage = (commandName) => {
  const command = PI_TUI_BUILTIN_COMMANDS.find((item) => item.name === commandName)
  const description = command?.description ? `\n\nPi TUI behavior: ${command.description}.` : ''
  return `/${commandName} is handled inside Open-Ass for this session.${description}\n\nUse the Session sidebar and Runtime controls for the Open-Ass-native workflow.`
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
  'Open-Ass now handles Pi built-in slash commands natively where Pi RPC exposes the behavior.',
  'Extension, prompt, and skill commands still execute through Pi unchanged.',
  'Extension UI requests are rendered with Open-Ass pickers and dialogs.',
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
  try {
    return require('electron')?.clipboard ?? null
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
  if (method === 'select') {
    const options = Array.isArray(request.options)
      ? request.options.map((option) =>
          typeof option === 'string'
            ? { label: option, value: option }
            : { label: String(option.label ?? option.value ?? option), value: String(option.value ?? option.label ?? option) },
        )
      : []
    return { id: request.id, type: 'select', title: request.title, message: request.message, options }
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
  spawn = childProcess.spawn,
  spawnSync = childProcess.spawnSync,
  chooseDirectory = async () => null,
  clipboard = getDefaultClipboard(),
  env = process.env,
} = {}) => {
  if (!userDataPath) throw new Error('userDataPath is required.')

  const emitter = new EventEmitter()
  const rootDir = path.join(userDataPath, 'open-ass')
  const registryPath = path.join(rootDir, 'sessions.json')
  const runtimeEnv = buildPiRuntimeEnv(env, spawnSync)
  const processes = new Map()
  const runtimeSessions = new Map()
  const pendingOpenAssUiRequests = new Map()

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
    if (!session) throw new Error('Open-Ass session was not found.')
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

  const requestOpenAssForkSelect = async (client) => {
    const messages = getRpcMessagesArray(await sendRpc(client, { type: 'get_messages' }).catch(() => []))
    const options = messages
      .map(normalizeMessageRecord)
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
    if (request.kind === 'quit') {
      if (!response.confirmed) return { handledBy: 'builtin', message: 'Quit cancelled.' }
      await closeProcess(client.sessionId)
      return { handledBy: 'builtin', message: 'Closed the Pi RPC process for this Open-Ass session.', session: getRegisteredSession(client.sessionId) }
    }
    throw new Error('Unknown Open-Ass UI request.')
  }

  const findPiCommand = () => {
    const candidates = [
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

    for (const event of normalizePiEvent(client.sessionId, data)) {
      emitSessionEvent(client.sessionId, event)
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
      piSessionFile: state?.sessionFile,
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

  const emitMessages = async (client) => {
    const messages = getRpcMessagesArray(await sendRpc(client, { type: 'get_messages' }).catch(() => []))
    const normalized = messages.map(normalizeMessageRecord)
    emitSessionEvent(client.sessionId, { type: 'messages', sessionId: client.sessionId, messages: normalized })
    const todos = extractLatestTodosFromMessages(messages)
    if (todos) emitSessionEvent(client.sessionId, { type: 'todos', sessionId: client.sessionId, todos })
    return normalized
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

    sendCommand: async (sessionId, command, behavior) => {
      const client = await ensureProcess(sessionId)
      await sendRpc(client, { type: 'prompt', message: validateCommand(command), streamingBehavior: validateStreamingBehavior(behavior) })
    },

    runSlashCommand: async (sessionId, command, args) => {
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
            message: 'Enter a new Open-Ass session name.',
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
          message: 'Close the Pi RPC process for this Open-Ass session? The desktop app will stay open.',
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
          message: 'Todos are shown in the native Open-Ass work-state panel.',
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
        await sendRpc(client, { type: 'prompt', message: `/${slash}${suffix}`, streamingBehavior: 'followUp' })
        return { handledBy: 'pi' }
      }

      return {
        handledBy: 'builtin',
        message: `/${commandName} is not available in Open-Ass for this session. Use one of the listed slash commands, or use Runtime controls for desktop-only actions.`,
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
        if (!request || request.sessionId !== client.sessionId) throw new Error('Open-Ass UI request was not found.')
        pendingOpenAssUiRequests.delete(id)
        return respondToOpenAssUiRequest(client, request, value)
      }
      const payload = { type: 'extension_ui_response', id }
      if (value.cancelled) payload.cancelled = true
      else if ('confirmed' in value) payload.confirmed = Boolean(value.confirmed)
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
      await sendRpc(client, { type: 'prompt', message, streamingBehavior: 'followUp' })
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
      readRegistry,
    },
  }

  return service
}

const registerAssistantIpc = ({ ipcMain, service }) => {
  ipcMain.handle('assistant:get-status', () => service.getStatus())
  ipcMain.handle('assistant:list-sessions', () => service.listSessions())
  ipcMain.handle('assistant:create-session', (_event, input) => service.createSession(input))
  ipcMain.handle('assistant:open-session', (_event, sessionId) => service.openSession(sessionId))
  ipcMain.handle('assistant:send-command', (_event, sessionId, command, behavior) => service.sendCommand(sessionId, command, behavior))
  ipcMain.handle('assistant:run-slash-command', (_event, sessionId, command, args) =>
    service.runSlashCommand(sessionId, command, args),
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
}

export type AssistantSessionStatus = 'closed' | 'starting' | 'running' | 'error'

export type AssistantStatus = {
  available: boolean
  version?: string
  serverUrl?: string
  error?: string
}

export type AssistantSession = {
  id: string
  directoryPath: string
  piSessionFile?: string
  displayName: string
  createdAt: string
  updatedAt: string
  status: AssistantSessionStatus
  model?: string
  agent?: string
  title?: string
  shareUrl?: string
  lastError?: string
}

export type AssistantTranscriptMessage = {
  id: string
  role: 'user' | 'assistant' | 'system' | 'tool'
  content: string
  createdAt?: string
  status?: 'streaming' | 'complete' | 'error'
}

export type AssistantToolEvent = {
  id: string
  name: string
  status?: string
  summary?: string
  createdAt?: string
}

export type AssistantPermissionRequest = {
  id: string
  sessionId: string
  permission: string
  patterns: string[]
  always: string[]
  metadata: Record<string, unknown>
}

export type AssistantQuestionRequest = {
  id: string
  sessionId: string
  questions: Array<{
    header: string
    question: string
    options: Array<{ label: string; description: string }>
    multiple?: boolean
    custom?: boolean
  }>
}

export type AssistantTodo = {
  id: string
  content: string
  status: string
  explanation?: string
}

export type AssistantQueueItem = {
  id?: string
  content: string
  createdAt?: string
}

export type AssistantQueueState = {
  steering: AssistantQueueItem[]
  followUp: AssistantQueueItem[]
}

export type AssistantSteerQueueState = {
  active: boolean
  queuedCount: number
  canSteer: boolean
  canQueue: boolean
  hint: string
}

export type AssistantDiff = {
  file?: string
  patch?: string
  additions: number
  deletions: number
  status?: string
}

export type AssistantMetadata = Record<string, unknown> & {
  queue?: AssistantQueueState
  steerQueue?: AssistantSteerQueueState
}

export type AssistantCapabilities = {
  providers?: unknown
  models?: unknown[]
  agents?: unknown[]
  commands?: AssistantCommand[]
  tools?: string[]
  mcp?: unknown
  lsp?: unknown
  formatter?: unknown
  vcs?: unknown
  files?: unknown[]
  state?: unknown
  stats?: unknown
}

export type AssistantCommand = {
  name: string
  source?: 'builtin' | 'open-ass' | 'extension' | 'prompt' | 'skill' | string
  description?: string
}

export type SlashCommandResult =
  | { handledBy: 'pi' }
  | { handledBy: 'builtin'; message?: string; session?: AssistantSession; uiRequest?: ExtensionUiRequest }

export type ExtensionUiRequest =
  | {
      id: string
      type: 'select'
      title?: string
      message?: string
      options: Array<{ label: string; value: string }>
    }
  | {
      id: string
      type: 'confirm'
      title?: string
      message?: string
    }
  | {
      id: string
      type: 'input' | 'editor'
      title?: string
      message?: string
      value?: string
      placeholder?: string
    }

export type AssistantSessionEvent =
  | { type: 'status'; sessionId: string; status: AssistantSessionStatus; model?: string; error?: string }
  | { type: 'messages'; sessionId: string; messages: AssistantTranscriptMessage[] }
  | { type: 'message'; sessionId: string; message: AssistantTranscriptMessage }
  | {
      type: 'message_part'
      sessionId: string
      messageId: string
      partId?: string
      content: string
      partType?: string
    }
  | { type: 'text_delta'; sessionId: string; messageId?: string; delta: string }
  | { type: 'tool'; sessionId: string; tool: AssistantToolEvent }
  | { type: 'todos'; sessionId: string; todos: AssistantTodo[] }
  | { type: 'diff'; sessionId: string; diff: AssistantDiff[] }
  | { type: 'permissions'; sessionId: string; permissions: AssistantPermissionRequest[] }
  | { type: 'permission'; sessionId: string; permission: AssistantPermissionRequest }
  | { type: 'permission_resolved'; sessionId: string; requestId: string }
  | { type: 'questions'; sessionId: string; questions: AssistantQuestionRequest[] }
  | { type: 'question'; sessionId: string; question: AssistantQuestionRequest }
  | { type: 'question_resolved'; sessionId: string; requestId: string }
  | { type: 'metadata'; sessionId: string; metadata: AssistantMetadata }
  | { type: 'sdk_event'; sessionId: string; event: unknown }
  | { type: 'extension_ui'; sessionId: string; request: ExtensionUiRequest }
  | { type: 'error'; sessionId: string; error: string }

export type CreateSessionInput = {
  directoryPath?: string
  title?: string
  agent?: string
  model?: { providerID: string; id: string; variant?: string }
}

export type OpenSeAssistantBridge = {
  getStatus: () => Promise<AssistantStatus>
  listSessions: () => Promise<AssistantSession[]>
  createSession: (input?: CreateSessionInput) => Promise<AssistantSession | null>
  openSession: (sessionId: string) => Promise<AssistantSession>
  sendCommand: (sessionId: string, command: string, behavior?: 'steer' | 'followUp') => Promise<void>
  runSlashCommand: (sessionId: string, command: string, args?: string) => Promise<SlashCommandResult>
  runShellCommand: (sessionId: string, command: string, agent?: string) => Promise<void>
  abort: (sessionId: string) => Promise<void>
  closeSession: (sessionId: string) => Promise<void>
  deleteSession: (sessionId: string) => Promise<void>
  renameSession: (sessionId: string, title: string) => Promise<AssistantSession>
  forkSession: (sessionId: string, messageId?: string) => Promise<AssistantSession>
  summarizeSession: (sessionId: string, model: { providerID: string; modelID: string; auto?: boolean }) => Promise<void>
  revertSession: (sessionId: string, messageId: string) => Promise<void>
  unrevertSession: (sessionId: string) => Promise<void>
  shareSession: (sessionId: string) => Promise<AssistantSession>
  unshareSession: (sessionId: string) => Promise<AssistantSession>
  getSessionData: (sessionId: string) => Promise<AssistantSession>
  listCapabilities: (sessionId?: string) => Promise<AssistantCapabilities>
  setModel: (sessionId: string, provider: string, modelId: string) => Promise<void>
  setThinkingLevel: (sessionId: string, level: 'off' | 'minimal' | 'low' | 'medium' | 'high' | 'xhigh') => Promise<void>
  setSteeringMode: (sessionId: string, mode: 'all' | 'one-at-a-time') => Promise<void>
  setFollowUpMode: (sessionId: string, mode: 'all' | 'one-at-a-time') => Promise<void>
  setAutoCompaction: (sessionId: string, enabled: boolean) => Promise<void>
  setAutoRetry: (sessionId: string, enabled: boolean) => Promise<void>
  getDiff: (sessionId: string, mode?: 'session' | 'vcs') => Promise<AssistantDiff[]>
  initGit: (sessionId: string) => Promise<unknown>
  respondToPermission: (
    sessionId: string,
    permissionId: string,
    response: 'once' | 'always' | 'reject',
  ) => Promise<void>
  respondToQuestion: (sessionId: string, requestId: string, answers: string[][]) => Promise<void>
  rejectQuestion: (sessionId: string, requestId: string) => Promise<void>
  onSessionEvent: (
    sessionId: string,
    callback: (event: AssistantSessionEvent) => void,
  ) => () => void
  respondToExtensionUi: (sessionId: string, response: unknown) => Promise<SlashCommandResult | void>
  executeTuiCommand: (sessionId: string | null, command: string) => Promise<void>
}

declare global {
  interface Window {
    openseAssistant?: OpenSeAssistantBridge
  }
}

export const getAssistantBridge = () => window.openseAssistant

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
  piSessionId?: string
  piSessionFile?: string
  firstMessage?: string
  messageCount?: number
  parentSessionPath?: string
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

export type AssistantMessageRole =
  | 'user'
  | 'assistant'
  | 'system'
  | 'tool'
  | 'toolResult'
  | 'bashExecution'
  | 'custom'
  | 'branchSummary'
  | 'compactionSummary'
  | (string & {})

export type AssistantMessagePart =
  | { type: 'text'; text: string; raw?: unknown }
  | { type: 'thinking'; text: string; raw?: unknown }
  | {
      type: 'toolCall'
      id: string
      name: string
      arguments?: unknown
      status?: string
      raw?: unknown
    }
  | {
      type: 'image'
      url?: string
      data?: string
      mimeType?: string
      alt?: string
      raw?: unknown
    }
  | { type: 'unknown'; label?: string; value: unknown; raw?: unknown }

export type AssistantTranscriptPart =
  | { id: string; messageId: string; type: 'text'; text: string; raw?: unknown }
  | { id: string; messageId: string; type: 'thinking'; text: string; raw?: unknown }
  | {
      id: string
      messageId: string
      type: 'toolCall'
      toolCallId?: string
      name: string
      arguments?: unknown
      status?: string
      raw?: unknown
    }
  | {
      id: string
      messageId: string
      type: 'image'
      url?: string
      data?: string
      mimeType?: string
      alt?: string
      raw?: unknown
    }
  | { id: string; messageId: string; type: 'unknown'; label?: string; value: unknown; raw?: unknown }

export type AssistantTranscriptMessageInfo = {
  id: string
  role: AssistantMessageRole
  content: string
  createdAt?: string
  status?: 'streaming' | 'complete' | 'error'
  parentMessageId?: string
  optimistic?: boolean
  raw?: unknown
  toolCallId?: string
  toolName?: string
  details?: unknown
}

export type AssistantTranscriptItem = {
  info: AssistantTranscriptMessageInfo
  parts: AssistantTranscriptPart[]
}

export type AssistantTranscriptPage = {
  items: AssistantTranscriptItem[]
  cursor?: string
  complete: boolean
  mode: 'replace' | 'prepend'
}

export type AssistantTranscriptMessage = AssistantTranscriptMessageInfo & {
  parts?: Array<AssistantMessagePart | AssistantTranscriptPart>
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
      type: 'option-list'
      title?: string
      message?: string
      selectionMode: 'single' | 'multiple'
      options: Array<{
        label: string
        value: string
        description?: string
        checked?: boolean
        disabled?: boolean
      }>
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
  | {
      type: 'transcript_snapshot'
      sessionId: string
      items: AssistantTranscriptItem[]
      cursor?: string
      complete?: boolean
      mode?: 'replace' | 'prepend'
    }
  | { type: 'transcript_optimistic_add'; sessionId: string; item: AssistantTranscriptItem }
  | { type: 'transcript_optimistic_remove'; sessionId: string; messageId: string }
  | { type: 'transcript_message_upsert'; sessionId: string; info: AssistantTranscriptMessageInfo; index?: number }
  | { type: 'transcript_message_remove'; sessionId: string; messageId: string }
  | { type: 'transcript_part_upsert'; sessionId: string; part: AssistantTranscriptPart; index?: number }
  | {
      type: 'transcript_part_delta'
      sessionId: string
      messageId: string
      partId: string
      partType: 'text' | 'thinking'
      delta: string
      raw?: unknown
    }
  | { type: 'transcript_part_remove'; sessionId: string; messageId: string; partId: string }
  | {
      type: 'transcript_unkeyed_delta'
      sessionId: string
      content: string
      partType?: 'text' | 'thinking' | 'toolCall' | string
      part?: AssistantMessagePart
      raw?: unknown
    }
  | { type: 'messages'; sessionId: string; messages: AssistantTranscriptMessage[]; replace?: boolean }
  | { type: 'message'; sessionId: string; message: AssistantTranscriptMessage }
  | {
      type: 'message_part'
      sessionId: string
      messageId?: string
      partId?: string
      content: string
      partType?: string
      part?: AssistantMessagePart
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
  loadTranscriptPage: (
    sessionId: string,
    options?: { before?: string; limit?: number },
  ) => Promise<AssistantTranscriptPage>
  sendCommand: (
    sessionId: string,
    command: string,
    behavior?: 'steer' | 'followUp',
    promptIds?: { messageID: string; textPartID: string },
  ) => Promise<void>
  runSlashCommand: (
    sessionId: string,
    command: string,
    args?: string,
    promptIds?: { messageID: string; textPartID: string },
  ) => Promise<SlashCommandResult>
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

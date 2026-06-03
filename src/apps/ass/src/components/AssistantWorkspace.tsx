import { useCallback, useEffect, useMemo, useReducer, useRef, useState, type FormEvent, type KeyboardEvent, type RefObject } from 'react'
import { NavLink, useNavigate, useParams } from 'react-router-dom'
import {
  AppShellLayout,
  type AppShellNavGroup,
  Badge,
  BasePage,
  Button,
  EmptyState,
  Spinner,
  ThemeProvider,
  cn,
} from '@repo/ui'
import {
  Bot,
  CheckCircle2,
  Clock3,
  CornerDownLeft,
  FolderOpen,
  GitBranch,
  GitFork,
  ListTodo,
  MessageSquare,
  PanelLeft,
  Plus,
  Send,
  Share2,
  ShieldCheck,
  Wrench,
} from 'lucide-react'
import { ExtensionRequestDialog } from './ExtensionRequestDialog'
import { TranscriptRenderer } from './TranscriptRenderer'
import {
  addSession,
  applySessionList,
  initialSessionViewState,
  reduceSessionEvent,
  selectTranscriptItems,
} from '../lib/sessionState'
import {
  getAssistantBridge,
  type AssistantCapabilities,
  type AssistantCommand,
  type AssistantQueueItem,
  type AssistantQueueState,
  type AssistantSession,
  type AssistantStatus,
  type AssistantSteerQueueState,
  type AssistantTodo,
  type AssistantTranscriptItem,
  type AssistantTranscriptPart,
  type ExtensionUiRequest,
  type SlashCommandResult,
} from '../lib/assistantBridge'

type Action =
  | { type: 'set-sessions'; sessions: Parameters<typeof applySessionList>[1] }
  | { type: 'add-session'; session: Parameters<typeof addSession>[1] }
  | { type: 'event'; event: Parameters<typeof reduceSessionEvent>[1] }
  | { type: 'activate'; sessionId: string | null }
  | { type: 'set-extension-request'; request: ExtensionUiRequest }
  | { type: 'clear-extension-request' }
  | { type: 'error'; error: string | null }

const reducer = (state: typeof initialSessionViewState, action: Action) => {
  if (action.type === 'set-sessions') return applySessionList(state, action.sessions)
  if (action.type === 'add-session') return addSession(state, action.session)
  if (action.type === 'event') return reduceSessionEvent(state, action.event)
  if (action.type === 'activate') return { ...state, activeSessionId: action.sessionId }
  if (action.type === 'set-extension-request') return { ...state, extensionRequest: action.request }
  if (action.type === 'clear-extension-request') return { ...state, extensionRequest: null }
  return { ...state, error: action.error }
}

const formatProjectName = (path: string) => {
  const parts = path.split('/').filter(Boolean)
  return parts[parts.length - 1] ?? path
}

const formatSessionLabel = (session: { displayName?: string; firstMessage?: string; piSessionId?: string; id: string }) =>
  session.displayName || session.firstMessage || session.piSessionId || session.id

const EMPTY_TRANSCRIPT_ITEMS: AssistantTranscriptItem[] = []
const EMPTY_TRANSCRIPT_PARTS: AssistantTranscriptPart[] = []

const SESSION_NAV_STEP = 5

const nextSessionNavCount = (current: number, total: number) => Math.min(total, current + SESSION_NAV_STEP)

const previousSessionNavCount = (current: number) => {
  if (current <= SESSION_NAV_STEP) return SESSION_NAV_STEP
  if (current % SESSION_NAV_STEP === 0) return current - SESSION_NAV_STEP
  return Math.max(SESSION_NAV_STEP, Math.floor(current / SESSION_NAV_STEP) * SESSION_NAV_STEP)
}

let promptIdSequence = 0

const createPromptIds = () => {
  promptIdSequence = (promptIdSequence + 1) % Number.MAX_SAFE_INTEGER
  const suffix = `${Date.now().toString(36)}${promptIdSequence.toString(36).padStart(4, '0')}`
  return {
    messageID: `msg_${suffix}`,
    textPartID: `prt_${suffix}`,
  }
}

const createOptimisticPromptItem = (
  promptIds: { messageID: string; textPartID: string },
  content: string,
): AssistantTranscriptItem => ({
  info: {
    id: promptIds.messageID,
    role: 'user',
    content,
    createdAt: new Date().toISOString(),
    status: 'complete',
    optimistic: true,
  },
  parts: [{
    id: promptIds.textPartID,
    messageId: promptIds.messageID,
    type: 'text',
    text: content,
  }],
})

const FORWARDED_SLASH_COMMAND_SOURCES = new Set(['prompt', 'extension', 'skill'])

const isForwardedSlashCommand = (commands: AssistantCommand[], commandName: string) => {
  const command = commands.find((item) => item.name.toLowerCase() === commandName.toLowerCase())
  return FORWARDED_SLASH_COMMAND_SOURCES.has(String(command?.source ?? '').toLowerCase())
}

type RuntimeState = {
  thinkingLevel?: 'off' | 'minimal' | 'low' | 'medium' | 'high' | 'xhigh'
  steeringMode?: 'all' | 'one-at-a-time'
  followUpMode?: 'all' | 'one-at-a-time'
  autoCompactionEnabled?: boolean
  autoRetryEnabled?: boolean
}

const canonicalTodos = (todos: AssistantTodo[], includeCancelled = false) =>
  todos.filter((todo) => includeCancelled || todo.status !== 'cancelled')

const selectCollapsedTodos = (todos: AssistantTodo[]) => {
  const visible = canonicalTodos(todos)
  if (visible.length <= 5) return visible

  const progressIndex = visible.findIndex((todo) => todo.status !== 'completed')
  if (progressIndex === -1) return visible.slice(-5)

  let start = Math.max(0, progressIndex - 2)
  let end = Math.min(visible.length, progressIndex + 3)

  while (end - start < 5) {
    if (start > 0) start -= 1
    else if (end < visible.length) end += 1
    else break
  }

  return visible.slice(start, end)
}

const todoCounts = (todos: AssistantTodo[], includeCancelled = false) =>
  canonicalTodos(todos, includeCancelled).reduce(
    (counts, todo) => ({ ...counts, [todo.status]: (counts[todo.status] ?? 0) + 1 }),
    {} as Record<string, number>,
  )

const todoStatusLabel = (status: string) => {
  if (status === 'in_progress') return 'active'
  if (status === 'completed') return 'done'
  return status
}

const TodoRows = ({
  todos,
  expanded = false,
  includeCancelled = false,
}: {
  todos: AssistantTodo[]
  expanded?: boolean
  includeCancelled?: boolean
}) => {
  const ordered = canonicalTodos(todos, includeCancelled)
  const visible = expanded ? ordered : selectCollapsedTodos(todos)
  const hidden = ordered.length - visible.length

  if (!ordered.length) return <p className="text-xs text-[var(--color-muted-foreground)]">No todos.</p>

  return (
    <div className="space-y-1.5">
      {visible.map((todo) => (
        <div
          key={todo.id}
          className={cn(
            'flex items-start gap-2 text-xs',
            todo.status === 'completed' && 'text-[var(--color-muted-foreground)]',
            todo.status === 'cancelled' && 'text-[var(--color-muted-foreground)] line-through',
          )}
        >
          {todo.status === 'completed' ? (
            <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--color-success)]" />
          ) : todo.status === 'in_progress' ? (
            <Clock3 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--color-primary)]" />
          ) : (
            <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--color-muted-foreground)]" />
          )}
          <span className="min-w-0 flex-1">
            <span className="block break-words">{todo.content}</span>
            {todo.explanation ? (
              <span className="block break-words text-[var(--color-muted-foreground)]">{todo.explanation}</span>
            ) : null}
          </span>
          <Badge>{todoStatusLabel(todo.status)}</Badge>
        </div>
      ))}
      {hidden > 0 ? <p className="text-xs text-[var(--color-muted-foreground)]">{hidden} more todos</p> : null}
    </div>
  )
}

const QueueRows = ({ label, items }: { label: string; items: AssistantQueueItem[] }) => {
  if (!items.length) return null
  return (
    <div className="space-y-1">
      <div className="text-[11px] font-medium uppercase text-[var(--color-muted-foreground)]">{label}</div>
      {items.map((item, index) => (
        <div key={item.id ?? `${label}-${index}`} className="break-words text-xs text-[var(--color-foreground)]">
          {item.content}
        </div>
      ))}
    </div>
  )
}

const WorkState = ({
  todos,
  queue,
  steerQueue,
  compact = false,
  todosExpanded = false,
  onToggleTodos,
}: {
  todos: AssistantTodo[]
  queue?: AssistantQueueState
  steerQueue?: AssistantSteerQueueState
  compact?: boolean
  todosExpanded?: boolean
  onToggleTodos?: () => void
}) => {
  const counts = todoCounts(todos)
  const hasTodos = canonicalTodos(todos).length > 0
  const steeringItems = queue?.steering ?? []
  const followUpItems = queue?.followUp ?? []
  const hasQueue = steeringItems.length > 0 || followUpItems.length > 0
  const activeSteer = Boolean(steerQueue?.active)

  if (!hasTodos && !hasQueue && !activeSteer) return null

  return (
    <div className={cn('space-y-2', compact ? 'text-xs' : 'border-b border-[var(--color-border)] px-3 py-2')}>
      {activeSteer ? (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-muted)] px-2 py-1.5 text-xs">
          <span className="flex min-w-0 items-center gap-2 text-[var(--color-foreground)]">
            <CornerDownLeft className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{steerQueue?.hint || 'Enter steers. Tab queues a follow-up.'}</span>
          </span>
          {typeof steerQueue?.queuedCount === 'number' && steerQueue.queuedCount > 0 ? (
            <Badge>{steerQueue.queuedCount} queued</Badge>
          ) : null}
        </div>
      ) : null}

      {hasQueue ? (
        <div className="grid gap-2 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-card)] p-2 sm:grid-cols-2">
          <QueueRows label="Steering" items={steeringItems} />
          <QueueRows label="Follow-up" items={followUpItems} />
        </div>
      ) : null}

      {hasTodos ? (
        <div
          role="button"
          tabIndex={0}
          aria-expanded={todosExpanded}
          aria-label={todosExpanded ? 'Collapse todos' : 'Expand todos'}
          onClick={onToggleTodos}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault()
              onToggleTodos?.()
            }
          }}
          className={cn(
            'cursor-pointer rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-card)] p-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]',
            compact && 'border-0 bg-transparent p-0',
          )}
        >
          <div className="mb-2 flex flex-wrap items-center gap-2 text-xs font-medium">
            <ListTodo className="h-3.5 w-3.5" />
            <span>Todos</span>
            {counts.in_progress ? <Badge>{counts.in_progress} active</Badge> : null}
            {counts.pending ? <Badge>{counts.pending} pending</Badge> : null}
            {counts.completed ? <Badge>{counts.completed} done</Badge> : null}
          </div>
          <TodoRows todos={todos} expanded={todosExpanded || compact} includeCancelled={todosExpanded} />
        </div>
      ) : null}
    </div>
  )
}

const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}

const getModelProvider = (model: unknown) => {
  const record = asRecord(model)
  return String(record.provider ?? record.providerID ?? record.providerId ?? '')
}

const getModelId = (model: unknown) => {
  const record = asRecord(model)
  return String(record.id ?? record.modelID ?? record.modelId ?? '')
}

const getModelLabel = (model: unknown) => {
  const provider = getModelProvider(model)
  const modelId = getModelId(model)
  if (provider && modelId) return `${provider}/${modelId}`
  return modelId || provider || 'Unknown model'
}

const normalizeCommand = (command: unknown): AssistantCommand | null => {
  if (typeof command === 'string') return { name: command.replace(/^\//, ''), source: 'prompt' }
  const record = asRecord(command)
  const name = typeof record.name === 'string' ? record.name.replace(/^\//, '') : ''
  if (!name) return null
  return {
    name,
    source: typeof record.source === 'string' ? record.source : 'prompt',
    description: typeof record.description === 'string' ? record.description : undefined,
  }
}

const slashCommandMatchesQuery = (command: AssistantCommand, query: string) => {
  const haystack = `${command.name} ${command.description ?? ''} ${command.source ?? ''}`.toLowerCase()
  return haystack.includes(query.toLowerCase())
}

type SelectExtensionUiRequest = Extract<ExtensionUiRequest, { type: 'select' }>

type InlineSelectPickerProps = {
  request: SelectExtensionUiRequest
  filter: string
  selection: number
  inputRef: RefObject<HTMLInputElement | null>
  options: SelectExtensionUiRequest['options']
  onFilterChange: (value: string) => void
  onKeyDown: (event: KeyboardEvent<HTMLElement>) => void
  onSelect: (option: SelectExtensionUiRequest['options'][number]) => void
  onCancel: () => void
}

const InlineSelectPicker = ({
  request,
  filter,
  selection,
  inputRef,
  options,
  onFilterChange,
  onKeyDown,
  onSelect,
  onCancel,
}: InlineSelectPickerProps) => {
  const title = request.title ?? 'Choose an option'
  const message = request.message ?? 'Select an option to continue.'

  return (
    <div className="mb-2 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-card)] p-2 shadow-lg">
      <div className="mb-2 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-sm font-medium text-[var(--color-foreground)]">{title}</div>
          <div className="truncate text-xs text-[var(--color-muted-foreground)]">{message}</div>
        </div>
        <Button type="button" size="xs" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
      </div>
      <input
        ref={inputRef}
        aria-label={`Filter ${title}`}
        value={filter}
        onChange={(event) => onFilterChange(event.target.value)}
        onKeyDown={onKeyDown}
        className="mb-2 h-8 w-full rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-transparent px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]"
      />
      <div role="listbox" aria-label={title} className="max-h-56 space-y-1 overflow-y-auto">
        {options.length ? (
          options.map((option, index) => (
            <button
              key={`${option.value}:${index}`}
              type="button"
              role="option"
              aria-selected={index === selection}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => onSelect(option)}
              className={cn(
                'flex w-full items-center rounded-[var(--radius-sm)] px-2 py-2 text-left text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]',
                index === selection ? 'bg-[var(--color-muted)]' : 'hover:bg-[var(--color-muted)]',
              )}
            >
              <span className="min-w-0 truncate">{option.label}</span>
            </button>
          ))
        ) : (
          <div className="px-2 py-3 text-sm text-[var(--color-muted-foreground)]">No matching options.</div>
        )}
      </div>
    </div>
  )
}

export const AssistantWorkspace = () => {
  const [state, dispatch] = useReducer(reducer, initialSessionViewState)
  const [status, setStatus] = useState<AssistantStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [sending, setSending] = useState(false)
  const [command, setCommand] = useState('')
  const [slashSelection, setSlashSelection] = useState(0)
  const [dismissedSlashText, setDismissedSlashText] = useState<string | null>(null)
  const [selectFilter, setSelectFilter] = useState('')
  const [selectSelection, setSelectSelection] = useState(0)
  const [expandedTodoSessionIds, setExpandedTodoSessionIds] = useState<Record<string, boolean>>({})
  const [visibleProjectSessionCounts, setVisibleProjectSessionCounts] = useState<Record<string, number>>({})
  const [capabilities, setCapabilities] = useState<AssistantCapabilities | null>(null)
  const [busyAction, setBusyAction] = useState<string | null>(null)
  const [loadingOlderTranscript, setLoadingOlderTranscript] = useState(false)
  const commandInputRef = useRef<HTMLTextAreaElement | null>(null)
  const selectInputRef = useRef<HTMLInputElement | null>(null)
  const navigate = useNavigate()
  const { sessionId: routeSessionId } = useParams()
  const bridge = getAssistantBridge()

  const activeSession = useMemo(
    () => state.sessions.find((session) => session.id === state.activeSessionId) ?? null,
    [state.activeSessionId, state.sessions],
  )
  const transcriptItems = useMemo(
    () => (activeSession ? selectTranscriptItems(state, activeSession.id) : EMPTY_TRANSCRIPT_ITEMS),
    [activeSession, state],
  )
  const liveTranscriptParts = activeSession ? state.liveUnkeyedBySessionId[activeSession.id] ?? EMPTY_TRANSCRIPT_PARTS : EMPTY_TRANSCRIPT_PARTS
  const transcriptHistory = activeSession ? state.historyBySessionId[activeSession.id] : undefined
  const todos = activeSession ? state.todosBySessionId[activeSession.id] ?? [] : []
  const todosExpanded = activeSession ? Boolean(expandedTodoSessionIds[activeSession.id]) : false
  const diffs = activeSession ? state.diffsBySessionId[activeSession.id] ?? [] : []
  const permissions = activeSession ? state.permissionsBySessionId[activeSession.id] ?? [] : []
  const questions = activeSession ? state.questionsBySessionId[activeSession.id] ?? [] : []
  const metadata = activeSession ? state.metadataBySessionId[activeSession.id] ?? {} : {}
  const runtimeState = (metadata.state ?? capabilities?.state ?? {}) as RuntimeState
  const queueState = metadata.queue
  const steerQueueState = metadata.steerQueue
  const extensionStatuses = asRecord(metadata.extensionStatuses) as Record<string, string>
  const extensionWidgets = asRecord(metadata.extensionWidgets) as Record<string, { lines?: string[]; placement?: string }>
  const extensionTitle = typeof metadata.extensionTitle === 'string' ? metadata.extensionTitle : ''
  const editorText = typeof metadata.editorText === 'string' ? metadata.editorText : ''
  const extensionNotification = asRecord(metadata.extensionNotification)
  const selectRequest = state.extensionRequest?.type === 'select' ? state.extensionRequest : null
  const dialogExtensionRequest = state.extensionRequest?.type === 'select' ? null : state.extensionRequest
  const availableModels = Array.isArray(capabilities?.models) ? capabilities.models : []
  const currentModel = availableModels.find((model) => getModelLabel(model) === activeSession?.model)
  const currentModelValue = currentModel ? `${getModelProvider(currentModel)}\t${getModelId(currentModel)}` : ''
  const slashQuery = command.match(/^\/([^\s]*)$/)?.[1]
  const slashCommands = useMemo(
    () => (capabilities?.commands ?? []).map(normalizeCommand).filter((item): item is AssistantCommand => Boolean(item)),
    [capabilities?.commands],
  )
  const filteredSlashCommands = useMemo(() => {
    if (slashQuery == null) return []
    return slashCommands.filter((item) => slashCommandMatchesQuery(item, slashQuery)).slice(0, 8)
  }, [slashCommands, slashQuery])
  const slashMenuOpen = !steerQueueState?.active && slashQuery != null && dismissedSlashText !== command && filteredSlashCommands.length > 0
  const filteredSelectOptions = useMemo(() => {
    if (!selectRequest) return []
    const query = selectFilter.trim().toLowerCase()
    if (!query) return selectRequest.options
    return selectRequest.options.filter((option) =>
      `${option.label} ${option.value}`.toLowerCase().includes(query),
    )
  }, [selectFilter, selectRequest])
  const toggleTodosExpanded = () => {
    if (!activeSession) return
    setExpandedTodoSessionIds((current) => ({
      ...current,
      [activeSession.id]: !current[activeSession.id],
    }))
  }

  useEffect(() => {
    let cancelled = false

    const loadInitialState = async () => {
      if (!bridge) {
        setStatus({ available: false, error: 'Open-Ass must be run inside OpenSe Desktop.' })
        setLoading(false)
        return
      }

      try {
        const [nextStatus, sessions] = await Promise.all([
          bridge.getStatus(),
          bridge.listSessions(),
        ])
        if (cancelled) return
        setStatus(nextStatus)
        dispatch({ type: 'set-sessions', sessions })
      } catch (error) {
        if (cancelled) return
        setStatus({ available: false, error: error instanceof Error ? error.message : String(error) })
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void loadInitialState()
    return () => {
      cancelled = true
    }
  }, [bridge])

  useEffect(() => {
    const sessionId = state.activeSessionId
    if (!bridge || !sessionId) {
      setCapabilities(null)
      return
    }

    let cancelled = false
    setCapabilities(null)

    const unsubscribe = bridge.onSessionEvent(sessionId, (event) => {
      dispatch({ type: 'event', event })
    })

    const loadActiveSession = async () => {
      try {
        const session = await bridge.openSession(sessionId)
        if (cancelled) return
        dispatch({ type: 'add-session', session })
        const nextCapabilities = await bridge.listCapabilities(session.id)
        if (!cancelled) setCapabilities(nextCapabilities)
      } catch (error) {
        if (!cancelled) {
          setCapabilities(null)
          dispatch({ type: 'error', error: error instanceof Error ? error.message : String(error) })
        }
      }
    }

    void loadActiveSession()

    return () => {
      cancelled = true
      unsubscribe()
    }
  }, [bridge, state.activeSessionId])

  useEffect(() => {
    if (routeSessionId && routeSessionId !== state.activeSessionId) {
      dispatch({ type: 'activate', sessionId: routeSessionId })
    }
  }, [routeSessionId, state.activeSessionId])

  useEffect(() => {
    if (editorText) setCommand(editorText)
  }, [editorText])

  useEffect(() => {
    setSlashSelection(0)
  }, [slashQuery])

  useEffect(() => {
    if (slashSelection >= filteredSlashCommands.length) setSlashSelection(0)
  }, [filteredSlashCommands.length, slashSelection])

  useEffect(() => {
    setSelectFilter('')
    setSelectSelection(0)
    if (!selectRequest) return
    const focusInput = () => selectInputRef.current?.focus()
    if (typeof window.requestAnimationFrame === 'function') window.requestAnimationFrame(focusInput)
    else focusInput()
  }, [selectRequest])

  useEffect(() => {
    if (selectSelection >= filteredSelectOptions.length) setSelectSelection(0)
  }, [filteredSelectOptions.length, selectSelection])

  const createSession = useCallback(async (directoryPath?: string) => {
    if (!bridge) return
    setCreating(true)
    dispatch({ type: 'error', error: null })
    try {
      const session = directoryPath
        ? await bridge.createSession({ directoryPath })
        : await bridge.createSession()
      if (!session) return
      dispatch({ type: 'add-session', session })
      navigate(`/sessions/${session.id}`)
    } catch (error) {
      dispatch({ type: 'error', error: error instanceof Error ? error.message : String(error) })
    } finally {
      setCreating(false)
    }
  }, [bridge, navigate])

  const loadOlderTranscript = async () => {
    if (!bridge || !activeSession || transcriptHistory?.complete || loadingOlderTranscript) return
    setLoadingOlderTranscript(true)
    try {
      const page = await bridge.loadTranscriptPage(activeSession.id, {
        before: transcriptHistory?.cursor,
        limit: 100,
      })
      dispatch({
        type: 'event',
        event: {
          type: 'transcript_snapshot',
          sessionId: activeSession.id,
          items: page.items,
          cursor: page.cursor,
          complete: page.complete,
          mode: page.mode,
        },
      })
    } catch (error) {
      dispatch({ type: 'error', error: error instanceof Error ? error.message : String(error) })
    } finally {
      setLoadingOlderTranscript(false)
    }
  }

  const handleSlashCommandResult = (result: SlashCommandResult, sessionId = activeSession?.id) => {
    if (result.handledBy !== 'builtin') return
    if (result.session) {
      dispatch({ type: 'add-session', session: result.session })
      navigate(`/sessions/${result.session.id}`)
    }
    if (result.uiRequest) dispatch({ type: 'set-extension-request', request: result.uiRequest })
    const messageSessionId = result.session?.id ?? sessionId
    if (result.message && messageSessionId) {
      dispatch({
        type: 'event',
        event: {
          type: 'message',
          sessionId: messageSessionId,
          message: {
            id: `builtin-${Date.now()}`,
            role: 'system',
            content: result.message,
            createdAt: new Date().toISOString(),
            status: 'complete',
          },
        },
      })
    }
  }

  const respondToExtensionUi = async (response: unknown) => {
    if (!bridge || !activeSession) return
    const result = await bridge.respondToExtensionUi(activeSession.id, response)
    if (result) handleSlashCommandResult(result, activeSession.id)
    dispatch({ type: 'clear-extension-request' })
  }

  const closeExtensionRequest = () => {
    if (activeSession && bridge && state.extensionRequest) {
      void bridge.respondToExtensionUi(activeSession.id, {
        id: state.extensionRequest.id,
        cancelled: true,
      })
    }
    dispatch({ type: 'clear-extension-request' })
  }

  const submitComposer = async (behavior: 'steer' | 'followUp' = steerQueueState?.active ? 'steer' : 'followUp') => {
    if (selectRequest) return
    if (!bridge || !activeSession || !command.trim()) return
    const nextCommand = command.trim()
    const route = (() => {
      if (nextCommand.startsWith('!')) {
        const shellCommand = nextCommand.slice(1).trim()
        if (!shellCommand) return { type: 'error' as const, error: 'Enter a shell command after !.' }
        return { type: 'shell' as const, command: shellCommand }
      }
      if (nextCommand.startsWith('/')) {
        const [slash, ...args] = nextCommand.slice(1).trim().split(/\s+/)
        if (!slash) return { type: 'error' as const, error: 'Enter a command after /.' }
        const joinedArgs = args.join(' ')
        return {
          type: 'slash' as const,
          command: slash,
          args: joinedArgs,
          promptText: `/${slash}${joinedArgs ? ` ${joinedArgs}` : ''}`,
        }
      }
      return { type: 'prompt' as const, command: nextCommand }
    })()
    if (route.type === 'error') {
      dispatch({ type: 'error', error: route.error })
      return
    }
    setCommand('')
    setSending(true)
    const optimisticPromptIds =
      route.type === 'prompt' || (route.type === 'slash' && isForwardedSlashCommand(slashCommands, route.command))
        ? createPromptIds()
        : null
    const optimisticText = route.type === 'slash' ? route.promptText : route.type === 'prompt' ? route.command : ''
    if (optimisticPromptIds) {
      dispatch({
        type: 'event',
        event: {
          type: 'transcript_optimistic_add',
          sessionId: activeSession.id,
          item: createOptimisticPromptItem(optimisticPromptIds, optimisticText),
        },
      })
    }
    try {
      if (route.type === 'shell') {
        await bridge.runShellCommand(activeSession.id, route.command)
      } else if (route.type === 'slash') {
        const result = await bridge.runSlashCommand(activeSession.id, route.command, route.args, optimisticPromptIds ?? undefined)
        if (optimisticPromptIds && result.handledBy !== 'pi') {
          dispatch({
            type: 'event',
            event: {
              type: 'transcript_optimistic_remove',
              sessionId: activeSession.id,
              messageId: optimisticPromptIds.messageID,
            },
          })
        }
        handleSlashCommandResult(result, activeSession.id)
      } else {
        await bridge.sendCommand(activeSession.id, route.command, behavior, optimisticPromptIds ?? undefined)
      }
    } catch (error) {
      if (optimisticPromptIds) {
        dispatch({
          type: 'event',
          event: {
            type: 'transcript_optimistic_remove',
            sessionId: activeSession.id,
            messageId: optimisticPromptIds.messageID,
          },
        })
      }
      dispatch({ type: 'error', error: error instanceof Error ? error.message : String(error) })
    } finally {
      setSending(false)
    }
  }

  const sendCommand = async (event: FormEvent) => {
    event.preventDefault()
    await submitComposer()
  }

  const insertSlashCommand = (item: AssistantCommand) => {
    setCommand(`/${item.name} `)
    setDismissedSlashText(null)
    const focusInput = () => commandInputRef.current?.focus()
    if (typeof window.requestAnimationFrame === 'function') window.requestAnimationFrame(focusInput)
    else focusInput()
  }

  const handleCommandChange = (value: string) => {
    setCommand(value)
    setDismissedSlashText(null)
  }

  const confirmSelectOption = (option?: SelectExtensionUiRequest['options'][number]) => {
    if (!selectRequest || !option) return
    void respondToExtensionUi({ id: selectRequest.id, value: option.value })
  }

  const handleSelectKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (!selectRequest) return false
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      if (filteredSelectOptions.length) {
        setSelectSelection((index) => (index + 1) % filteredSelectOptions.length)
      }
      return true
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault()
      if (filteredSelectOptions.length) {
        setSelectSelection((index) => (index - 1 + filteredSelectOptions.length) % filteredSelectOptions.length)
      }
      return true
    }
    if (event.key === 'Enter') {
      event.preventDefault()
      confirmSelectOption(filteredSelectOptions[selectSelection] ?? filteredSelectOptions[0])
      return true
    }
    if (event.key === 'Escape') {
      event.preventDefault()
      closeExtensionRequest()
      return true
    }
    return false
  }

  const handleCommandKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (handleSelectKeyDown(event)) return

    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      void submitComposer(steerQueueState?.active ? 'steer' : 'followUp')
      return
    }

    if (steerQueueState?.active && event.key === 'Tab') {
      event.preventDefault()
      void submitComposer('followUp')
      return
    }

    if (steerQueueState?.active) return
    if (!slashMenuOpen) return
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setSlashSelection((index) => (index + 1) % filteredSlashCommands.length)
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setSlashSelection((index) => (index - 1 + filteredSlashCommands.length) % filteredSlashCommands.length)
    } else if (event.key === 'Tab') {
      event.preventDefault()
      insertSlashCommand(filteredSlashCommands[slashSelection] ?? filteredSlashCommands[0])
    } else if (event.key === 'Escape') {
      event.preventDefault()
      setDismissedSlashText(command)
    }
  }

  const runSessionAction = async (name: string, action: () => Promise<void>) => {
    setBusyAction(name)
    dispatch({ type: 'error', error: null })
    try {
      await action()
      if (bridge && activeSession) {
        const session = await bridge.getSessionData(activeSession.id)
        dispatch({ type: 'add-session', session })
      }
    } catch (error) {
      dispatch({ type: 'error', error: error instanceof Error ? error.message : String(error) })
    } finally {
      setBusyAction(null)
    }
  }

  const forkActiveSession = async () => {
    if (!bridge || !activeSession) return
    await runSessionAction('fork', async () => {
      const session = await bridge.forkSession(activeSession.id)
      dispatch({ type: 'add-session', session })
      navigate(`/sessions/${session.id}`)
    })
  }

  const refreshCapabilities = async () => {
    if (!bridge || !activeSession) return
    setCapabilities(await bridge.listCapabilities(activeSession.id))
  }

  const setRuntimeModel = async (value: string) => {
    if (!bridge || !activeSession || !value) return
    const [provider, modelId] = value.split('\t')
    await runSessionAction('model', async () => {
      await bridge.setModel(activeSession.id, provider, modelId)
      await refreshCapabilities()
    })
  }

  const setThinkingLevel = async (level: RuntimeState['thinkingLevel']) => {
    if (!bridge || !activeSession || !level) return
    await runSessionAction('thinking', async () => {
      await bridge.setThinkingLevel(activeSession.id, level)
      await refreshCapabilities()
    })
  }

  const setQueueMode = async (kind: 'steering' | 'followUp', mode: 'all' | 'one-at-a-time') => {
    if (!bridge || !activeSession) return
    await runSessionAction(kind, async () => {
      if (kind === 'steering') await bridge.setSteeringMode(activeSession.id, mode)
      else await bridge.setFollowUpMode(activeSession.id, mode)
      await refreshCapabilities()
    })
  }

  const setRuntimeFlag = async (kind: 'autoCompaction' | 'autoRetry', enabled: boolean) => {
    if (!bridge || !activeSession) return
    await runSessionAction(kind, async () => {
      if (kind === 'autoCompaction') await bridge.setAutoCompaction(activeSession.id, enabled)
      else await bridge.setAutoRetry(activeSession.id, enabled)
      await refreshCapabilities()
    })
  }

  const toggleShareActiveSession = async () => {
    if (!bridge || !activeSession) return
    await runSessionAction('share', async () => {
      const session = activeSession.shareUrl
        ? await bridge.unshareSession(activeSession.id)
        : await bridge.shareSession(activeSession.id)
      dispatch({ type: 'add-session', session })
    })
  }

  const respondPermission = async (
    permissionId: string,
    response: 'once' | 'always' | 'reject',
  ) => {
    if (!bridge || !activeSession) return
    await bridge.respondToPermission(activeSession.id, permissionId, response)
  }

  const respondQuestion = async (requestId: string, label: string) => {
    if (!bridge || !activeSession) return
    await bridge.respondToQuestion(activeSession.id, requestId, [[label]])
  }

  const toggleProjectSessions = (directoryPath: string, currentCount: number, totalCount: number) => {
    setVisibleProjectSessionCounts((counts) => ({
      ...counts,
      [directoryPath]: currentCount > 0 ? 0 : Math.min(SESSION_NAV_STEP, totalCount),
    }))
  }

  const expandProjectSessions = (directoryPath: string, currentCount: number, totalCount: number) => {
    setVisibleProjectSessionCounts((counts) => ({
      ...counts,
      [directoryPath]: nextSessionNavCount(currentCount, totalCount),
    }))
  }

  const retractProjectSessions = (directoryPath: string, currentCount: number) => {
    setVisibleProjectSessionCounts((counts) => ({
      ...counts,
      [directoryPath]: previousSessionNavCount(currentCount),
    }))
  }

  const projectNavGroups = useMemo<AppShellNavGroup[]>(() => {
    const projects = new Map<string, AssistantSession[]>()
    for (const session of state.sessions) {
      const sessions = projects.get(session.directoryPath) ?? []
      sessions.push(session)
      projects.set(session.directoryPath, sessions)
    }

    return [
      {
        title: 'PROJECTS',
        trailing: (
          <Button
            type="button"
            size="xs"
            variant="ghost"
            aria-label="Add directory"
            onClick={() => void createSession()}
            loading={creating}
            className="h-6 w-6 p-0"
          >
            <Plus className="h-3.5 w-3.5" />
          </Button>
        ),
        items: Array.from(projects.entries()).map(([directoryPath, sessions]) => {
          const projectName = formatProjectName(directoryPath)
          const activeProjectSession = sessions.find((session) => session.id === state.activeSessionId)
          const targetSession = activeProjectSession ?? sessions[0]
          const activeSessionIndex = activeProjectSession ? sessions.findIndex((session) => session.id === activeProjectSession.id) : -1
          const activeProjectVisibleCount =
            activeSessionIndex === -1
              ? SESSION_NAV_STEP
              : Math.ceil((activeSessionIndex + 1) / SESSION_NAV_STEP) * SESSION_NAV_STEP
          const visibleSessionCount = Math.min(
            sessions.length,
            visibleProjectSessionCounts[directoryPath] ??
              (directoryPath === activeSession?.directoryPath ? activeProjectVisibleCount : 0),
          )
          const visibleSessions = sessions.slice(0, visibleSessionCount)
          const canExpandSessions = visibleSessionCount > 0 && visibleSessionCount < sessions.length
          const canRetractSessions = visibleSessionCount > SESSION_NAV_STEP

          return {
            href: `/sessions/${targetSession.id}`,
            label: projectName,
            ariaLabel: `Project ${projectName}`,
            icon: <FolderOpen className="h-4 w-4" />,
            isActive: () => directoryPath === activeSession?.directoryPath,
            onClick: () => toggleProjectSessions(directoryPath, visibleSessionCount, sessions.length),
            isExpanded: visibleSessionCount > 0,
            trailing: (
              <Button
                type="button"
                size="xs"
                variant="ghost"
                aria-label={`New session in ${projectName}`}
                onClick={() => void createSession(directoryPath)}
                loading={creating}
                className="h-6 w-6 p-0"
              >
                <Plus className="h-3.5 w-3.5" />
              </Button>
            ),
            children: (
              <div className="mt-0.5 flex flex-col gap-0.5 pl-7 pr-1">
                {visibleSessions.map((session) => (
                  <NavLink
                    key={session.id}
                    to={`/sessions/${session.id}`}
                    onClick={() => dispatch({ type: 'activate', sessionId: session.id })}
                    className={cn(
                      'block truncate rounded-[var(--radius-sm)] px-2 py-1 text-xs leading-5 text-[var(--color-muted-foreground)] transition-colors hover:text-[var(--color-foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]',
                      session.id === state.activeSessionId && 'font-medium text-[var(--color-foreground)]',
                    )}
                  >
                    {formatSessionLabel(session)}
                  </NavLink>
                ))}
                {canExpandSessions || canRetractSessions ? (
                  <div className="flex items-center justify-between gap-1 px-2 py-1">
                    {canExpandSessions ? (
                      <button
                        type="button"
                        aria-label={`Expand sessions in ${projectName}`}
                        className="text-xs font-medium text-[var(--color-muted-foreground)] transition-colors hover:text-[var(--color-foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]"
                        onClick={() => expandProjectSessions(directoryPath, visibleSessionCount, sessions.length)}
                      >
                        Expand
                      </button>
                    ) : null}
                    {canRetractSessions ? (
                      <button
                        type="button"
                        aria-label={`Retract sessions in ${projectName}`}
                        className="text-xs font-medium text-[var(--color-muted-foreground)] transition-colors hover:text-[var(--color-foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]"
                        onClick={() => retractProjectSessions(directoryPath, visibleSessionCount)}
                      >
                        Retract
                      </button>
                    ) : null}
                  </div>
                ) : null}
              </div>
            ),
          }
        }),
      },
    ]
  }, [activeSession?.directoryPath, createSession, creating, state.activeSessionId, state.sessions, visibleProjectSessionCounts])

  const shell = (
    <AppShellLayout
      brand={{ icon: <Bot />, name: 'Open-Ass', version: 'v1' }}
      navGroups={projectNavGroups}
      currentPath={activeSession ? `/sessions/${activeSession.id}` : '/'}
      renderNavLink={(item, { className, children }) => {
        const targetSession = state.sessions.find((session) => item.href === `/sessions/${session.id}`)
        return (
          <NavLink
            to={item.href}
            aria-label={item.ariaLabel}
            aria-expanded={item.isExpanded}
            className={className}
            onClick={(event) => {
              if (item.onClick) {
                event.preventDefault()
                item.onClick()
                return
              }
              if (targetSession) dispatch({ type: 'activate', sessionId: targetSession.id })
            }}
          >
            {children}
          </NavLink>
        )
      }}
      profileFallback="OA"
    >
      <BasePage contentClassName="h-full p-0" containerClassName="h-full min-h-0">
        <div className="grid h-full min-h-0 grid-cols-1 overflow-hidden xl:grid-cols-[minmax(0,1fr)_20rem]">
          <section className="flex min-h-0 flex-col bg-[var(--color-background)]">
            <header className="flex min-h-14 items-center justify-between gap-3 border-b border-[var(--color-border)] px-3 py-2">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h2 className="truncate text-sm font-semibold text-[var(--color-heading)]">
                    {activeSession?.displayName ?? 'Start a Pi session'}
                  </h2>
                  {activeSession ? (
                    <Badge variant={activeSession.status === 'running' ? 'success' : 'default'}>
                      {activeSession.status}
                    </Badge>
                  ) : null}
                </div>
                <p className="truncate text-xs text-[var(--color-muted-foreground)]">
                  {activeSession
                    ? `${activeSession.directoryPath}${activeSession.model ? ` - ${activeSession.model}` : ''}`
                    : status?.available
                      ? 'Choose a persisted session or start in a directory.'
                      : status?.error}
                </p>
              </div>
              {activeSession ? (
                <div className="flex shrink-0 items-center gap-1">
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    aria-label="Share session"
                    onClick={() => void toggleShareActiveSession()}
                    loading={busyAction === 'share'}
                  >
                    <Share2 className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    aria-label="Fork session"
                    onClick={() => void forkActiveSession()}
                    loading={busyAction === 'fork'}
                  >
                    <GitFork className="h-4 w-4" />
                  </Button>
                </div>
              ) : null}
            </header>

            {loading ? (
              <div className="grid min-h-0 flex-1 place-items-center">
                <Spinner />
              </div>
            ) : !status?.available ? (
              <div className="grid min-h-0 flex-1 place-items-center p-6">
                <EmptyState
                  title="Pi unavailable"
                  description={status?.error ?? 'Install the Pi CLI and restart OpenSe Desktop.'}
                />
              </div>
            ) : !activeSession ? (
              <div className="grid min-h-0 flex-1 place-items-center p-6">
                <div className="max-w-md">
                  <EmptyState
                    title="Choose a directory"
                    description="Open-Ass starts Pi in the selected workspace and keeps that session visible across Desktop restarts."
                  />
                  <div className="mt-4 flex justify-center">
                    <Button type="button" onClick={() => void createSession()} loading={creating}>
                      <FolderOpen className="h-4 w-4" />
                      Choose directory
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <>
                <div className="flex min-h-0 flex-1 flex-col px-4 py-3">
                  {state.error ? (
                    <div className="mb-3 rounded-[var(--radius-md)] border border-[var(--color-destructive)] bg-[color:color-mix(in_srgb,var(--color-destructive)_8%,transparent)] px-3 py-2 text-sm text-[var(--color-destructive)]">
                      {state.error}
                    </div>
                  ) : null}
                  {transcriptItems.length === 0 && liveTranscriptParts.length === 0 ? (
                    <EmptyState
                      title="No messages yet"
                      description="Send a command to Pi or open a persisted session to load messages."
                    />
                  ) : (
                    <div className="min-h-0 flex-1">
                      <TranscriptRenderer
                        items={transcriptItems}
                        liveParts={liveTranscriptParts}
                        canLoadOlder={Boolean(transcriptHistory && !transcriptHistory.complete)}
                        loadingOlder={loadingOlderTranscript}
                        onLoadOlder={loadOlderTranscript}
                      />
                    </div>
                  )}
                </div>

                <form onSubmit={sendCommand} className="border-t border-[var(--color-border)] p-3">
                  <WorkState
                    todos={todos}
                    queue={queueState}
                    steerQueue={steerQueueState}
                    todosExpanded={todosExpanded}
                    onToggleTodos={toggleTodosExpanded}
                  />
                  {selectRequest ? (
                    <InlineSelectPicker
                      request={selectRequest}
                      filter={selectFilter}
                      selection={selectSelection}
                      inputRef={selectInputRef}
                      options={filteredSelectOptions}
                      onFilterChange={(value) => {
                        setSelectFilter(value)
                        setSelectSelection(0)
                      }}
                      onKeyDown={handleSelectKeyDown}
                      onSelect={confirmSelectOption}
                      onCancel={closeExtensionRequest}
                    />
                  ) : null}
                  {!selectRequest && slashMenuOpen ? (
                    <div className="mb-2 max-h-64 overflow-y-auto rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-card)] p-1 shadow-lg">
                      <div role="listbox" aria-label="Slash commands" className="space-y-1">
                        {filteredSlashCommands.map((item, index) => (
                          <button
                            key={`${item.source ?? 'command'}:${item.name}`}
                            type="button"
                            role="option"
                            aria-selected={index === slashSelection}
                            onMouseDown={(event) => event.preventDefault()}
                            onClick={() => insertSlashCommand(item)}
                            className={cn(
                              'flex w-full items-start gap-3 rounded-[var(--radius-sm)] px-2 py-2 text-left text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]',
                              index === slashSelection ? 'bg-[var(--color-muted)]' : 'hover:bg-[var(--color-muted)]',
                            )}
                          >
                            <span className="min-w-0 flex-1">
                              <span className="block truncate font-mono font-medium text-[var(--color-foreground)]">
                                /{item.name}
                              </span>
                              {item.description ? (
                                <span className="block truncate text-xs text-[var(--color-muted-foreground)]">
                                  {item.description}
                                </span>
                              ) : null}
                            </span>
                            <Badge>{item.source ?? 'prompt'}</Badge>
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : null}
                  <div className="flex items-end gap-2">
                    <label className="sr-only" htmlFor="ass-command">
                      Send command
                    </label>
                    <textarea
                      ref={commandInputRef}
                      id="ass-command"
                      value={command}
                      onChange={(event) => handleCommandChange(event.target.value)}
                      onKeyDown={handleCommandKeyDown}
                      rows={2}
                      placeholder="Send a prompt, /command, or !shell command..."
                      className="min-h-12 flex-1 resize-none rounded-[var(--radius-md)] border border-[var(--color-border)] bg-transparent px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]"
                      disabled={Boolean(selectRequest) || (activeSession.status !== 'running' && activeSession.status !== 'starting')}
                    />
                    <Button type="submit" size="md" loading={sending} disabled={Boolean(selectRequest) || !command.trim()}>
                      <Send className="h-4 w-4" />
                      {steerQueueState?.active ? 'Steer' : 'Send'}
                    </Button>
                    {steerQueueState?.active ? (
                      <Button
                        type="button"
                        size="md"
                        variant="secondary"
                        loading={sending}
                        disabled={Boolean(selectRequest) || !command.trim()}
                        onClick={() => void submitComposer('followUp')}
                      >
                        <MessageSquare className="h-4 w-4" />
                        Queue
                      </Button>
                    ) : null}
                  </div>
                </form>
              </>
            )}
          </section>

          {activeSession ? (
            <aside className="hidden min-h-0 flex-col overflow-y-auto border-l border-[var(--color-border)] bg-[var(--color-surface)] p-3 xl:flex">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-[var(--color-heading)]">Session</h3>
                <Badge>{activeSession.status}</Badge>
              </div>

              <div className="space-y-3 text-xs">
                <section className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-card)] p-3">
                  <div className="mb-2 flex items-center gap-2 font-medium">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    Permissions
                  </div>
                  {permissions.length ? (
                    <div className="space-y-3">
                      {permissions.map((permission) => (
                        <div key={permission.id} className="space-y-2">
                          <p className="break-words text-[var(--color-foreground)]">{permission.permission}</p>
                          <p className="break-words text-[var(--color-muted-foreground)]">
                            {permission.patterns.join(', ') || 'No patterns'}
                          </p>
                          <div className="flex flex-wrap gap-1">
                            <Button type="button" size="xs" onClick={() => void respondPermission(permission.id, 'once')}>
                              Once
                            </Button>
                            <Button type="button" size="xs" variant="secondary" onClick={() => void respondPermission(permission.id, 'always')}>
                              Always
                            </Button>
                            <Button type="button" size="xs" variant="ghost" onClick={() => void respondPermission(permission.id, 'reject')}>
                              Reject
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[var(--color-muted-foreground)]">No pending permissions.</p>
                  )}
                </section>

                <section className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-card)] p-3">
                  <div className="mb-2 flex items-center gap-2 font-medium">
                    <MessageSquare className="h-3.5 w-3.5" />
                    Questions
                  </div>
                  {questions.length ? (
                    <div className="space-y-3">
                      {questions.map((request) => (
                        <div key={request.id} className="space-y-2">
                          {request.questions.map((question) => (
                            <div key={question.header} className="space-y-2">
                              <p className="font-medium">{question.question}</p>
                              <div className="flex flex-wrap gap-1">
                                {question.options.map((option) => (
                                  <Button key={option.label} type="button" size="xs" onClick={() => void respondQuestion(request.id, option.label)}>
                                    {option.label}
                                  </Button>
                                ))}
                              </div>
                            </div>
                          ))}
                          <Button type="button" size="xs" variant="ghost" onClick={() => void bridge?.rejectQuestion(activeSession.id, request.id)}>
                            Reject
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[var(--color-muted-foreground)]">No pending questions.</p>
                  )}
                </section>

                <section className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-card)] p-3">
                  <div className="mb-2 flex items-center gap-2 font-medium">
                    <GitBranch className="h-3.5 w-3.5" />
                    Changes
                  </div>
                  {diffs.length ? (
                    <div className="space-y-1">
                      {diffs.slice(0, 8).map((diff, index) => (
                        <div key={`${diff.file}-${index}`} className="flex items-center justify-between gap-2">
                          <span className="truncate">{diff.file ?? 'Change'}</span>
                          <span className="text-[var(--color-muted-foreground)]">
                            +{diff.additions} -{diff.deletions}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[var(--color-muted-foreground)]">No tracked changes.</p>
                  )}
                </section>

                <section className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-card)] p-3">
                  <div className="mb-2 flex items-center gap-2 font-medium">
                    <PanelLeft className="h-3.5 w-3.5" />
                    Extension UI
                  </div>
                  {extensionTitle ||
                  Object.keys(extensionStatuses).length ||
                  Object.keys(extensionWidgets).length ||
                  extensionNotification.message ||
                  editorText ? (
                    <div className="space-y-2 text-[var(--color-muted-foreground)]">
                      {extensionTitle ? (
                        <div className="flex justify-between gap-2">
                          <span>Title</span>
                          <span className="truncate text-right text-[var(--color-foreground)]">{extensionTitle}</span>
                        </div>
                      ) : null}
                      {Object.entries(extensionStatuses).map(([key, value]) => (
                        <div key={key} className="flex justify-between gap-2">
                          <span className="truncate">{key}</span>
                          <Badge>{value || 'Idle'}</Badge>
                        </div>
                      ))}
                      {Object.entries(extensionWidgets).map(([key, widget]) => (
                        <div key={key} className="rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-muted)] p-2">
                          <div className="mb-1 flex items-center justify-between gap-2 text-[var(--color-foreground)]">
                            <span className="font-medium">{key}</span>
                            {widget.placement ? <span>{widget.placement}</span> : null}
                          </div>
                          {widget.lines?.length ? (
                            <pre className="m-0 whitespace-pre-wrap break-words font-mono text-[11px]">
                              {widget.lines.join('\n')}
                            </pre>
                          ) : (
                            <p>No widget content.</p>
                          )}
                        </div>
                      ))}
                      {extensionNotification.message ? (
                        <div className="rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-muted)] p-2">
                          <div className="mb-1 font-medium text-[var(--color-foreground)]">
                            {String(extensionNotification.type ?? 'Notification')}
                          </div>
                          <p>{String(extensionNotification.message)}</p>
                        </div>
                      ) : null}
                      {editorText ? (
                        <Button type="button" size="xs" variant="secondary" onClick={() => setCommand(editorText)}>
                          Use editor text
                        </Button>
                      ) : null}
                    </div>
                  ) : (
                    <p className="text-[var(--color-muted-foreground)]">No extension UI state.</p>
                  )}
                </section>

                <section className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-card)] p-3">
                  <div className="mb-2 flex items-center gap-2 font-medium">
                    <Wrench className="h-3.5 w-3.5" />
                    Runtime controls
                  </div>
                  <div className="space-y-2 text-[var(--color-muted-foreground)]">
                    <label className="block">
                      <span className="mb-1 block">Model</span>
                      <select
                        value={currentModelValue}
                        onChange={(event) => void setRuntimeModel(event.target.value)}
                        disabled={!availableModels.length || busyAction === 'model'}
                        className="h-8 w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-transparent px-2 text-xs text-[var(--color-foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]"
                      >
                        <option value="">{activeSession.model ?? 'Default model'}</option>
                        {availableModels.map((model) => {
                          const provider = getModelProvider(model)
                          const modelId = getModelId(model)
                          if (!provider || !modelId) return null
                          return (
                            <option key={`${provider}/${modelId}`} value={`${provider}\t${modelId}`}>
                              {getModelLabel(model)}
                            </option>
                          )
                        })}
                      </select>
                    </label>

                    <label className="block">
                      <span className="mb-1 block">Thinking</span>
                      <select
                        value={runtimeState.thinkingLevel ?? 'off'}
                        onChange={(event) => void setThinkingLevel(event.target.value as RuntimeState['thinkingLevel'])}
                        disabled={busyAction === 'thinking'}
                        className="h-8 w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-transparent px-2 text-xs text-[var(--color-foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]"
                      >
                        {['off', 'minimal', 'low', 'medium', 'high', 'xhigh'].map((level) => (
                          <option key={level} value={level}>
                            {level}
                          </option>
                        ))}
                      </select>
                    </label>

                    <div className="grid grid-cols-2 gap-2">
                      <label className="block">
                        <span className="mb-1 block">Steering</span>
                        <select
                          value={runtimeState.steeringMode ?? 'one-at-a-time'}
                          onChange={(event) => void setQueueMode('steering', event.target.value as 'all' | 'one-at-a-time')}
                          disabled={busyAction === 'steering'}
                          className="h-8 w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-transparent px-2 text-xs text-[var(--color-foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]"
                        >
                          <option value="one-at-a-time">One</option>
                          <option value="all">All</option>
                        </select>
                      </label>
                      <label className="block">
                        <span className="mb-1 block">Follow-up</span>
                        <select
                          value={runtimeState.followUpMode ?? 'one-at-a-time'}
                          onChange={(event) => void setQueueMode('followUp', event.target.value as 'all' | 'one-at-a-time')}
                          disabled={busyAction === 'followUp'}
                          className="h-8 w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-transparent px-2 text-xs text-[var(--color-foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]"
                        >
                          <option value="one-at-a-time">One</option>
                          <option value="all">All</option>
                        </select>
                      </label>
                    </div>

                    <label className="flex items-center justify-between gap-2">
                      <span>Auto compaction</span>
                      <input
                        type="checkbox"
                        checked={Boolean(runtimeState.autoCompactionEnabled)}
                        onChange={(event) => void setRuntimeFlag('autoCompaction', event.target.checked)}
                        disabled={busyAction === 'autoCompaction'}
                        className="h-4 w-4 accent-[var(--color-primary)]"
                      />
                    </label>
                    <label className="flex items-center justify-between gap-2">
                      <span>Auto retry</span>
                      <input
                        type="checkbox"
                        checked={Boolean(runtimeState.autoRetryEnabled)}
                        onChange={(event) => void setRuntimeFlag('autoRetry', event.target.checked)}
                        disabled={busyAction === 'autoRetry'}
                        className="h-4 w-4 accent-[var(--color-primary)]"
                      />
                    </label>
                  </div>
                </section>

                <section className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-card)] p-3">
                  <div className="mb-2 flex items-center gap-2 font-medium">
                    <Wrench className="h-3.5 w-3.5" />
                    Runtime
                  </div>
                  <dl className="space-y-1 text-[var(--color-muted-foreground)]">
                    <div className="flex justify-between gap-2">
                      <dt>Model</dt>
                      <dd className="truncate text-right">{activeSession.model ?? 'Default'}</dd>
                    </div>
                    <div className="flex justify-between gap-2">
                      <dt>Agent</dt>
                      <dd className="truncate text-right">{activeSession.agent ?? 'Default'}</dd>
                    </div>
                    <div className="flex justify-between gap-2">
                      <dt>Tools</dt>
                      <dd>{capabilities?.tools?.length ?? '...'}</dd>
                    </div>
                    <div className="flex justify-between gap-2">
                      <dt>MCP</dt>
                      <dd>{metadata.mcp || capabilities?.mcp ? 'Loaded' : 'None'}</dd>
                    </div>
                    <div className="flex justify-between gap-2">
                      <dt>LSP</dt>
                      <dd>{metadata.lsp || capabilities?.lsp ? 'Loaded' : 'None'}</dd>
                    </div>
                  </dl>
                </section>
              </div>
            </aside>
          ) : null}
        </div>
      </BasePage>
    </AppShellLayout>
  )

  return (
    <ThemeProvider
      defaultTheme="light"
      storageKey="opense-theme"
      cookieKey="opense-theme"
      respectStoredTheme={true}
    >
      {shell}
      <ExtensionRequestDialog
        request={dialogExtensionRequest}
        onRespond={(response) => void respondToExtensionUi(response)}
        onCancel={closeExtensionRequest}
      />
    </ThemeProvider>
  )
}

import { useCallback, useEffect, useMemo, useReducer, useRef, useState, type FormEvent, type KeyboardEvent, type RefObject } from 'react'
import { NavLink, useNavigate, useParams } from 'react-router-dom'
import {
  AppShellLayout,
  type AppShellNavGroup,
  Badge,
  BasePage,
  Button,
  Dropdown,
  DropdownItem,
  EmptyState,
  SideNavItem,
  Spinner,
  ThemeProvider,
  cn,
} from '@repo/ui'
import {
  buildConfiguredAccountsProfileUrl,
  buildConfiguredAccountsSettingsUrl,
} from '@repo/shared/utils'
import {
  Bot,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock3,
  CornerDownLeft,
  FolderOpen,
  GitFork,
  ListTodo,
  MessageSquare,
  PanelLeft,
  Plus,
  Settings,
  Share2,
} from 'lucide-react'
import { ExtensionRequestDialog } from './ExtensionRequestDialog'
import { PiTerminalView } from './PiTerminalView'
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
const HIDDEN_EXTENSION_WIDGET_KEYS = new Set(['todo-list'])

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
type OptionListExtensionUiRequest = Extract<ExtensionUiRequest, { type: 'option-list' }>
type InlineOptionPickerRequest = SelectExtensionUiRequest | OptionListExtensionUiRequest
type InlineOptionPickerOption = InlineOptionPickerRequest['options'][number]

type InlineOptionPickerProps = {
  request: InlineOptionPickerRequest
  filter: string
  selection: number
  focusRef: RefObject<HTMLInputElement | HTMLDivElement | null>
  options: InlineOptionPickerOption[]
  checkedValues: Set<string>
  onFilterChange: (value: string) => void
  onKeyDown: (event: KeyboardEvent<HTMLElement>) => void
  onSelect: (option: InlineOptionPickerOption) => void
  onSubmit: () => void
  onCancel: () => void
}

const InlineOptionPicker = ({
  request,
  filter,
  selection,
  focusRef,
  options,
  checkedValues,
  onFilterChange,
  onKeyDown,
  onSelect,
  onSubmit,
  onCancel,
}: InlineOptionPickerProps) => {
  const title = request.title ?? 'Choose an option'
  const message = request.message ?? 'Select an option to continue.'
  const searchable = request.type === 'select'
  const multiple = request.type === 'option-list' && request.selectionMode === 'multiple'
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([])

  useEffect(() => {
    optionRefs.current = optionRefs.current.slice(0, options.length)
    optionRefs.current[selection]?.scrollIntoView?.({ block: 'nearest' })
  }, [options.length, selection])

  return (
    <div
      ref={searchable ? undefined : focusRef}
      tabIndex={searchable ? undefined : 0}
      onKeyDown={searchable ? undefined : onKeyDown}
      className="mb-2 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-card)] p-2 shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]"
    >
      <div className="mb-2 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-sm font-medium text-[var(--color-foreground)]">{title}</div>
          <div className="truncate text-xs text-[var(--color-muted-foreground)]">{message}</div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {multiple ? (
            <Button type="button" size="xs" variant="secondary" onClick={onSubmit}>
              Submit
            </Button>
          ) : null}
          <Button type="button" size="xs" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </div>
      {searchable ? (
        <input
          ref={focusRef as RefObject<HTMLInputElement | null>}
          aria-label={`Filter ${title}`}
          value={filter}
          onChange={(event) => onFilterChange(event.target.value)}
          onKeyDown={onKeyDown}
          className="mb-2 h-8 w-full rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-transparent px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]"
        />
      ) : null}
      <div role="listbox" aria-label={title} className="max-h-56 space-y-1 overflow-y-auto">
        {options.length ? (
          options.map((option, index) => (
            <button
              key={`${option.value}:${index}`}
              ref={(element) => {
                optionRefs.current[index] = element
              }}
              type="button"
              role="option"
              aria-selected={index === selection}
              aria-checked={checkedValues.has(option.value)}
              disabled={'disabled' in option ? option.disabled : false}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => onSelect(option)}
              className={cn(
                'flex w-full items-start gap-2 rounded-[var(--radius-sm)] px-2 py-2 text-left text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)] disabled:cursor-not-allowed disabled:opacity-50',
                index === selection ? 'bg-[var(--color-muted)]' : 'hover:bg-[var(--color-muted)]',
              )}
            >
              {request.type === 'option-list' ? (
                <span
                  className={cn(
                    'mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border border-[var(--color-border)]',
                    checkedValues.has(option.value) ? 'bg-[var(--color-primary)] text-[var(--color-primary-foreground)]' : 'bg-transparent',
                  )}
                  aria-hidden="true"
                >
                  {checkedValues.has(option.value) ? <Check className="h-3 w-3" /> : null}
                </span>
              ) : null}
              <span className="min-w-0 flex-1 truncate">
                <span>{option.label}</span>
                {'description' in option && option.description ? (
                  <span className="text-[var(--color-muted-foreground)]"> - {option.description}</span>
                ) : null}
              </span>
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
  const [optionListCheckedValues, setOptionListCheckedValues] = useState<Set<string>>(() => new Set())
  const [expandedTodoSessionIds, setExpandedTodoSessionIds] = useState<Record<string, boolean>>({})
  const [visibleProjectSessionCounts, setVisibleProjectSessionCounts] = useState<Record<string, number>>({})
  const [capabilities, setCapabilities] = useState<AssistantCapabilities | null>(null)
  const [busyAction, setBusyAction] = useState<string | null>(null)
  const [chatDisplayMode, setChatDisplayMode] = useState<'modern' | 'terminal'>('modern')
  const [loadingOlderTranscript, setLoadingOlderTranscript] = useState(false)
  const commandInputRef = useRef<HTMLTextAreaElement | null>(null)
  const inlinePickerFocusRef = useRef<HTMLInputElement | HTMLDivElement | null>(null)
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
  const metadata = activeSession ? state.metadataBySessionId[activeSession.id] ?? {} : {}
  const runtimeState = (metadata.state ?? capabilities?.state ?? {}) as RuntimeState
  const queueState = metadata.queue
  const steerQueueState = metadata.steerQueue
  const extensionStatuses = asRecord(metadata.extensionStatuses) as Record<string, string>
  const extensionWidgets = asRecord(metadata.extensionWidgets) as Record<string, { lines?: string[]; placement?: string }>
  const visibleExtensionWidgets = Object.fromEntries(
    Object.entries(extensionWidgets).filter(([key]) => !HIDDEN_EXTENSION_WIDGET_KEYS.has(key)),
  )
  const extensionTitle = typeof metadata.extensionTitle === 'string' ? metadata.extensionTitle : ''
  const editorText = typeof metadata.editorText === 'string' ? metadata.editorText : ''
  const extensionNotification = asRecord(metadata.extensionNotification)
  const hasExtensionUiState = Boolean(
    extensionTitle ||
    Object.keys(extensionStatuses).length ||
    Object.keys(visibleExtensionWidgets).length ||
    extensionNotification.message ||
    editorText,
  )
  const inlineOptionRequest =
    state.extensionRequest?.type === 'select' || state.extensionRequest?.type === 'option-list'
      ? state.extensionRequest
      : null
  const dialogExtensionRequest = inlineOptionRequest ? null : state.extensionRequest
  const availableModels = Array.isArray(capabilities?.models) ? capabilities.models : []
  const currentModel = availableModels.find((model) => getModelLabel(model) === activeSession?.model)
  const currentModelValue = currentModel ? `${getModelProvider(currentModel)}\t${getModelId(currentModel)}` : ''
  const currentModelLabel = currentModel ? getModelLabel(currentModel) : activeSession?.model ?? 'Default model'
  const currentThinkingLabel = runtimeState.thinkingLevel ?? 'off'
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
  const activeSessionLabel = activeSession ? formatSessionLabel(activeSession) : 'Start a Pi session'
  const activeSessionSubtitle = activeSession
    ? ''
    : status?.available
      ? 'Choose a persisted session or start in a directory.'
      : status?.error
  const filteredSelectOptions = useMemo(() => {
    if (!inlineOptionRequest) return []
    if (inlineOptionRequest.type === 'option-list') return inlineOptionRequest.options
    const query = selectFilter.trim().toLowerCase()
    if (!query) return inlineOptionRequest.options
    return inlineOptionRequest.options.filter((option) =>
      `${option.label} ${option.value}`.toLowerCase().includes(query),
    )
  }, [selectFilter, inlineOptionRequest])
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
    setOptionListCheckedValues(
      inlineOptionRequest?.type === 'option-list'
        ? new Set(inlineOptionRequest.options.filter((option) => option.checked).map((option) => option.value))
        : new Set(),
    )
    if (!inlineOptionRequest) {
      setSelectSelection(0)
      return
    }
    const selectedIndex =
      inlineOptionRequest.type === 'option-list'
        ? inlineOptionRequest.options.findIndex((option) => option.checked && !option.disabled)
        : -1
    const firstEnabledIndex = inlineOptionRequest.options.findIndex((option) => !('disabled' in option && option.disabled))
    setSelectSelection(selectedIndex >= 0 ? selectedIndex : Math.max(firstEnabledIndex, 0))
    const focusInput = () => inlinePickerFocusRef.current?.focus()
    if (typeof window.requestAnimationFrame === 'function') window.requestAnimationFrame(focusInput)
    else focusInput()
  }, [inlineOptionRequest?.id])

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
    if (inlineOptionRequest) return
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

  const confirmInlineOption = (option?: InlineOptionPickerOption) => {
    if (!inlineOptionRequest || !option || ('disabled' in option && option.disabled)) return
    if (inlineOptionRequest.type === 'option-list' && inlineOptionRequest.selectionMode === 'multiple') {
      setOptionListCheckedValues((current) => {
        const next = new Set(current)
        if (next.has(option.value)) next.delete(option.value)
        else next.add(option.value)
        return next
      })
      return
    }
    void respondToExtensionUi({ id: inlineOptionRequest.id, value: option.value })
  }

  const submitInlineOptions = () => {
    if (!inlineOptionRequest) return
    if (inlineOptionRequest.type === 'option-list' && inlineOptionRequest.selectionMode === 'multiple') {
      void respondToExtensionUi({ id: inlineOptionRequest.id, values: Array.from(optionListCheckedValues) })
      return
    }
    confirmInlineOption(filteredSelectOptions[selectSelection] ?? filteredSelectOptions[0])
  }

  const moveInlineSelection = (direction: 1 | -1) => {
    if (!filteredSelectOptions.length) return
    setSelectSelection((index) => {
      for (let offset = 1; offset <= filteredSelectOptions.length; offset += 1) {
        const nextIndex = (index + direction * offset + filteredSelectOptions.length) % filteredSelectOptions.length
        const option = filteredSelectOptions[nextIndex]
        if (!('disabled' in option && option.disabled)) return nextIndex
      }
      return index
    })
  }

  const handleSelectKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (!inlineOptionRequest) return false
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      moveInlineSelection(1)
      return true
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault()
      moveInlineSelection(-1)
      return true
    }
    if (event.key === 'Enter') {
      event.preventDefault()
      submitInlineOptions()
      return true
    }
    if (event.key === ' ') {
      event.preventDefault()
      confirmInlineOption(filteredSelectOptions[selectSelection] ?? filteredSelectOptions[0])
      return true
    }
    if (event.key === 'Escape') {
      event.preventDefault()
      closeExtensionRequest()
      return true
    }
    return false
  }

  useEffect(() => {
    if (!inlineOptionRequest || inlineOptionRequest.type !== 'option-list') return
    const handleDocumentKeyDown = (event: globalThis.KeyboardEvent) => {
      const root = inlinePickerFocusRef.current
      if (root && root.contains(document.activeElement)) return
      if (event.key === 'ArrowDown') {
        event.preventDefault()
        moveInlineSelection(1)
      } else if (event.key === 'ArrowUp') {
        event.preventDefault()
        moveInlineSelection(-1)
      } else if (event.key === 'Enter') {
        event.preventDefault()
        submitInlineOptions()
      } else if (event.key === ' ') {
        event.preventDefault()
        confirmInlineOption(filteredSelectOptions[selectSelection] ?? filteredSelectOptions[0])
      } else if (event.key === 'Escape') {
        event.preventDefault()
        closeExtensionRequest()
      }
    }
    document.addEventListener('keydown', handleDocumentKeyDown)
    return () => document.removeEventListener('keydown', handleDocumentKeyDown)
  }, [inlineOptionRequest, filteredSelectOptions, selectSelection, optionListCheckedValues])

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

  const toggleShareActiveSession = async () => {
    if (!bridge || !activeSession) return
    await runSessionAction('share', async () => {
      const session = activeSession.shareUrl
        ? await bridge.unshareSession(activeSession.id)
        : await bridge.shareSession(activeSession.id)
      dispatch({ type: 'add-session', session })
    })
  }

  const initializePiConfig = async () => {
    if (!bridge || !activeSession?.directoryPath) return
    await runSessionAction('initialize', async () => {
      await bridge.initializePiConfig({ directoryPath: activeSession.directoryPath })
    })
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

          const isProjectActive =
            chatDisplayMode === 'terminal' && directoryPath === activeSession?.directoryPath

          return {
            href: `/sessions/${targetSession.id}`,
            label: projectName,
            ariaLabel: `Project ${projectName}`,
            icon: <FolderOpen className="h-4 w-4" />,
            isActive: () => isProjectActive,
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
              <div className="mt-0.5 flex flex-col gap-0.5">
                {visibleSessions.map((session) => {
                  const sessionLabel = formatSessionLabel(session)
                  const isSessionActive =
                    chatDisplayMode !== 'terminal' && session.id === state.activeSessionId
                  return (
                    <SideNavItem
                      key={session.id}
                      active={isSessionActive}
                      renderLink={({ className, children: linkChildren }) => (
                        <NavLink
                          to={`/sessions/${session.id}`}
                          aria-label={sessionLabel}
                          className={className}
                          onClick={() => dispatch({ type: 'activate', sessionId: session.id })}
                        >
                          {linkChildren}
                        </NavLink>
                      )}
                    >
                      <span className="h-4 w-4 shrink-0" aria-hidden="true" />
                      <span className="min-w-0 flex-1 truncate">{sessionLabel}</span>
                    </SideNavItem>
                  )
                })}
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
  }, [activeSession?.directoryPath, chatDisplayMode, createSession, creating, state.activeSessionId, state.sessions, visibleProjectSessionCounts])

  const shell = (
    <AppShellLayout
      brand={{ icon: <Bot />, name: 'Open-Ass', version: 'v1' }}
      navGroups={projectNavGroups}
      currentPath={activeSession ? `/sessions/${activeSession.id}` : '/'}
      searchContent={(
        <div className="flex min-w-0 flex-1 items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex min-w-0 items-center gap-2">
              <h1 className="truncate text-sm font-semibold text-[var(--color-heading)]">
                {activeSessionLabel}
              </h1>
              {activeSession ? (
                <Badge variant={activeSession.status === 'running' ? 'success' : 'default'}>
                  {activeSession.status}
                </Badge>
              ) : null}
            </div>
            {activeSessionSubtitle ? (
              <p className="hidden truncate text-xs text-[var(--color-muted-foreground)] sm:block">
                {activeSessionSubtitle}
              </p>
            ) : null}
          </div>
          {status?.available ? (
            <div className="flex shrink-0 items-center gap-1">
              {activeSession ? (
                <>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    aria-label="Initialise Pi config in this project"
                    onClick={() => void initializePiConfig()}
                    loading={busyAction === 'initialize'}
                    disabled={!activeSession.directoryPath}
                  >
                    Initialise
                  </Button>
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
                </>
              ) : null}
              <Dropdown
                align="right"
                trigger={(open) => (
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    aria-label="Chat display settings"
                    aria-haspopup="menu"
                    aria-expanded={open}
                  >
                    <Settings className="h-4 w-4" />
                  </Button>
                )}
              >
                <DropdownItem
                  onClick={() => setChatDisplayMode('modern')}
                  icon={chatDisplayMode === 'modern' ? <Check className="h-4 w-4" /> : <span className="h-4 w-4" />}
                >
                  Modern
                </DropdownItem>
                <DropdownItem
                  onClick={() => setChatDisplayMode('terminal')}
                  icon={chatDisplayMode === 'terminal' ? <Check className="h-4 w-4" /> : <span className="h-4 w-4" />}
                >
                  Terminal
                </DropdownItem>
              </Dropdown>
            </div>
          ) : null}
        </div>
      )}
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
      onProfileClick={() => {
        window.location.assign(buildConfiguredAccountsProfileUrl())
      }}
      onSettingsClick={() => {
        window.location.assign(buildConfiguredAccountsSettingsUrl())
      }}
    >
      <BasePage contentClassName="h-full p-0" containerClassName="h-full min-h-0">
        <div className="h-full min-h-0 overflow-hidden">
          <section className="relative flex h-full min-h-0 flex-col bg-[var(--color-background)]">
            {chatDisplayMode === 'modern' && activeSession && hasExtensionUiState ? (
              <section className="absolute right-4 top-4 z-20 max-h-[45vh] w-[min(22rem,calc(100%-2rem))] overflow-y-auto rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-card)] p-3 text-xs shadow-lg">
                <div className="mb-2 flex items-center gap-2 font-medium">
                  <PanelLeft className="h-3.5 w-3.5" />
                  Extension UI
                </div>
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
                  {Object.entries(visibleExtensionWidgets).map(([key, widget]) => (
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
              </section>
            ) : null}

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
            ) : chatDisplayMode === 'terminal' && bridge ? (
              <PiTerminalView
                bridge={bridge}
                directoryPath={activeSession?.directoryPath}
                visible={chatDisplayMode === 'terminal'}
              />
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

                <form onSubmit={sendCommand} className="p-3">
                  <WorkState
                    todos={todos}
                    queue={queueState}
                    steerQueue={steerQueueState}
                    todosExpanded={todosExpanded}
                    onToggleTodos={toggleTodosExpanded}
                  />
                  {inlineOptionRequest ? (
                    <InlineOptionPicker
                      request={inlineOptionRequest}
                      filter={selectFilter}
                      selection={selectSelection}
                      focusRef={inlinePickerFocusRef}
                      options={filteredSelectOptions}
                      checkedValues={optionListCheckedValues}
                      onFilterChange={(value) => {
                        setSelectFilter(value)
                        setSelectSelection(0)
                      }}
                      onKeyDown={handleSelectKeyDown}
                      onSelect={confirmInlineOption}
                      onSubmit={submitInlineOptions}
                      onCancel={closeExtensionRequest}
                    />
                  ) : null}
                  {!inlineOptionRequest && slashMenuOpen ? (
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
                  <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-transparent px-3 py-2 focus-within:ring-2 focus-within:ring-[var(--color-ring)]">
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
                      className="min-h-12 w-full resize-none border-0 bg-transparent p-0 text-sm focus-visible:outline-none"
                      disabled={Boolean(inlineOptionRequest) || (activeSession.status !== 'running' && activeSession.status !== 'starting')}
                    />
                    <div className="mt-2 flex flex-wrap items-center justify-end gap-4 text-xs text-[var(--color-muted-foreground)]">
                      {steerQueueState?.active ? (
                        <Button
                          type="button"
                          size="md"
                          variant="secondary"
                          loading={sending}
                          disabled={Boolean(inlineOptionRequest) || !command.trim()}
                          onClick={() => void submitComposer('followUp')}
                        >
                          <MessageSquare className="h-4 w-4" />
                          Queue
                        </Button>
                      ) : null}
                      <label className="min-w-0">
                        <span className="sr-only">Model</span>
                        <span
                          className={cn(
                            'relative inline-flex max-w-[16rem] items-center gap-1 rounded-[var(--radius-sm)] focus-within:ring-2 focus-within:ring-[var(--color-ring)]',
                            (!availableModels.length || busyAction === 'model') && 'opacity-60',
                          )}
                        >
                          <span className="truncate text-xs text-[var(--color-foreground)]">{currentModelLabel}</span>
                          <ChevronDown className="h-3 w-3 shrink-0 text-[var(--color-muted-foreground)]" aria-hidden="true" />
                          <select
                            value={currentModelValue}
                            onChange={(event) => void setRuntimeModel(event.target.value)}
                            disabled={!availableModels.length || busyAction === 'model'}
                            className="absolute inset-0 h-full w-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
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
                        </span>
                      </label>
                      <label className="min-w-0">
                        <span className="sr-only">Thinking</span>
                        <span
                          className={cn(
                            'relative inline-flex items-center gap-1 rounded-[var(--radius-sm)] focus-within:ring-2 focus-within:ring-[var(--color-ring)]',
                            busyAction === 'thinking' && 'opacity-60',
                          )}
                        >
                          <span className="text-xs text-[var(--color-foreground)]">{currentThinkingLabel}</span>
                          <ChevronDown className="h-3 w-3 shrink-0 text-[var(--color-muted-foreground)]" aria-hidden="true" />
                          <select
                            value={runtimeState.thinkingLevel ?? 'off'}
                            onChange={(event) => void setThinkingLevel(event.target.value as RuntimeState['thinkingLevel'])}
                            disabled={busyAction === 'thinking'}
                            className="absolute inset-0 h-full w-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
                          >
                            {['off', 'minimal', 'low', 'medium', 'high', 'xhigh'].map((level) => (
                              <option key={level} value={level}>
                                {level}
                              </option>
                            ))}
                          </select>
                        </span>
                      </label>
                    </div>
                  </div>
                </form>
              </>
            )}
          </section>
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

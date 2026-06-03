import { useEffect, useMemo, useReducer, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import { NavLink, useNavigate, useParams } from 'react-router-dom'
import {
  AppShellLayout,
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
  CircleStop,
  FolderOpen,
  GitBranch,
  GitFork,
  ListTodo,
  MessageSquare,
  PanelLeft,
  Play,
  Plus,
  RotateCcw,
  Send,
  Share2,
  ShieldCheck,
  Terminal,
  Trash2,
  Undo2,
  Wrench,
} from 'lucide-react'
import { ExtensionRequestDialog } from './ExtensionRequestDialog'
import {
  addSession,
  applySessionList,
  initialSessionViewState,
  reduceSessionEvent,
} from '../lib/sessionState'
import {
  getAssistantBridge,
  type AssistantCapabilities,
  type AssistantCommand,
  type AssistantStatus,
  type AssistantTranscriptMessage,
} from '../lib/assistantBridge'

type Action =
  | { type: 'set-sessions'; sessions: Parameters<typeof applySessionList>[1] }
  | { type: 'add-session'; session: Parameters<typeof addSession>[1] }
  | { type: 'event'; event: Parameters<typeof reduceSessionEvent>[1] }
  | { type: 'activate'; sessionId: string | null }
  | { type: 'clear-extension-request' }
  | { type: 'error'; error: string | null }

const reducer = (state: typeof initialSessionViewState, action: Action) => {
  if (action.type === 'set-sessions') return applySessionList(state, action.sessions)
  if (action.type === 'add-session') return addSession(state, action.session)
  if (action.type === 'event') return reduceSessionEvent(state, action.event)
  if (action.type === 'activate') return { ...state, activeSessionId: action.sessionId }
  if (action.type === 'clear-extension-request') return { ...state, extensionRequest: null }
  return { ...state, error: action.error }
}

const formatDirectory = (path: string) => {
  const parts = path.split('/').filter(Boolean)
  return parts.length > 2 ? `.../${parts.slice(-2).join('/')}` : path
}

const MessageBubble = ({ message }: { message: AssistantTranscriptMessage }) => {
  const isUser = message.role === 'user'
  const isTool = message.role === 'tool'

  return (
    <div className={cn('flex', isUser ? 'justify-end' : 'justify-start')}>
      <article
        className={cn(
          'max-w-[78ch] rounded-[var(--radius-md)] border px-3 py-2 text-sm leading-6',
          isUser
            ? 'border-[var(--color-primary)] bg-[var(--color-primary)] text-[var(--color-primary-foreground)]'
            : 'border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-foreground)]',
          isTool && 'font-mono text-xs',
        )}
      >
        <div className="mb-1 text-[11px] font-medium uppercase text-current opacity-70">
          {message.role}
          {message.status === 'streaming' ? ' streaming' : ''}
        </div>
        <pre className="m-0 whitespace-pre-wrap break-words font-inherit">{message.content}</pre>
      </article>
    </div>
  )
}

type RuntimeState = {
  thinkingLevel?: 'off' | 'minimal' | 'low' | 'medium' | 'high' | 'xhigh'
  steeringMode?: 'all' | 'one-at-a-time'
  followUpMode?: 'all' | 'one-at-a-time'
  autoCompactionEnabled?: boolean
  autoRetryEnabled?: boolean
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

export const AssistantWorkspace = () => {
  const [state, dispatch] = useReducer(reducer, initialSessionViewState)
  const [status, setStatus] = useState<AssistantStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [openingId, setOpeningId] = useState<string | null>(null)
  const [sending, setSending] = useState(false)
  const [command, setCommand] = useState('')
  const [slashSelection, setSlashSelection] = useState(0)
  const [dismissedSlashText, setDismissedSlashText] = useState<string | null>(null)
  const [capabilities, setCapabilities] = useState<AssistantCapabilities | null>(null)
  const [busyAction, setBusyAction] = useState<string | null>(null)
  const commandInputRef = useRef<HTMLTextAreaElement | null>(null)
  const navigate = useNavigate()
  const { sessionId: routeSessionId } = useParams()
  const bridge = getAssistantBridge()

  const activeSession = useMemo(
    () => state.sessions.find((session) => session.id === state.activeSessionId) ?? null,
    [state.activeSessionId, state.sessions],
  )
  const messages = activeSession ? state.messagesBySessionId[activeSession.id] ?? [] : []
  const toolEvents = activeSession ? state.toolsBySessionId[activeSession.id] ?? [] : []
  const todos = activeSession ? state.todosBySessionId[activeSession.id] ?? [] : []
  const diffs = activeSession ? state.diffsBySessionId[activeSession.id] ?? [] : []
  const permissions = activeSession ? state.permissionsBySessionId[activeSession.id] ?? [] : []
  const questions = activeSession ? state.questionsBySessionId[activeSession.id] ?? [] : []
  const metadata = activeSession ? state.metadataBySessionId[activeSession.id] ?? {} : {}
  const runtimeState = (metadata.state ?? capabilities?.state ?? {}) as RuntimeState
  const extensionStatuses = asRecord(metadata.extensionStatuses) as Record<string, string>
  const extensionWidgets = asRecord(metadata.extensionWidgets) as Record<string, { lines?: string[]; placement?: string }>
  const extensionTitle = typeof metadata.extensionTitle === 'string' ? metadata.extensionTitle : ''
  const editorText = typeof metadata.editorText === 'string' ? metadata.editorText : ''
  const extensionNotification = asRecord(metadata.extensionNotification)
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
  const slashMenuOpen = slashQuery != null && dismissedSlashText !== command && filteredSlashCommands.length > 0

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
    if (!bridge || !state.activeSessionId) return
    const unsubscribe = bridge.onSessionEvent(state.activeSessionId, (event) => {
      dispatch({ type: 'event', event })
    })
    return unsubscribe
  }, [bridge, state.activeSessionId])

  useEffect(() => {
    if (!bridge || !state.activeSessionId) {
      setCapabilities(null)
      return
    }
    let cancelled = false
    bridge
      .listCapabilities(state.activeSessionId)
      .then((next) => {
        if (!cancelled) setCapabilities(next)
      })
      .catch(() => {
        if (!cancelled) setCapabilities(null)
      })
    return () => {
      cancelled = true
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

  const createSession = async () => {
    if (!bridge) return
    setCreating(true)
    dispatch({ type: 'error', error: null })
    try {
      const session = await bridge.createSession()
      if (!session) return
      dispatch({ type: 'add-session', session })
      navigate(`/sessions/${session.id}`)
    } catch (error) {
      dispatch({ type: 'error', error: error instanceof Error ? error.message : String(error) })
    } finally {
      setCreating(false)
    }
  }

  const openSession = async (sessionId: string) => {
    if (!bridge) return
    setOpeningId(sessionId)
    dispatch({ type: 'error', error: null })
    try {
      const session = await bridge.openSession(sessionId)
      dispatch({ type: 'add-session', session })
      navigate(`/sessions/${session.id}`)
    } catch (error) {
      dispatch({ type: 'error', error: error instanceof Error ? error.message : String(error) })
    } finally {
      setOpeningId(null)
    }
  }

  const deleteSession = async (sessionId: string) => {
    if (!bridge) return
    await bridge.deleteSession(sessionId)
    const sessions = await bridge.listSessions()
    dispatch({ type: 'set-sessions', sessions })
    if (state.activeSessionId === sessionId) navigate('/')
  }

  const sendCommand = async (event: FormEvent) => {
    event.preventDefault()
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
        return { type: 'slash' as const, command: slash, args: args.join(' ') }
      }
      return { type: 'prompt' as const, command: nextCommand }
    })()
    if (route.type === 'error') {
      dispatch({ type: 'error', error: route.error })
      return
    }
    setCommand('')
    setSending(true)
    dispatch({
      type: 'event',
      event: {
        type: 'message',
        sessionId: activeSession.id,
        message: {
          id: `user-${Date.now()}`,
          role: 'user',
          content: nextCommand,
          createdAt: new Date().toISOString(),
          status: 'complete',
        },
      },
    })
    try {
      if (route.type === 'shell') {
        await bridge.runShellCommand(activeSession.id, route.command)
      } else if (route.type === 'slash') {
        const result = await bridge.runSlashCommand(activeSession.id, route.command, route.args)
        if (result.handledBy === 'builtin') {
          if (result.session) dispatch({ type: 'add-session', session: result.session })
          if (result.message) {
            dispatch({
              type: 'event',
              event: {
                type: 'message',
                sessionId: activeSession.id,
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
      } else {
        await bridge.sendCommand(activeSession.id, route.command)
      }
    } catch (error) {
      dispatch({ type: 'error', error: error instanceof Error ? error.message : String(error) })
    } finally {
      setSending(false)
    }
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

  const handleCommandKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (!slashMenuOpen) return
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setSlashSelection((index) => (index + 1) % filteredSlashCommands.length)
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setSlashSelection((index) => (index - 1 + filteredSlashCommands.length) % filteredSlashCommands.length)
    } else if (event.key === 'Enter' || event.key === 'Tab') {
      event.preventDefault()
      insertSlashCommand(filteredSlashCommands[slashSelection] ?? filteredSlashCommands[0])
    } else if (event.key === 'Escape') {
      event.preventDefault()
      setDismissedSlashText(command)
    }
  }

  const abortActiveSession = async () => {
    if (!bridge || !activeSession) return
    await bridge.abort(activeSession.id)
  }

  const restartActiveSession = async () => {
    if (!bridge || !activeSession) return
    await bridge.closeSession(activeSession.id)
    await openSession(activeSession.id)
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

  const renameActiveSession = async () => {
    if (!bridge || !activeSession) return
    const title = window.prompt('Rename session', activeSession.title ?? activeSession.displayName)
    if (!title?.trim()) return
    await runSessionAction('rename', async () => {
      const session = await bridge.renameSession(activeSession.id, title.trim())
      dispatch({ type: 'add-session', session })
    })
  }

  const revertLastUserMessage = async () => {
    if (!bridge || !activeSession) return
    const message = [...messages].reverse().find((item) => item.role === 'user')
    if (!message) return
    await runSessionAction('revert', () => bridge.revertSession(activeSession.id, message.id))
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

  const respondToExtensionUi = async (response: unknown) => {
    if (!bridge || !activeSession) return
    await bridge.respondToExtensionUi(activeSession.id, response)
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

  const shell = (
    <AppShellLayout
      brand={{ icon: <Bot />, name: 'Open-Ass', version: 'v1' }}
      navGroups={[
        {
          category: 'main',
          items: [
            {
              href: '/',
              label: 'Sessions',
              icon: <MessageSquare className="h-4 w-4" />,
              isActive: () => true,
            },
          ],
        },
      ]}
      currentPath="/"
      renderNavLink={(item, { className, children }) => (
        <NavLink to={item.href} className={className}>
          {children}
        </NavLink>
      )}
      profileFallback="OA"
    >
      <BasePage contentClassName="h-full p-0" containerClassName="h-full min-h-0">
        <div className="grid h-full min-h-0 grid-cols-1 overflow-hidden lg:grid-cols-[var(--ass-transcript-grid)] xl:grid-cols-[var(--ass-workspace-grid)]">
          <aside className="flex min-h-0 flex-col border-b border-[var(--color-border)] bg-[var(--color-surface)] lg:border-b-0 lg:border-r">
            <div className="flex items-center justify-between gap-2 border-b border-[var(--color-border)] px-3 py-2">
              <div>
                <h1 className="text-sm font-semibold text-[var(--color-heading)]">Open-Ass</h1>
                <p className="text-xs text-[var(--color-muted-foreground)]">Pi sessions</p>
              </div>
              <Button type="button" size="xs" onClick={createSession} loading={creating}>
                <Plus className="h-3.5 w-3.5" />
                Directory
              </Button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-2">
              {state.sessions.length === 0 ? (
                <div className="px-2 py-8">
                  <EmptyState
                    title="No Open-Ass sessions"
                    description="Choose a local directory to start Pi in that workspace."
                  />
                </div>
              ) : (
                <div className="flex flex-col gap-1">
                  {state.sessions.map((session) => (
                    <button
                      key={session.id}
                      type="button"
                      onClick={() => {
                        dispatch({ type: 'activate', sessionId: session.id })
                        navigate(`/sessions/${session.id}`)
                      }}
                      className={cn(
                        'group flex w-full items-start gap-2 rounded-[var(--radius-md)] px-2 py-2 text-left text-sm transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]',
                        session.id === state.activeSessionId
                          ? 'bg-[var(--color-muted)] text-[var(--color-foreground)]'
                          : 'hover:bg-[var(--color-muted)]',
                      )}
                    >
                      <PanelLeft className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-muted-foreground)]" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium">{session.displayName}</span>
                        <span className="block truncate text-xs text-[var(--color-muted-foreground)]">
                          {formatDirectory(session.directoryPath)}
                        </span>
                      </span>
                      <Badge variant={session.status === 'running' ? 'success' : 'default'}>
                        {session.status}
                      </Badge>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </aside>

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
                    aria-label="Open session"
                    onClick={() => void openSession(activeSession.id)}
                    loading={openingId === activeSession.id}
                  >
                    <Play className="h-4 w-4" />
                  </Button>
                  <Button type="button" size="icon" variant="ghost" aria-label="Abort" onClick={abortActiveSession}>
                    <CircleStop className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    aria-label="Rename session"
                    onClick={() => void renameActiveSession()}
                    loading={busyAction === 'rename'}
                  >
                    <MessageSquare className="h-4 w-4" />
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
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    aria-label="Undo last message"
                    onClick={() => void revertLastUserMessage()}
                    loading={busyAction === 'revert'}
                  >
                    <Undo2 className="h-4 w-4" />
                  </Button>
                  <Button type="button" size="icon" variant="ghost" aria-label="Restart" onClick={restartActiveSession}>
                    <RotateCcw className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    aria-label="Delete session"
                    onClick={() => void deleteSession(activeSession.id)}
                  >
                    <Trash2 className="h-4 w-4" />
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
                    <Button type="button" onClick={createSession} loading={creating}>
                      <FolderOpen className="h-4 w-4" />
                      Choose directory
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <>
                <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
                  {state.error ? (
                    <div className="mb-3 rounded-[var(--radius-md)] border border-[var(--color-destructive)] bg-[color:color-mix(in_srgb,var(--color-destructive)_8%,transparent)] px-3 py-2 text-sm text-[var(--color-destructive)]">
                      {state.error}
                    </div>
                  ) : null}
                  {messages.length === 0 && toolEvents.length === 0 ? (
                    <EmptyState
                      title="No messages yet"
                      description="Send a command to Pi or open a persisted session to load messages."
                    />
                  ) : (
                    <div className="flex flex-col gap-3">
                      {messages.map((message) => (
                        <MessageBubble key={message.id} message={message} />
                      ))}
                      {toolEvents.map((tool) => (
                        <div
                          key={tool.id}
                          className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-muted)] px-3 py-2 text-xs text-[var(--color-muted-foreground)]"
                        >
                          <div className="flex items-center gap-2 font-medium text-[var(--color-foreground)]">
                            <Terminal className="h-3.5 w-3.5" />
                            {tool.name}
                            {tool.status ? <Badge>{tool.status}</Badge> : null}
                          </div>
                          {tool.summary ? <p className="mt-1">{tool.summary}</p> : null}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <form onSubmit={sendCommand} className="border-t border-[var(--color-border)] p-3">
                  {slashMenuOpen ? (
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
                      disabled={activeSession.status !== 'running' && activeSession.status !== 'starting'}
                    />
                    <Button type="submit" size="md" loading={sending} disabled={!command.trim()}>
                      <Send className="h-4 w-4" />
                      Send
                    </Button>
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
                    <ListTodo className="h-3.5 w-3.5" />
                    Todos
                  </div>
                  {todos.length ? (
                    <div className="space-y-2">
                      {todos.map((todo, index) => (
                        <div key={`${todo.content}-${index}`} className="flex items-start justify-between gap-2">
                          <span className="min-w-0 break-words">{todo.content}</span>
                          <Badge>{todo.status}</Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[var(--color-muted-foreground)]">No todos.</p>
                  )}
                </section>

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
        request={state.extensionRequest}
        onRespond={(response) => void respondToExtensionUi(response)}
        onCancel={closeExtensionRequest}
      />
    </ThemeProvider>
  )
}

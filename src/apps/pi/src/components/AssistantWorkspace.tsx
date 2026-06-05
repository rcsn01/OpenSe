import { useCallback, useEffect, useMemo, useState } from 'react'
import { NavLink, useLocation, useNavigate, useParams } from 'react-router-dom'
import {
  AppShellLayout,
  type AppShellNavGroup,
  BasePage,
  Button,
  Dropdown,
  DropdownItem,
  EmptyState,
  Spinner,
  ThemeProvider,
} from '@repo/ui'
import {
  buildConfiguredAccountsProfileUrl,
  buildConfiguredAccountsSettingsUrl,
} from '@repo/shared/utils'
import { Check, Plus, Settings } from 'lucide-react'
import { PiTerminalView } from './PiTerminalView'
import {
  getAssistantBridge,
  type AssistantSession,
  type AssistantStatus,
} from '../lib/assistantBridge'

const formatProjectName = (path: string) => {
  const parts = path.split('/').filter(Boolean)
  return parts[parts.length - 1] ?? path
}

const formatSessionLabel = (session: { displayName?: string; firstMessage?: string; piSessionId?: string; id: string }) =>
  session.displayName || session.firstMessage || session.piSessionId || session.id

export const AssistantWorkspace = () => {
  const [sessions, setSessions] = useState<AssistantSession[]>([])
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null)
  const [status, setStatus] = useState<AssistantStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [chatDisplayMode, setChatDisplayMode] = useState<'modern' | 'terminal'>('modern')
  const navigate = useNavigate()
  const location = useLocation()
  const { sessionId: routeSessionId } = useParams()
  const bridge = getAssistantBridge()

  const activeSession = useMemo(
    () => sessions.find((session) => session.id === activeSessionId) ?? null,
    [activeSessionId, sessions],
  )

  useEffect(() => {
    let cancelled = false

    const loadInitialState = async () => {
      if (!bridge) {
        setStatus({ available: false, error: 'Open Pi must be run in the desktop app.' })
        setLoading(false)
        return
      }

      try {
        const [nextStatus, nextSessions] = await Promise.all([
          bridge.getStatus(),
          bridge.listSessions(),
        ])
        if (cancelled) return
        setStatus(nextStatus)
        setSessions(nextSessions)
      } catch (loadError) {
        if (!cancelled) setStatus({ available: false, error: loadError instanceof Error ? loadError.message : String(loadError) })
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
    if (routeSessionId && routeSessionId !== activeSessionId) setActiveSessionId(routeSessionId)
  }, [routeSessionId, activeSessionId])

  const createSession = useCallback(async () => {
    if (!bridge) return
    setCreating(true)
    setError(null)
    try {
      const session = await bridge.createSession()
      if (!session) return
      setSessions((current) => [session, ...current.filter((item) => item.id !== session.id)])
      setActiveSessionId(session.id)
      navigate(`/sessions/${session.id}`)
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : String(createError))
    } finally {
      setCreating(false)
    }
  }, [bridge, navigate])

  const projects = useMemo(() => {
    const grouped = new Map<string, AssistantSession[]>()
    for (const session of sessions) {
      const key = session.directoryPath || 'Recent sessions'
      grouped.set(key, [...(grouped.get(key) ?? []), session])
    }
    return grouped
  }, [sessions])

  const navGroups: AppShellNavGroup[] = useMemo(() => {
    const sessionGroups = Array.from(projects.entries()).map(([projectPath, projectSessions]) => ({
      title: projectPath === 'Recent sessions' ? projectPath : formatProjectName(projectPath),
      items: projectSessions.map((session) => ({
        label: formatSessionLabel(session),
        href: `/sessions/${session.id}`,
        icon: (
          <span
            className="h-2 w-2 rounded-full bg-current opacity-60"
            aria-hidden="true"
          />
        ),
      })),
    }))

    return [
      {
        title: 'Open Pi',
        items: [
          {
            label: creating ? 'Choosing...' : 'Choose directory',
            href: '/',
            icon: <Plus className="h-4 w-4" />,
            onClick: () => void createSession(),
          },
        ],
      },
      ...sessionGroups,
    ]
  }, [createSession, creating, projects])

  const shell = (
    <AppShellLayout
      brand={{
        icon: <span className="text-xs font-semibold">Pi</span>,
        name: 'Open Pi',
      }}
      currentPath={location.pathname}
      navGroups={navGroups}
      searchContent={
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
      }
      renderNavLink={(item, { className, children }) => {
        const targetSession = sessions.find((session) => item.href === `/sessions/${session.id}`)
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
              if (targetSession) setActiveSessionId(targetSession.id)
            }}
          >
            {children}
          </NavLink>
        )
      }}
      profileFallback="OP"
      onProfileClick={() => {
        window.location.assign(buildConfiguredAccountsProfileUrl())
      }}
      onSettingsClick={() => {
        window.location.assign(buildConfiguredAccountsSettingsUrl())
      }}
    >
      <BasePage contentClassName="h-full p-0" containerClassName="h-full min-h-0">
        <section className="relative h-full min-h-0 bg-[var(--color-background)]">
          {loading ? (
            <div className="grid h-full place-items-center">
              <Spinner />
            </div>
          ) : !status?.available ? (
            <div className="grid h-full place-items-center p-6">
              <EmptyState
                title="Pi unavailable"
                description={status?.error ?? 'Install the Pi CLI and restart Open Pi.'}
              />
            </div>
          ) : chatDisplayMode === 'terminal' && bridge ? (
            <PiTerminalView
              bridge={bridge}
              directoryPath={activeSession?.directoryPath}
              visible={chatDisplayMode === 'terminal'}
            />
          ) : (
            <div className="h-full min-h-0" aria-label="Modern workspace" />
          )}
          {error ? (
            <div className="absolute bottom-4 left-1/2 max-w-[calc(100%-2rem)] -translate-x-1/2 rounded-[var(--radius-md)] border border-[var(--color-destructive)] bg-[var(--color-card)] px-3 py-2 text-sm text-[var(--color-destructive)] shadow-lg">
              {error}
            </div>
          ) : null}
        </section>
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
    </ThemeProvider>
  )
}

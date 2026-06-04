import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AssistantWorkspace } from '../components/AssistantWorkspace'
import type {
  AssistantSession,
  AssistantSessionEvent,
  AssistantTerminalEvent,
  OpenSeAssistantBridge,
} from '../lib/assistantBridge'

const baseSession: AssistantSession = {
  id: 'session-1',
  directoryPath: '/Users/dev/project',
  displayName: 'project',
  createdAt: '2026-06-03T00:00:00.000Z',
  updatedAt: '2026-06-03T00:00:00.000Z',
  status: 'closed',
}

const makeProjectSessions = (count: number) =>
  Array.from({ length: count }, (_, index) => ({
    ...baseSession,
    id: `session-${index + 1}`,
    displayName: `Session ${index + 1}`,
    createdAt: `2026-06-03T00:${String(index).padStart(2, '0')}:00.000Z`,
    updatedAt: `2026-06-03T00:${String(index).padStart(2, '0')}:00.000Z`,
  }))

const renderWorkspace = (initialEntries = ['/']) =>
  render(
    <MemoryRouter initialEntries={initialEntries}>
      <Routes>
        <Route path="/" element={<AssistantWorkspace />} />
        <Route path="/sessions/:sessionId" element={<AssistantWorkspace />} />
      </Routes>
    </MemoryRouter>,
  )

const expectPromptIds = () => expect.objectContaining({
  messageID: expect.stringMatching(/^msg_/),
  textPartID: expect.stringMatching(/^prt_/),
})

const installBridge = (overrides: Partial<OpenSeAssistantBridge> = {}) => {
  const listeners = new Map<string, (event: AssistantSessionEvent) => void>()
  const terminalListeners = new Map<string, (event: AssistantTerminalEvent) => void>()
  const bridge: OpenSeAssistantBridge & {
    emit: (event: AssistantSessionEvent) => void
    emitTerminal: (event: AssistantTerminalEvent) => void
  } = {
    startTerminal: vi.fn(async (input) => ({
      id: 'term-test',
      directoryPath: input?.directoryPath ?? '/Users/dev/chosen-terminal-project',
      status: 'running' as const,
      initialData: 'Pi TUI',
    })),
    writeTerminal: vi.fn(async () => undefined),
    resizeTerminal: vi.fn(async () => undefined),
    stopTerminal: vi.fn(async () => undefined),
    initializePiConfig: vi.fn(async (input) => ({
      directoryPath: input.directoryPath,
      piPath: `${input.directoryPath}/.pi`,
      extensionDependenciesInstalled: ['tools-web-fetch'],
    })),
    getStatus: vi.fn(async () => ({ available: true, version: 'pi-test' })),
    listSessions: vi.fn(async () => []),
    createSession: vi.fn(async () => baseSession),
    openSession: vi.fn(async (sessionId) => ({ ...baseSession, id: sessionId, status: 'running' as const })),
    loadTranscriptPage: vi.fn(async () => ({ items: [], complete: true, mode: 'replace' as const })),
    sendCommand: vi.fn(async () => undefined),
    runSlashCommand: vi.fn(async () => ({ handledBy: 'pi' as const })),
    runShellCommand: vi.fn(async () => undefined),
    abort: vi.fn(async () => undefined),
    closeSession: vi.fn(async () => undefined),
    deleteSession: vi.fn(async () => undefined),
    renameSession: vi.fn(async (sessionId, title) => ({ ...baseSession, id: sessionId, title })),
    forkSession: vi.fn(async () => ({ ...baseSession, id: 'session-fork' })),
    summarizeSession: vi.fn(async () => undefined),
    revertSession: vi.fn(async () => undefined),
    unrevertSession: vi.fn(async () => undefined),
    shareSession: vi.fn(async (sessionId) => ({ ...baseSession, id: sessionId, shareUrl: 'https://share.test' })),
    unshareSession: vi.fn(async (sessionId) => ({ ...baseSession, id: sessionId, shareUrl: undefined })),
    getSessionData: vi.fn(async (sessionId) => ({ ...baseSession, id: sessionId, status: 'running' as const })),
    listCapabilities: vi.fn(async () => ({ tools: [] })),
    setModel: vi.fn(async () => undefined),
    setThinkingLevel: vi.fn(async () => undefined),
    setSteeringMode: vi.fn(async () => undefined),
    setFollowUpMode: vi.fn(async () => undefined),
    setAutoCompaction: vi.fn(async () => undefined),
    setAutoRetry: vi.fn(async () => undefined),
    getDiff: vi.fn(async () => []),
    initGit: vi.fn(async () => undefined),
    respondToPermission: vi.fn(async () => undefined),
    respondToQuestion: vi.fn(async () => undefined),
    rejectQuestion: vi.fn(async () => undefined),
    respondToExtensionUi: vi.fn(async () => undefined),
    executeTuiCommand: vi.fn(async () => undefined),
    onSessionEvent: vi.fn((sessionId, callback) => {
      listeners.set(sessionId, callback)
      return () => listeners.delete(sessionId)
    }),
    onTerminalEvent: vi.fn((terminalId, callback) => {
      terminalListeners.set(terminalId, callback)
      return () => terminalListeners.delete(terminalId)
    }),
    emit: (event) => {
      listeners.get(event.sessionId)?.(event)
    },
    emitTerminal: (event) => {
      terminalListeners.get(event.id)?.(event)
    },
    ...overrides,
  }

  Object.defineProperty(window, 'openseAssistant', {
    value: bridge,
    configurable: true,
  })

  return bridge
}

describe('AssistantWorkspace', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    Reflect.deleteProperty(window, 'openseAssistant')
  })

  it('shows a Pi unavailable state when the desktop bridge reports Pi missing', async () => {
    installBridge({
      getStatus: vi.fn(async () => ({ available: false, error: 'Pi CLI was not found on PATH.' })),
    })

    renderWorkspace()

    expect(await screen.findByText('Pi unavailable')).toBeInTheDocument()
    expect(screen.getAllByText('Pi CLI was not found on PATH.').length).toBeGreaterThan(0)
  })

  it('renders sessions with project nav styling and highlights the active session', async () => {
    const bridge = installBridge({
      listSessions: vi.fn(async () => [
        { ...baseSession, displayName: 'Current work', firstMessage: 'first prompt' },
      ]),
      openSession: vi.fn(async (sessionId) => ({ ...baseSession, id: sessionId, displayName: 'Current work', status: 'running' as const })),
    })

    renderWorkspace()

    expect(await screen.findByText('PROJECTS')).toBeInTheDocument()
    expect(screen.queryByText('MAIN')).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /sessions/i })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /add directory/i })).toBeInTheDocument()
    expect(await screen.findByRole('link', { name: /^project project$/i })).not.toHaveClass('bg-[var(--color-side-nav-active-bg)]')
    expect(screen.getByRole('link', { name: /^current work$/i })).toHaveClass('bg-[var(--color-side-nav-active-bg)]')
    await waitFor(() => expect(bridge.openSession).toHaveBeenCalledWith('session-1'))
    expect(screen.queryByText(/Users\/dev\/project/)).not.toBeInTheDocument()
  })

  it('initialises Pi config in the active project directory', async () => {
    const user = userEvent.setup()
    const bridge = installBridge({
      listSessions: vi.fn(async () => [baseSession]),
      openSession: vi.fn(async (sessionId) => ({ ...baseSession, id: sessionId, status: 'running' as const })),
    })

    renderWorkspace(['/sessions/session-1'])
    await screen.findByRole('textbox', { name: /send command/i })

    await user.click(screen.getByRole('button', { name: /initialise pi config/i }))

    await waitFor(() => {
      expect(bridge.initializePiConfig).toHaveBeenCalledWith({ directoryPath: baseSession.directoryPath })
    })
  })

  it('highlights the project instead of the session in Terminal display mode', async () => {
    const user = userEvent.setup()
    installBridge({
      listSessions: vi.fn(async () => [
        { ...baseSession, displayName: 'Current work', firstMessage: 'first prompt' },
      ]),
      openSession: vi.fn(async (sessionId) => ({ ...baseSession, id: sessionId, displayName: 'Current work', status: 'running' as const })),
    })

    renderWorkspace(['/sessions/session-1'])

    await screen.findByRole('textbox', { name: /send command/i })
    await user.click(screen.getByRole('button', { name: /chat display settings/i }))
    await user.click(await screen.findByText('Terminal'))

    expect(await screen.findByTestId('pi-terminal-view')).toBeInTheDocument()
    expect(await screen.findByRole('link', { name: /^project project$/i })).toHaveClass('bg-[var(--color-side-nav-active-bg)]')
    expect(screen.getByRole('link', { name: /^current work$/i })).not.toHaveClass('bg-[var(--color-side-nav-active-bg)]')
  })

  it('switches between Modern and Terminal display modes without stopping the terminal', async () => {
    const user = userEvent.setup()
    const bridge = installBridge({
      listSessions: vi.fn(async () => [baseSession]),
      openSession: vi.fn(async (sessionId) => ({ ...baseSession, id: sessionId, status: 'running' as const })),
    })

    renderWorkspace(['/sessions/session-1'])

    expect(await screen.findByRole('textbox', { name: /send command/i })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /chat display settings/i }))
    await user.click(await screen.findByText('Terminal'))

    await waitFor(() => {
      expect(bridge.startTerminal).toHaveBeenCalledWith({ directoryPath: baseSession.directoryPath })
    })
    expect(screen.getByTestId('pi-terminal-view')).toBeInTheDocument()
    expect(screen.queryByRole('textbox', { name: /send command/i })).not.toBeInTheDocument()
    expect(screen.queryByText('No messages yet')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /chat display settings/i }))
    await user.click(await screen.findByText('Modern'))

    expect(await screen.findByRole('textbox', { name: /send command/i })).toBeInTheDocument()
    expect(bridge.stopTerminal).not.toHaveBeenCalled()
  })

  it('starts Terminal mode through the directory picker when no session is active', async () => {
    const user = userEvent.setup()
    const bridge = installBridge()

    renderWorkspace()

    expect(await screen.findByText('Choose a directory')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /chat display settings/i }))
    await user.click(await screen.findByText('Terminal'))

    await waitFor(() => {
      expect(bridge.startTerminal).toHaveBeenCalledWith(undefined)
    })
    expect(screen.getByTestId('pi-terminal-view')).toBeInTheDocument()
    expect(screen.queryByRole('textbox', { name: /send command/i })).not.toBeInTheDocument()
  })

  it('shows an inline Terminal startup error and tolerates WebGL initialization failure', async () => {
    const user = userEvent.setup()
    ;(globalThis as { __OPENSE_TEST_WEBGL_FAIL__?: boolean }).__OPENSE_TEST_WEBGL_FAIL__ = true
    installBridge({
      listSessions: vi.fn(async () => [baseSession]),
      startTerminal: vi.fn(async () => {
        throw new Error('terminal failed')
      }),
    })

    try {
      renderWorkspace(['/sessions/session-1'])
      await screen.findByRole('textbox', { name: /send command/i })
      await user.click(screen.getByRole('button', { name: /chat display settings/i }))
      await user.click(await screen.findByText('Terminal'))

      expect(await screen.findByText('terminal failed')).toBeInTheDocument()
      expect(screen.getByTestId('pi-terminal-view')).toBeInTheDocument()
    } finally {
      ;(globalThis as { __OPENSE_TEST_WEBGL_FAIL__?: boolean }).__OPENSE_TEST_WEBGL_FAIL__ = false
    }
  })

  it('does not surface xterm renderer cleanup failures when leaving Terminal mode', async () => {
    const user = userEvent.setup()
    ;(globalThis as { __OPENSE_TEST_XTERM_DISPOSE_FAIL__?: boolean }).__OPENSE_TEST_XTERM_DISPOSE_FAIL__ = true
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    installBridge({
      listSessions: vi.fn(async () => [baseSession]),
      openSession: vi.fn(async (sessionId) => ({ ...baseSession, id: sessionId, status: 'running' as const })),
    })

    try {
      renderWorkspace(['/sessions/session-1'])
      expect(await screen.findByRole('textbox', { name: /send command/i })).toBeInTheDocument()
      await user.click(screen.getByRole('button', { name: /chat display settings/i }))
      await user.click(await screen.findByText('Terminal'))
      expect(await screen.findByTestId('pi-terminal-view')).toBeInTheDocument()

      await user.click(screen.getByRole('button', { name: /chat display settings/i }))
      await user.click(await screen.findByText('Modern'))

      expect(await screen.findByRole('textbox', { name: /send command/i })).toBeInTheDocument()
      expect(consoleError).not.toHaveBeenCalledWith(expect.stringContaining('xterm dispose failed'))
    } finally {
      ;(globalThis as { __OPENSE_TEST_XTERM_DISPOSE_FAIL__?: boolean }).__OPENSE_TEST_XTERM_DISPOSE_FAIL__ = false
      consoleError.mockRestore()
    }
  })

  it('toggles project sessions and expands or retracts in five-session chunks', async () => {
    const sessions = makeProjectSessions(18)
    const bridge = installBridge({
      listSessions: vi.fn(async () => sessions),
      openSession: vi.fn(async (sessionId) => ({
        ...(sessions.find((session) => session.id === sessionId) ?? baseSession),
        id: sessionId,
        status: 'running' as const,
      })),
    })
    const user = userEvent.setup()

    renderWorkspace()

    const project = await screen.findByRole('link', { name: /^project project$/i })
    await waitFor(() => expect(bridge.openSession).toHaveBeenCalledWith('session-1'))

    for (const label of ['Session 1', 'Session 5']) {
      expect(screen.getByRole('link', { name: label })).toBeInTheDocument()
    }
    expect(screen.queryByRole('link', { name: 'Session 6' })).not.toBeInTheDocument()

    await user.click(project)
    expect(screen.queryByRole('link', { name: 'Session 1' })).not.toBeInTheDocument()

    await user.click(project)
    expect(screen.getByRole('link', { name: 'Session 5' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Session 6' })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /expand sessions in project/i }))
    expect(screen.getByRole('link', { name: 'Session 10' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Session 11' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /retract sessions in project/i })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /expand sessions in project/i }))
    expect(screen.getByRole('link', { name: 'Session 15' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Session 16' })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /expand sessions in project/i }))
    expect(screen.getByRole('link', { name: 'Session 18' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /expand sessions in project/i })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /retract sessions in project/i }))
    expect(screen.getByRole('link', { name: 'Session 15' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Session 16' })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /retract sessions in project/i }))
    expect(screen.getByRole('link', { name: 'Session 10' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Session 11' })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /retract sessions in project/i }))
    expect(screen.getByRole('link', { name: 'Session 5' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Session 6' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /retract sessions in project/i })).not.toBeInTheDocument()
  })

  it('opens a clicked session row and renders its emitted history', async () => {
    const openSession = vi.fn(async (sessionId: string) => {
      ;(window.openseAssistant as (OpenSeAssistantBridge & { emit: (event: AssistantSessionEvent) => void })).emit({
        type: 'messages',
        sessionId,
        messages: [
          {
            id: `history-${sessionId}`,
            role: 'user',
            content: sessionId === 'session-2' ? 'older prompt' : 'current prompt',
            createdAt: '2026-06-03T00:00:00.000Z',
            status: 'complete',
          },
        ],
      })
      return { ...baseSession, id: sessionId, displayName: sessionId === 'session-2' ? 'Older work' : 'Current work', status: 'running' as const }
    })
    installBridge({
      listSessions: vi.fn(async () => [
        { ...baseSession, id: 'session-1', displayName: 'Current work' },
        { ...baseSession, id: 'session-2', displayName: 'Older work' },
      ]),
      openSession,
    })
    const user = userEvent.setup()

    renderWorkspace()

    await user.click(await screen.findByRole('link', { name: /^older work$/i }))

    await waitFor(() => expect(openSession).toHaveBeenCalledWith('session-2'))
    expect(await screen.findByText('older prompt')).toBeInTheDocument()
  })

  it('opens a direct session route and renders history after subscribing', async () => {
    const openSession = vi.fn(async (sessionId: string) => {
      ;(window.openseAssistant as (OpenSeAssistantBridge & { emit: (event: AssistantSessionEvent) => void })).emit({
        type: 'messages',
        sessionId,
        messages: [
          {
            id: 'direct-history',
            role: 'assistant',
            content: 'direct route history',
            createdAt: '2026-06-03T00:00:00.000Z',
            status: 'complete',
          },
        ],
      })
      return { ...baseSession, id: sessionId, displayName: 'Direct session', status: 'running' as const }
    })
    installBridge({
      listSessions: vi.fn(async () => [{ ...baseSession, id: 'session-1', displayName: 'Current work' }]),
      openSession,
    })

    renderWorkspace(['/sessions/session-2'])

    await waitFor(() => expect(openSession).toHaveBeenCalledWith('session-2'))
    expect(await screen.findByText('direct route history')).toBeInTheDocument()
  })

  it('renders transcript rows in canonical order instead of moving assistants under parent users', async () => {
    const bridge = installBridge({
      listSessions: vi.fn(async () => [{ ...baseSession, status: 'running' as const }]),
    })

    renderWorkspace()
    await screen.findAllByText('project')

    act(() => {
      bridge.emit({
        type: 'transcript_snapshot',
        sessionId: 'session-1',
        items: [
          {
            info: { id: 'msg_001_user', role: 'user', content: 'first user anchor', status: 'complete' },
            parts: [{ id: 'prt_001', messageId: 'msg_001_user', type: 'text', text: 'first user anchor' }],
          },
          {
            info: { id: 'msg_002_user', role: 'user', content: 'second user canonical position', status: 'complete' },
            parts: [{ id: 'prt_002', messageId: 'msg_002_user', type: 'text', text: 'second user canonical position' }],
          },
          {
            info: {
              id: 'msg_003_assistant',
              role: 'assistant',
              parentMessageId: 'msg_001_user',
              content: 'late assistant canonical position',
              status: 'complete',
            },
            parts: [{ id: 'prt_003', messageId: 'msg_003_assistant', type: 'text', text: 'late assistant canonical position' }],
          },
        ],
      })
    })

    await screen.findByText('late assistant canonical position')
    const text = document.body.textContent ?? ''
    expect(text.indexOf('first user anchor')).toBeLessThan(text.indexOf('second user canonical position'))
    expect(text.indexOf('second user canonical position')).toBeLessThan(text.indexOf('late assistant canonical position'))
  })

  it('creates a session through the project add button', async () => {
    const bridge = installBridge()
    const user = userEvent.setup()

    renderWorkspace()

    await user.click(await screen.findByRole('button', { name: /add directory/i }))

    await waitFor(() => expect(bridge.createSession).toHaveBeenCalledWith())
    expect((await screen.findAllByText('project')).length).toBeGreaterThan(0)
  })

  it('creates a new Pi session inside an existing project group', async () => {
    const bridge = installBridge({
      listSessions: vi.fn(async () => [baseSession]),
    })
    const user = userEvent.setup()

    renderWorkspace()

    await user.click(await screen.findByRole('button', { name: /new session in project/i }))

    await waitFor(() => expect(bridge.createSession).toHaveBeenCalledWith({ directoryPath: baseSession.directoryPath }))
  })

  it('applies streaming transcript updates with a trimmed session toolbar', async () => {
    const bridge = installBridge({
      listSessions: vi.fn(async () => [{ ...baseSession, status: 'running' as const }]),
    })

    renderWorkspace()
    await screen.findAllByText('project')

    act(() => {
      bridge.emit({
        type: 'transcript_message_upsert',
        sessionId: 'session-1',
        info: {
          id: 'assistant-1',
          role: 'assistant',
          content: '',
          status: 'streaming',
        },
      })
      bridge.emit({
        type: 'text_delta',
        sessionId: 'session-1',
        messageId: 'assistant-1',
        delta: 'Working',
      })
      bridge.emit({
        type: 'text_delta',
        sessionId: 'session-1',
        messageId: 'assistant-1',
        delta: ' on it.',
      })
    })

    expect(await screen.findByText('Working on it.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Share session' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Fork session' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Open session' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Abort' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Rename session' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Undo last message' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Restart' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Delete session' })).not.toBeInTheDocument()
  })

  it('renders structured user and assistant transcript parts', async () => {
    const bridge = installBridge({
      listSessions: vi.fn(async () => [{ ...baseSession, status: 'running' as const }]),
    })

    renderWorkspace()
    await screen.findAllByText('project')

    act(() => {
      bridge.emit({
        type: 'messages',
        sessionId: 'session-1',
        messages: [
          {
            id: 'user-structured',
            role: 'user',
            content: 'Please run this',
            status: 'complete',
            parts: [
              { type: 'text', text: 'Please run this' },
              { type: 'unknown', label: 'skillInvocation', value: { skill: 'review' } },
            ],
          },
          {
            id: 'assistant-structured',
            role: 'assistant',
            content: 'I will check it.',
            status: 'complete',
            parts: [
              { type: 'text', text: 'I will check it.' },
              { type: 'thinking', text: 'Looking at files.' },
            ],
          },
        ],
      })
    })

    expect(await screen.findByText('Please run this')).toBeInTheDocument()
    expect(screen.getByText('Skill invocation')).toBeInTheDocument()
    expect(screen.getByText('I will check it.')).toBeInTheDocument()
    expect(screen.getByText('Looking at files.')).toBeInTheDocument()
  })

  it('pairs assistant tool calls with tool results through the registry', async () => {
    const bridge = installBridge({
      listSessions: vi.fn(async () => [{ ...baseSession, status: 'running' as const }]),
    })

    renderWorkspace()
    await screen.findAllByText('project')

    act(() => {
      bridge.emit({
        type: 'messages',
        sessionId: 'session-1',
        messages: [
          {
            id: 'assistant-tools',
            role: 'assistant',
            content: 'Plan:',
            status: 'complete',
            parts: [
              { type: 'text', text: 'Plan:' },
              {
                type: 'toolCall',
                id: 'todo-call',
                name: 'todo',
                arguments: { todos: [{ id: '1', text: 'Ship transcript renderer', status: 'in_progress' }] },
              },
              {
                type: 'toolCall',
                id: 'mystery-call',
                name: 'mysteryTool',
                arguments: { mode: 'safe' },
              },
            ],
          },
          {
            id: 'todo-result',
            role: 'toolResult',
            content: 'updated',
            status: 'complete',
            toolCallId: 'todo-call',
            toolName: 'todo',
            details: { todos: [{ id: '1', text: 'Ship transcript renderer', status: 'completed' }] },
          },
        ],
      })
    })

    expect(await screen.findByText('Plan:')).toBeInTheDocument()
    expect(screen.getByText('Ship transcript renderer')).toBeInTheDocument()
    expect(screen.getByText('completed')).toBeInTheDocument()
    expect(screen.getByText('MysteryTool')).toBeInTheDocument()
    expect(screen.queryByText('updated')).not.toBeInTheDocument()
  })

  it('renders nonstandard Pi roles as native transcript cards', async () => {
    const bridge = installBridge({
      listSessions: vi.fn(async () => [{ ...baseSession, status: 'running' as const }]),
    })

    renderWorkspace()
    await screen.findAllByText('project')

    act(() => {
      bridge.emit({
        type: 'messages',
        sessionId: 'session-1',
        messages: [
          {
            id: 'bash-role',
            role: 'bashExecution',
            content: 'src\npackage.json',
            status: 'complete',
            raw: { command: 'ls', output: 'src\npackage.json' },
          },
          { id: 'custom-role', role: 'custom', content: 'Custom note', status: 'complete' },
          { id: 'branch-role', role: 'branchSummary', content: 'Branch note', status: 'complete' },
          { id: 'compact-role', role: 'compactionSummary', content: 'Compaction note', status: 'complete' },
        ],
      })
    })

    expect(await screen.findByText('$ ls')).toBeInTheDocument()
    expect(screen.getByText('Custom note')).toBeInTheDocument()
    expect(screen.getByText('Branch note')).toBeInTheDocument()
    expect(screen.getByText('Compaction note')).toBeInTheDocument()
  })

  it('updates streaming thinking and tool-call parts', async () => {
    const bridge = installBridge({
      listSessions: vi.fn(async () => [{ ...baseSession, status: 'running' as const }]),
    })

    renderWorkspace()
    await screen.findAllByText('project')

    act(() => {
      bridge.emit({
        type: 'transcript_message_upsert',
        sessionId: 'session-1',
        info: {
          id: 'assistant-stream',
          role: 'assistant',
          content: '',
          status: 'streaming',
        },
      })
      bridge.emit({
        type: 'message_part',
        sessionId: 'session-1',
        messageId: 'assistant-stream',
        content: 'Simple',
        partType: 'reasoning',
        part: { type: 'thinking', text: 'Simple' },
      })
      bridge.emit({
        type: 'message_part',
        sessionId: 'session-1',
        messageId: 'assistant-stream',
        content: ' ping again',
        partType: 'reasoning',
        part: { type: 'thinking', text: ' ping again' },
      })
      bridge.emit({
        type: 'message_part',
        sessionId: 'session-1',
        messageId: 'assistant-stream',
        content: ", I'll respond.",
        partType: 'reasoning',
        part: { type: 'thinking', text: ", I'll respond." },
      })
      bridge.emit({
        type: 'message_part',
        sessionId: 'session-1',
        messageId: 'assistant-stream',
        content: '',
        partType: 'toolCall',
        partId: 'grep-call',
        part: {
          type: 'toolCall',
          id: 'grep-call',
          name: 'grep',
          status: 'running',
          arguments: { pattern: 'old-pattern' },
        },
      })
      bridge.emit({
        type: 'message_part',
        sessionId: 'session-1',
        messageId: 'assistant-stream',
        content: '',
        partType: 'toolCall',
        partId: 'grep-call',
        part: {
          type: 'toolCall',
          id: 'grep-call',
          name: 'grep',
          status: 'running',
          arguments: { pattern: 'new-pattern' },
        },
      })
    })

    expect(await screen.findByText("Simple ping again, I'll respond.")).toBeInTheDocument()
    expect(screen.getByLabelText('Assistant')).toHaveAttribute('aria-busy', 'true')
    expect(screen.getByText('Grep: new-pattern')).toBeInTheDocument()
    expect(screen.queryByText('Grep: old-pattern')).not.toBeInTheDocument()
  })

  it('keeps older chat history when a new turn snapshot is partial', async () => {
    const bridge = installBridge({
      listSessions: vi.fn(async () => [{ ...baseSession, status: 'running' as const }]),
    })
    const user = userEvent.setup()

    renderWorkspace()
    await screen.findAllByText('project')

    act(() => {
      bridge.emit({
        type: 'messages',
        sessionId: 'session-1',
        replace: true,
        messages: [
          { id: 'old-user', role: 'user', content: 'older prompt', status: 'complete' },
          { id: 'old-assistant', role: 'assistant', content: 'older answer', status: 'complete' },
        ],
      })
    })

    await user.type(screen.getByLabelText('Send command'), 'new prompt{Enter}')
    const promptIds = vi.mocked(bridge.sendCommand).mock.calls.at(-1)?.[3]
    expect(promptIds).toEqual(expectPromptIds())
    if (!promptIds) throw new Error('Expected generated prompt ids')

    act(() => {
      bridge.emit({
        type: 'messages',
        sessionId: 'session-1',
        messages: [
          {
            id: promptIds.messageID,
            role: 'user',
            content: 'new prompt',
            status: 'complete',
            parts: [{ type: 'text', id: promptIds.textPartID, messageId: promptIds.messageID, text: 'new prompt' }],
          },
          { id: 'new-assistant', role: 'assistant', parentMessageId: promptIds.messageID, content: 'new answer', status: 'complete' },
        ],
      })
    })

    expect(await screen.findByText('older prompt')).toBeInTheDocument()
    expect(screen.getByText('older answer')).toBeInTheDocument()
    expect(screen.getByText('new prompt')).toBeInTheDocument()
    expect(screen.getByText('new answer')).toBeInTheDocument()
    expect(screen.getAllByText('new prompt')).toHaveLength(1)
  })

  it('keeps legacy tool events out of canonical transcript rows', async () => {
    const bridge = installBridge({
      listSessions: vi.fn(async () => [{ ...baseSession, status: 'running' as const }]),
    })

    renderWorkspace()
    await screen.findAllByText('project')

    act(() => {
      bridge.emit({
        type: 'message',
        sessionId: 'session-1',
        message: { id: 'user-1', role: 'user', content: 'clear your todo', status: 'complete' },
      })
      bridge.emit({
        type: 'tool',
        sessionId: 'session-1',
        tool: { id: 'todo-call', name: 'todo', status: 'running', summary: '{}' },
      })
      bridge.emit({
        type: 'message',
        sessionId: 'session-1',
        message: { id: 'user-2', role: 'user', content: 'create new todo', status: 'complete' },
      })
      bridge.emit({
        type: 'tool',
        sessionId: 'session-1',
        tool: { id: 'todo-call', name: 'todo', status: 'complete', summary: 'Cleared 8 todos' },
      })
    })

    await screen.findByText('create new todo')
    expect(screen.queryByText('Cleared 8 todos')).not.toBeInTheDocument()
    const text = document.body.textContent ?? ''
    expect(text.indexOf('clear your todo')).toBeLessThan(text.indexOf('create new todo'))
  })

  it('does not duplicate legacy tool events when structured tool results are present', async () => {
    const bridge = installBridge({
      listSessions: vi.fn(async () => [{ ...baseSession, status: 'running' as const }]),
    })

    renderWorkspace()
    await screen.findAllByText('project')

    act(() => {
      bridge.emit({
        type: 'message',
        sessionId: 'session-1',
        message: {
          id: 'assistant-1',
          role: 'assistant',
          content: '',
          status: 'streaming',
          parts: [{ type: 'toolCall', id: 'todo-call', name: 'todo', arguments: {} }],
        },
      })
      bridge.emit({
        type: 'message',
        sessionId: 'session-1',
        message: {
          id: 'todo-result',
          role: 'toolResult',
          content: 'Cleared 6 todos',
          status: 'complete',
          toolCallId: 'todo-call',
          toolName: 'todo',
        },
      })
      bridge.emit({
        type: 'tool',
        sessionId: 'session-1',
        tool: { id: 'todo-call', name: 'todo', status: 'complete', summary: 'Cleared 6 todos' },
      })
    })

    expect(await screen.findByText('Cleared 6 todos')).toBeInTheDocument()
    expect(screen.getAllByText('Cleared 6 todos')).toHaveLength(1)
  })

  it('renders a no-id assistant reply below the newest user message', async () => {
    const bridge = installBridge({
      listSessions: vi.fn(async () => [{ ...baseSession, status: 'running' as const }]),
    })

    renderWorkspace()
    await screen.findAllByText('project')

    act(() => {
      bridge.emit({
        type: 'message',
        sessionId: 'session-1',
        message: { id: 'assistant-old', role: 'assistant', content: 'old answer', status: 'streaming' },
      })
      bridge.emit({
        type: 'message',
        sessionId: 'session-1',
        message: { id: 'user-new', role: 'user', content: 'clear todo', status: 'complete' },
      })
      bridge.emit({
        type: 'message_part',
        sessionId: 'session-1',
        content: 'Clear the todo list.',
        partType: 'reasoning',
        part: { type: 'thinking', text: 'Clear the todo list.' },
      })
    })

    expect(await screen.findByText('Clear the todo list.')).toBeInTheDocument()
    const text = document.body.textContent ?? ''
    expect(text.indexOf('old answer')).toBeLessThan(text.indexOf('clear todo'))
    expect(text.indexOf('clear todo')).toBeLessThan(text.indexOf('Clear the todo list.'))
  })

  it('routes composer input by prefix', async () => {
    const bridge = installBridge({
      listSessions: vi.fn(async () => [{ ...baseSession, status: 'running' as const }]),
    })
    const user = userEvent.setup()

    renderWorkspace()
    await screen.findAllByText('project')

    const input = screen.getByLabelText('Send command')
    await user.type(input, 'hello{Enter}')
    expect(bridge.sendCommand).toHaveBeenCalledWith('session-1', 'hello', 'followUp', expectPromptIds())

    await user.type(input, '/compact{Enter}')
    expect(bridge.runSlashCommand).toHaveBeenCalledWith('session-1', 'compact', '', undefined)

    await user.type(input, '/goal test{Enter}')
    expect(bridge.runSlashCommand).toHaveBeenCalledWith('session-1', 'goal', 'test', undefined)

    await user.type(input, '!ls -la{Enter}')
    expect(bridge.runShellCommand).toHaveBeenCalledWith('session-1', 'ls -la')
  })

  it('echoes forwarded slash commands optimistically and reconciles by message id', async () => {
    const bridge = installBridge({
      listSessions: vi.fn(async () => [{ ...baseSession, status: 'running' as const }]),
      listCapabilities: vi.fn(async () => ({
        commands: [{ name: 'review', source: 'prompt', description: 'Review changes.' }],
      })),
      runSlashCommand: vi.fn(async () => ({ handledBy: 'pi' as const })),
    })
    const user = userEvent.setup()

    renderWorkspace()
    await screen.findAllByText('project')

    await user.type(screen.getByLabelText('Send command'), '/review now{Enter}')

    expect(await screen.findByText('/review now')).toBeInTheDocument()
    const promptIds = vi.mocked(bridge.runSlashCommand).mock.calls.at(-1)?.[3]
    expect(bridge.runSlashCommand).toHaveBeenCalledWith('session-1', 'review', 'now', expectPromptIds())
    if (!promptIds) throw new Error('Expected forwarded slash prompt ids')

    act(() => {
      bridge.emit({
        type: 'transcript_snapshot',
        sessionId: 'session-1',
        items: [
          {
            info: { id: promptIds.messageID, role: 'user', content: '/review now', status: 'complete' },
            parts: [{ id: promptIds.textPartID, messageId: promptIds.messageID, type: 'text', text: '/review now' }],
          },
        ],
      })
    })

    expect(screen.getAllByText('/review now')).toHaveLength(1)
  })

  it('sends on Enter and keeps Shift Enter as a newline', async () => {
    const bridge = installBridge({
      listSessions: vi.fn(async () => [{ ...baseSession, status: 'running' as const }]),
    })
    const user = userEvent.setup()

    renderWorkspace()
    await screen.findAllByText('project')

    const input = screen.getByLabelText('Send command')

    await user.type(input, 'hello{Shift>}{Enter}{/Shift}there')
    expect(input).toHaveValue('hello\nthere')

    await user.keyboard('{Enter}')
    expect(bridge.sendCommand).toHaveBeenCalledWith('session-1', 'hello\nthere', 'followUp', expectPromptIds())

    await user.type(input, '/goal test{Enter}')
    expect(bridge.runSlashCommand).toHaveBeenCalledWith('session-1', 'goal', 'test', undefined)

    await user.type(input, '!pwd{Enter}')
    expect(bridge.runShellCommand).toHaveBeenCalledWith('session-1', 'pwd')
  })

  it('renders slash autocomplete from capabilities', async () => {
    installBridge({
      listSessions: vi.fn(async () => [{ ...baseSession, status: 'running' as const }]),
      listCapabilities: vi.fn(async () => ({
        commands: [
          { name: 'compact', source: 'built-in', description: 'Shrink context.' },
          { name: 'review', source: 'prompt', description: 'Review the current changes.' },
        ],
      })),
    })
    const user = userEvent.setup()

    renderWorkspace()
    await screen.findAllByText('project')

    await user.type(screen.getByLabelText('Send command'), '/')

    expect(await screen.findByRole('listbox', { name: 'Slash commands' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: /\/compact/i })).toBeInTheDocument()
    expect(screen.getByText('built-in')).toBeInTheDocument()
  })

  it('renders todos above the composer in canonical order', async () => {
    const bridge = installBridge({
      listSessions: vi.fn(async () => [{ ...baseSession, status: 'running' as const }]),
    })

    renderWorkspace()
    await screen.findAllByText('project')

    act(() => {
      bridge.emit({
        type: 'todos',
        sessionId: 'session-1',
        todos: [
          { id: '3', content: 'Done task', status: 'completed' },
          { id: '2', content: 'Pending task', status: 'pending' },
          { id: '4', content: 'Cancelled task', status: 'cancelled' },
          { id: '1', content: 'Active task', status: 'in_progress', explanation: 'working now' },
        ],
      })
    })

    const composer = screen.getByLabelText('Send command').closest('form')
    expect(composer).not.toBeNull()
    const composerState = within(composer as HTMLElement)

    expect(composerState.getByText('Active task')).toBeInTheDocument()
    expect(composerState.getByText('Pending task')).toBeInTheDocument()
    expect(composerState.getByText('Done task')).toBeInTheDocument()
    expect(composerState.queryByText('Cancelled task')).not.toBeInTheDocument()
    expect(composerState.getByText('working now')).toBeInTheDocument()

    const text = (composer as HTMLElement).textContent ?? ''
    expect(text.indexOf('Done task')).toBeLessThan(text.indexOf('Pending task'))
    expect(text.indexOf('Pending task')).toBeLessThan(text.indexOf('Active task'))
  })

  it('shows a max-five balanced todo window around current progress', async () => {
    const bridge = installBridge({
      listSessions: vi.fn(async () => [{ ...baseSession, status: 'running' as const }]),
    })

    renderWorkspace()
    await screen.findAllByText('project')

    act(() => {
      bridge.emit({
        type: 'todos',
        sessionId: 'session-1',
        todos: [
          { id: '1', content: 'Task 1', status: 'completed' },
          { id: '2', content: 'Task 2', status: 'completed' },
          { id: '3', content: 'Task 3', status: 'completed' },
          { id: '4', content: 'Task 4', status: 'in_progress' },
          { id: '5', content: 'Task 5', status: 'pending' },
          { id: '6', content: 'Task 6', status: 'pending' },
          { id: '7', content: 'Task 7', status: 'pending' },
        ],
      })
    })

    const composer = screen.getByLabelText('Send command').closest('form')
    expect(composer).not.toBeNull()
    const composerState = within(composer as HTMLElement)

    expect(composerState.queryByText('Task 1')).not.toBeInTheDocument()
    for (const task of ['Task 2', 'Task 3', 'Task 4', 'Task 5', 'Task 6']) {
      expect(composerState.getByText(task)).toBeInTheDocument()
    }
    expect(composerState.queryByText('Task 7')).not.toBeInTheDocument()

    const text = (composer as HTMLElement).textContent ?? ''
    expect(text.indexOf('Task 2')).toBeLessThan(text.indexOf('Task 3'))
    expect(text.indexOf('Task 3')).toBeLessThan(text.indexOf('Task 4'))
    expect(text.indexOf('Task 4')).toBeLessThan(text.indexOf('Task 5'))
    expect(text.indexOf('Task 5')).toBeLessThan(text.indexOf('Task 6'))
  })

  it('shows the latest five completed todos when all todos are completed', async () => {
    const bridge = installBridge({
      listSessions: vi.fn(async () => [{ ...baseSession, status: 'running' as const }]),
    })

    renderWorkspace()
    await screen.findAllByText('project')

    act(() => {
      bridge.emit({
        type: 'todos',
        sessionId: 'session-1',
        todos: [
          { id: '1', content: 'Complete 1', status: 'completed' },
          { id: '2', content: 'Complete 2', status: 'completed' },
          { id: '3', content: 'Complete 3', status: 'completed' },
          { id: '4', content: 'Complete 4', status: 'completed' },
          { id: '5', content: 'Complete 5', status: 'completed' },
          { id: '6', content: 'Complete 6', status: 'completed' },
          { id: '7', content: 'Complete 7', status: 'completed' },
        ],
      })
    })

    const composer = screen.getByLabelText('Send command').closest('form')
    expect(composer).not.toBeNull()
    const composerState = within(composer as HTMLElement)

    expect(composerState.queryByText('Complete 1')).not.toBeInTheDocument()
    expect(composerState.queryByText('Complete 2')).not.toBeInTheDocument()
    for (const task of ['Complete 3', 'Complete 4', 'Complete 5', 'Complete 6', 'Complete 7']) {
      expect(composerState.getByText(task)).toBeInTheDocument()
    }
  })

  it('expands and collapses the todo panel including cancelled todos', async () => {
    const bridge = installBridge({
      listSessions: vi.fn(async () => [{ ...baseSession, status: 'running' as const }]),
    })
    const user = userEvent.setup()

    renderWorkspace()
    await screen.findAllByText('project')

    act(() => {
      bridge.emit({
        type: 'todos',
        sessionId: 'session-1',
        todos: [
          { id: '1', content: 'Expand 1', status: 'completed' },
          { id: '2', content: 'Expand 2', status: 'completed' },
          { id: '3', content: 'Expand 3', status: 'in_progress' },
          { id: '4', content: 'Expand 4', status: 'pending' },
          { id: '5', content: 'Expand 5', status: 'pending' },
          { id: '6', content: 'Expand 6', status: 'pending' },
          { id: '7', content: 'Expand 7', status: 'pending' },
          { id: '8', content: 'Cancelled expand task', status: 'cancelled' },
        ],
      })
    })

    const composer = screen.getByLabelText('Send command').closest('form')
    expect(composer).not.toBeNull()
    const composerState = within(composer as HTMLElement)

    expect(composerState.queryByText('Expand 6')).not.toBeInTheDocument()
    expect(composerState.queryByText('Expand 7')).not.toBeInTheDocument()
    expect(composerState.queryByText('Cancelled expand task')).not.toBeInTheDocument()

    await user.click(composerState.getByRole('button', { name: /expand todos/i }))

    expect(composerState.getByText('Expand 6')).toBeInTheDocument()
    expect(composerState.getByText('Expand 7')).toBeInTheDocument()
    expect(composerState.getByText('Cancelled expand task')).toBeInTheDocument()

    await user.click(composerState.getByRole('button', { name: /collapse todos/i }))

    expect(composerState.queryByText('Expand 6')).not.toBeInTheDocument()
    expect(composerState.queryByText('Expand 7')).not.toBeInTheDocument()
    expect(composerState.queryByText('Cancelled expand task')).not.toBeInTheDocument()
  })

  it('hides the todo-list extension widget because todos have a dedicated panel', async () => {
    const bridge = installBridge({
      listSessions: vi.fn(async () => [{ ...baseSession, status: 'running' as const }]),
    })

    renderWorkspace()
    await screen.findAllByText('project')

    act(() => {
      bridge.emit({
        type: 'metadata',
        sessionId: 'session-1',
        metadata: {
          extensionStatuses: {
            'approval-mode': 'DEFAULT',
            memory: 'Idle',
          },
          extensionWidgets: {
            'todo-list': {
              lines: ['Todos 1 active · 2 pending', '◐ #1 Ship feature'],
            },
            'steer-hint': {
              lines: ['Enter steers the active turn.'],
            },
          },
        },
      })
    })

    expect(screen.getByText('Extension UI')).toBeInTheDocument()
    expect(screen.getByText('approval-mode')).toBeInTheDocument()
    expect(screen.getByText('steer-hint')).toBeInTheDocument()
    expect(screen.queryByText('todo-list')).not.toBeInTheDocument()
    expect(screen.queryByText('Ship feature')).not.toBeInTheDocument()
  })

  it('renders queued steering and follow-up state', async () => {
    const bridge = installBridge({
      listSessions: vi.fn(async () => [{ ...baseSession, status: 'running' as const }]),
    })

    renderWorkspace()
    await screen.findAllByText('project')

    act(() => {
      bridge.emit({
        type: 'metadata',
        sessionId: 'session-1',
        metadata: {
          queue: {
            steering: [{ id: 's1', content: 'Watch the failing test' }],
            followUp: [{ id: 'f1', content: 'Summarize changes' }],
          },
          steerQueue: {
            active: true,
            queuedCount: 2,
            canSteer: true,
            canQueue: true,
            hint: 'Enter steers the active turn. Tab queues a follow-up.',
          },
        },
      })
    })

    const composer = screen.getByLabelText('Send command').closest('form') as HTMLElement
    const composerState = within(composer)

    expect(composerState.getByText('Watch the failing test')).toBeInTheDocument()
    expect(composerState.getByText('Summarize changes')).toBeInTheDocument()
    expect(composerState.getByText('2 queued')).toBeInTheDocument()
    expect(composerState.getByText(/Enter steers/)).toBeInTheDocument()
  })

  it('uses active steering keyboard behavior and explicit queue action', async () => {
    const bridge = installBridge({
      listSessions: vi.fn(async () => [{ ...baseSession, status: 'running' as const }]),
    })
    const user = userEvent.setup()

    renderWorkspace()
    await screen.findAllByText('project')

    act(() => {
      bridge.emit({
        type: 'metadata',
        sessionId: 'session-1',
        metadata: {
          steerQueue: {
            active: true,
            queuedCount: 0,
            canSteer: true,
            canQueue: true,
            hint: 'Enter steers the active turn. Tab queues a follow-up.',
          },
        },
      })
    })

    const input = screen.getByLabelText('Send command')

    await user.type(input, 'steer now{Enter}')
    expect(bridge.sendCommand).toHaveBeenLastCalledWith('session-1', 'steer now', 'steer', expectPromptIds())

    await user.type(input, 'queue with tab')
    await user.keyboard('{Tab}')
    expect(bridge.sendCommand).toHaveBeenLastCalledWith('session-1', 'queue with tab', 'followUp', expectPromptIds())
    expect(input).toHaveValue('')

    await user.type(input, 'queue with button')
    await user.click(screen.getByRole('button', { name: /queue/i }))
    expect(bridge.sendCommand).toHaveBeenLastCalledWith('session-1', 'queue with button', 'followUp', expectPromptIds())

    await user.type(input, 'line one{Shift>}{Enter}{/Shift}line two')
    expect(input).toHaveValue('line one\nline two')
  })

  it('keeps inline select keyboard priority over active steering', async () => {
    const bridge = installBridge({
      listSessions: vi.fn(async () => [{ ...baseSession, status: 'running' as const }]),
    })
    const user = userEvent.setup()

    renderWorkspace()
    await screen.findAllByText('project')

    act(() => {
      bridge.emit({
        type: 'metadata',
        sessionId: 'session-1',
        metadata: {
          steerQueue: {
            active: true,
            queuedCount: 0,
            canSteer: true,
            canQueue: true,
            hint: 'Enter steers the active turn. Tab queues a follow-up.',
          },
        },
      })
      bridge.emit({
        type: 'extension_ui',
        sessionId: 'session-1',
        request: {
          id: 'select-active',
          type: 'select',
          title: 'Choose option',
          options: [{ label: 'Only', value: 'only' }],
        },
      })
    })

    const filter = await screen.findByLabelText('Filter Choose option')
    filter.focus()
    await user.keyboard('{Enter}')

    expect(bridge.respondToExtensionUi).toHaveBeenCalledWith('session-1', {
      id: 'select-active',
      value: 'only',
    })
    expect(bridge.sendCommand).not.toHaveBeenCalled()
  })

  it('filters slash autocomplete after typing a query', async () => {
    installBridge({
      listSessions: vi.fn(async () => [{ ...baseSession, status: 'running' as const }]),
      listCapabilities: vi.fn(async () => ({
        commands: [
          { name: 'compact', source: 'built-in', description: 'Shrink context.' },
          { name: 'review', source: 'prompt', description: 'Review the current changes.' },
        ],
      })),
    })
    const user = userEvent.setup()

    renderWorkspace()
    await screen.findAllByText('project')

    await user.type(screen.getByLabelText('Send command'), '/re')

    expect(await screen.findByRole('option', { name: /\/review/i })).toBeInTheDocument()
    expect(screen.queryByRole('option', { name: /\/compact/i })).not.toBeInTheDocument()
  })

  it('shows Pi TUI built-ins in slash autocomplete', async () => {
    installBridge({
      listSessions: vi.fn(async () => [{ ...baseSession, status: 'running' as const }]),
      listCapabilities: vi.fn(async () => ({
        commands: [
          { name: 'resume', source: 'builtin', description: 'Resume a different session' },
          { name: 'review', source: 'prompt', description: 'Review the current changes.' },
        ],
      })),
    })
    const user = userEvent.setup()

    renderWorkspace()
    await screen.findAllByText('project')

    await user.type(screen.getByLabelText('Send command'), '/res')

    expect(await screen.findByRole('option', { name: /\/resume/i })).toBeInTheDocument()
    expect(screen.getByText('builtin')).toBeInTheDocument()
  })

  it('inserts a selected slash command with the keyboard', async () => {
    installBridge({
      listSessions: vi.fn(async () => [{ ...baseSession, status: 'running' as const }]),
      listCapabilities: vi.fn(async () => ({
        commands: [
          { name: 'compact', source: 'built-in', description: 'Compact the current session.' },
          { name: 'review', source: 'prompt', description: 'Review the current changes.' },
        ],
      })),
    })
    const user = userEvent.setup()

    renderWorkspace()
    await screen.findAllByText('project')

    const input = screen.getByLabelText('Send command')
    await user.type(input, '/')
    await screen.findByRole('listbox', { name: 'Slash commands' })
    await user.keyboard('{ArrowDown}{Tab}')

    expect(input).toHaveValue('/review ')
  })

  it('inserts a clicked slash command', async () => {
    installBridge({
      listSessions: vi.fn(async () => [{ ...baseSession, status: 'running' as const }]),
      listCapabilities: vi.fn(async () => ({
        commands: [
          { name: 'compact', source: 'built-in', description: 'Compact the current session.' },
          { name: 'review', source: 'prompt', description: 'Review the current changes.' },
        ],
      })),
    })
    const user = userEvent.setup()

    renderWorkspace()
    await screen.findAllByText('project')

    const input = screen.getByLabelText('Send command')
    await user.type(input, '/re')
    await user.click(await screen.findByRole('option', { name: /\/review/i }))

    expect(input).toHaveValue('/review ')
  })

  it('renders built-in slash command result text in the transcript', async () => {
    installBridge({
      listSessions: vi.fn(async () => [{ ...baseSession, status: 'running' as const }]),
      runSlashCommand: vi.fn(async () => ({ handledBy: 'builtin' as const, message: 'Session\nName: project' })),
    })
    const user = userEvent.setup()

    renderWorkspace()
    await screen.findAllByText('project')

    await user.type(screen.getByLabelText('Send command'), '/session{Enter}')

    expect(await screen.findByText(/Name: project/)).toBeInTheDocument()
  })

  it('opens returned built-in select UI and sends the response through the bridge', async () => {
    const bridge = installBridge({
      listSessions: vi.fn(async () => [{ ...baseSession, status: 'running' as const }]),
      runSlashCommand: vi.fn(async () => ({
        handledBy: 'builtin' as const,
        uiRequest: {
          id: 'builtin-model',
          type: 'select' as const,
          title: 'Choose model',
          options: [
            { label: 'google/gemini-test', value: 'google' },
            { label: 'openai/gpt-test', value: 'openai' },
          ],
        },
      })),
    })
    const user = userEvent.setup()

    renderWorkspace()
    await screen.findAllByText('project')

    await user.type(screen.getByLabelText('Send command'), '/model{Enter}')
    await user.click(await screen.findByRole('option', { name: 'openai/gpt-test' }))

    expect(bridge.runSlashCommand).toHaveBeenCalledWith('session-1', 'model', '', undefined)
    expect(bridge.respondToExtensionUi).toHaveBeenCalledWith('session-1', {
      id: 'builtin-model',
      value: 'openai',
    })
  })

  it('handles built-in UI responses that return a session and message', async () => {
    const resumedSession = { ...baseSession, id: 'session-2', displayName: 'resumed' }
    const bridge = installBridge({
      listSessions: vi.fn(async () => [{ ...baseSession, status: 'running' as const }]),
      openSession: vi.fn(async (sessionId) => ({
        ...baseSession,
        id: sessionId,
        displayName: sessionId === 'session-2' ? 'resumed' : 'project',
        status: 'running' as const,
      })),
      runSlashCommand: vi.fn(async () => ({
        handledBy: 'builtin' as const,
        uiRequest: {
          id: 'builtin-quit',
          type: 'confirm' as const,
          title: 'Close Pi session',
          message: 'Close this session?',
        },
      })),
      respondToExtensionUi: vi.fn(async () => ({
        handledBy: 'builtin' as const,
        message: 'Resumed resumed.',
        session: resumedSession,
      })),
    })
    const user = userEvent.setup()

    renderWorkspace()
    await screen.findAllByText('project')

    await user.type(screen.getByLabelText('Send command'), '/quit{Enter}')
    await user.click(await screen.findByRole('button', { name: 'Confirm' }))

    expect(bridge.respondToExtensionUi).toHaveBeenCalledWith('session-1', {
      id: 'builtin-quit',
      confirmed: true,
    })
    expect((await screen.findAllByText('resumed')).length).toBeGreaterThan(0)
    expect(await screen.findByText('Resumed resumed.')).toBeInTheDocument()
  })

  it('reopens a built-in resume result and displays the resumed transcript', async () => {
    const resumedSession = { ...baseSession, id: 'session-2', displayName: 'resumed' }
    const openSession = vi.fn(async (sessionId: string) => {
      if (sessionId === 'session-2') {
        ;(window.openseAssistant as (OpenSeAssistantBridge & { emit: (event: AssistantSessionEvent) => void })).emit({
          type: 'messages',
          sessionId,
          messages: [
            {
              id: 'resumed-history',
              role: 'assistant',
              content: 'resumed transcript history',
              createdAt: '2026-06-03T00:00:00.000Z',
              status: 'complete',
            },
          ],
        })
      }
      return { ...baseSession, id: sessionId, displayName: sessionId === 'session-2' ? 'resumed' : 'project', status: 'running' as const }
    })
    installBridge({
      listSessions: vi.fn(async () => [{ ...baseSession, status: 'running' as const }]),
      openSession,
      runSlashCommand: vi.fn(async () => ({
        handledBy: 'builtin' as const,
        session: resumedSession,
      })),
    })
    const user = userEvent.setup()

    renderWorkspace()
    await screen.findAllByText('project')

    await user.type(screen.getByLabelText('Send command'), '/resume{Enter}')

    await waitFor(() => expect(openSession).toHaveBeenCalledWith('session-2'))
    expect(await screen.findByText('resumed transcript history')).toBeInTheDocument()
  })

  it('renders non-select extension UI requests as modal dialogs and sends responses', async () => {
    const bridge = installBridge({
      listSessions: vi.fn(async () => [{ ...baseSession, status: 'running' as const }]),
    })
    const user = userEvent.setup()

    renderWorkspace()
    await screen.findAllByText('project')

    act(() => {
      bridge.emit({
        type: 'extension_ui',
        sessionId: 'session-1',
        request: {
          id: 'request-1',
          type: 'input',
          title: 'Need value',
          message: 'Enter a value.',
          placeholder: 'value',
        },
      })
    })

    await user.type(await screen.findByLabelText('Need value'), 'hello')
    await user.click(screen.getByRole('button', { name: 'Submit' }))

    expect(bridge.respondToExtensionUi).toHaveBeenCalledWith('session-1', {
      id: 'request-1',
      value: 'hello',
    })
  })

  it('renders select extension UI requests inline and confirms with filtering and Enter', async () => {
    const bridge = installBridge({
      listSessions: vi.fn(async () => [{ ...baseSession, status: 'running' as const }]),
    })
    const user = userEvent.setup()

    renderWorkspace()
    await screen.findAllByText('project')

    act(() => {
      bridge.emit({
        type: 'extension_ui',
        sessionId: 'session-1',
        request: {
          id: 'select-1',
          type: 'select',
          title: 'Choose model',
          message: 'Current model: google/gemini-test',
          options: [
            { label: 'google/gemini-test', value: 'google' },
            { label: 'openai/gpt-test', value: 'openai' },
          ],
        },
      })
    })

    expect(await screen.findByRole('listbox', { name: 'Choose model' })).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    await user.type(screen.getByLabelText('Filter Choose model'), 'open')
    expect(screen.queryByRole('option', { name: /google\/gemini-test/i })).not.toBeInTheDocument()
    await user.keyboard('{Enter}')

    expect(bridge.respondToExtensionUi).toHaveBeenCalledWith('session-1', {
      id: 'select-1',
      value: 'openai',
    })
    expect(bridge.sendCommand).not.toHaveBeenCalled()
  })

  it('supports mouse selection and Escape cancellation for inline select requests', async () => {
    const bridge = installBridge({
      listSessions: vi.fn(async () => [{ ...baseSession, status: 'running' as const }]),
    })
    const user = userEvent.setup()

    renderWorkspace()
    await screen.findAllByText('project')

    act(() => {
      bridge.emit({
        type: 'extension_ui',
        sessionId: 'session-1',
        request: {
          id: 'select-2',
          type: 'select',
          title: 'Choose option',
          options: [
            { label: 'First', value: 'first' },
            { label: 'Second', value: 'second' },
          ],
        },
      })
    })

    await user.click(await screen.findByRole('option', { name: 'Second' }))
    expect(bridge.respondToExtensionUi).toHaveBeenCalledWith('session-1', {
      id: 'select-2',
      value: 'second',
    })

    act(() => {
      bridge.emit({
        type: 'extension_ui',
        sessionId: 'session-1',
        request: {
          id: 'select-3',
          type: 'select',
          title: 'Choose option',
          options: [{ label: 'Only', value: 'only' }],
        },
      })
    })

    const filter = await screen.findByLabelText('Filter Choose option')
    filter.focus()
    await user.keyboard('{Escape}')
    expect(bridge.respondToExtensionUi).toHaveBeenCalledWith('session-1', {
      id: 'select-3',
      cancelled: true,
    })
  })

  it('renders option-list extension UI inline and selects with keyboard navigation', async () => {
    const bridge = installBridge({
      listSessions: vi.fn(async () => [{ ...baseSession, status: 'running' as const }]),
    })
    const user = userEvent.setup()

    renderWorkspace()
    await screen.findAllByText('project')

    act(() => {
      bridge.emit({
        type: 'extension_ui',
        sessionId: 'session-1',
        request: {
          id: 'options-1',
          type: 'option-list',
          title: 'Permission Mode',
          message: 'Current mode: default',
          selectionMode: 'single',
          options: [
            { label: 'Default', value: 'default', checked: true },
            { label: 'Auto Review', value: 'auto-review', description: 'Guardian reviewed approvals' },
          ],
        },
      })
    })

    expect(await screen.findByRole('listbox', { name: 'Permission Mode' })).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Default' })).toHaveAttribute('aria-selected', 'true')

    await user.keyboard('{ArrowDown}')
    expect(screen.getByRole('option', { name: /Auto Review/i })).toHaveAttribute('aria-selected', 'true')
    await user.keyboard(' ')

    expect(bridge.respondToExtensionUi).toHaveBeenCalledWith('session-1', {
      id: 'options-1',
      value: 'auto-review',
    })
  })

  it('cancels option-list requests with Escape', async () => {
    const bridge = installBridge({
      listSessions: vi.fn(async () => [{ ...baseSession, status: 'running' as const }]),
    })
    const user = userEvent.setup()

    renderWorkspace()
    await screen.findAllByText('project')

    act(() => {
      bridge.emit({
        type: 'extension_ui',
        sessionId: 'session-1',
        request: {
          id: 'options-2',
          type: 'option-list',
          title: 'Choose option',
          selectionMode: 'single',
          options: [{ label: 'Only', value: 'only' }],
        },
      })
    })

    await screen.findByRole('listbox', { name: 'Choose option' })
    await user.keyboard('{Escape}')

    expect(bridge.respondToExtensionUi).toHaveBeenCalledWith('session-1', {
      id: 'options-2',
      cancelled: true,
    })
  })

  it('toggles multiple option-list values and submits values with Enter', async () => {
    const bridge = installBridge({
      listSessions: vi.fn(async () => [{ ...baseSession, status: 'running' as const }]),
    })
    const user = userEvent.setup()
    const scrollIntoView = vi.fn()
    Element.prototype.scrollIntoView = scrollIntoView

    renderWorkspace()
    await screen.findAllByText('project')

    act(() => {
      bridge.emit({
        type: 'extension_ui',
        sessionId: 'session-1',
        request: {
          id: 'options-3',
          type: 'option-list',
          title: 'Pick tools',
          selectionMode: 'multiple',
          options: [
            { label: 'Read', value: 'read', checked: true },
            { label: 'Write', value: 'write' },
          ],
        },
      })
    })

    expect(await screen.findByRole('option', { name: 'Read' })).toHaveAttribute('aria-checked', 'true')
    await user.keyboard('{ArrowDown}')
    await waitFor(() => expect(scrollIntoView).toHaveBeenCalledWith({ block: 'nearest' }))
    await user.keyboard(' ')
    expect(screen.getByRole('option', { name: 'Write' })).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByRole('option', { name: 'Write' })).toHaveAttribute('aria-selected', 'true')
    await user.keyboard('{Enter}')

    expect(bridge.respondToExtensionUi).toHaveBeenCalledWith('session-1', {
      id: 'options-3',
      values: ['read', 'write'],
    })
  })
})

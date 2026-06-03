import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AssistantWorkspace } from '../components/AssistantWorkspace'
import type {
  AssistantSession,
  AssistantSessionEvent,
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

const renderWorkspace = (initialEntries = ['/']) =>
  render(
    <MemoryRouter initialEntries={initialEntries}>
      <Routes>
        <Route path="/" element={<AssistantWorkspace />} />
        <Route path="/sessions/:sessionId" element={<AssistantWorkspace />} />
      </Routes>
    </MemoryRouter>,
  )

const installBridge = (overrides: Partial<OpenSeAssistantBridge> = {}) => {
  const listeners = new Map<string, (event: AssistantSessionEvent) => void>()
  const bridge: OpenSeAssistantBridge & {
    emit: (event: AssistantSessionEvent) => void
  } = {
    getStatus: vi.fn(async () => ({ available: true, version: 'pi-test' })),
    listSessions: vi.fn(async () => []),
    createSession: vi.fn(async () => baseSession),
    openSession: vi.fn(async (sessionId) => ({ ...baseSession, id: sessionId, status: 'running' as const })),
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
    emit: (event) => {
      listeners.get(event.sessionId)?.(event)
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

  it('renders persisted sessions as active project tabs with plain session links', async () => {
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
    expect(await screen.findByRole('link', { name: /^project project$/i })).toHaveClass('bg-[var(--color-side-nav-active-bg)]')
    expect(screen.getByRole('link', { name: /^current work$/i })).not.toHaveClass('bg-[var(--color-side-nav-active-bg)]')
    await waitFor(() => expect(bridge.openSession).toHaveBeenCalledWith('session-1'))
    expect(screen.getByText(/Users\/dev\/project/)).toBeInTheDocument()
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

  it('routes composer input by prefix', async () => {
    const bridge = installBridge({
      listSessions: vi.fn(async () => [{ ...baseSession, status: 'running' as const }]),
    })
    const user = userEvent.setup()

    renderWorkspace()
    await screen.findAllByText('project')

    const input = screen.getByLabelText('Send command')
    const send = screen.getByRole('button', { name: /send/i })

    await user.type(input, 'hello')
    await user.click(send)
    expect(bridge.sendCommand).toHaveBeenCalledWith('session-1', 'hello', 'followUp')

    await user.type(input, '/compact')
    await user.click(send)
    expect(bridge.runSlashCommand).toHaveBeenCalledWith('session-1', 'compact', '')

    await user.type(input, '/goal test')
    await user.click(send)
    expect(bridge.runSlashCommand).toHaveBeenCalledWith('session-1', 'goal', 'test')

    await user.type(input, '!ls -la')
    await user.click(send)
    expect(bridge.runShellCommand).toHaveBeenCalledWith('session-1', 'ls -la')
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
    expect(bridge.sendCommand).toHaveBeenCalledWith('session-1', 'hello\nthere', 'followUp')

    await user.type(input, '/goal test{Enter}')
    expect(bridge.runSlashCommand).toHaveBeenCalledWith('session-1', 'goal', 'test')

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
    expect(bridge.sendCommand).toHaveBeenLastCalledWith('session-1', 'steer now', 'steer')

    await user.type(input, 'queue with tab')
    await user.keyboard('{Tab}')
    expect(bridge.sendCommand).toHaveBeenLastCalledWith('session-1', 'queue with tab', 'followUp')
    expect(input).toHaveValue('')

    await user.type(input, 'queue with button')
    await user.click(screen.getByRole('button', { name: /queue/i }))
    expect(bridge.sendCommand).toHaveBeenLastCalledWith('session-1', 'queue with button', 'followUp')

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

    await user.type(screen.getByLabelText('Send command'), '/session')
    await user.click(screen.getByRole('button', { name: /send/i }))

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

    await user.type(screen.getByLabelText('Send command'), '/model')
    await user.click(screen.getByRole('button', { name: /send/i }))
    await user.click(await screen.findByRole('option', { name: 'openai/gpt-test' }))

    expect(bridge.runSlashCommand).toHaveBeenCalledWith('session-1', 'model', '')
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

    await user.type(screen.getByLabelText('Send command'), '/quit')
    await user.click(screen.getByRole('button', { name: /send/i }))
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

    await user.type(screen.getByLabelText('Send command'), '/resume')
    await user.click(screen.getByRole('button', { name: /send/i }))

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
})

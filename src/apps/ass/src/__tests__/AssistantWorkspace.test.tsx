import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
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

const renderWorkspace = () =>
  render(
    <MemoryRouter>
      <AssistantWorkspace />
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

  it('renders persisted sessions from the desktop registry', async () => {
    installBridge({
      listSessions: vi.fn(async () => [baseSession]),
    })

    renderWorkspace()

    expect((await screen.findAllByText('project')).length).toBeGreaterThan(0)
    expect(screen.getByText(/Users\/dev\/project/)).toBeInTheDocument()
  })

  it('creates a session through the directory picker flow', async () => {
    const bridge = installBridge()
    const user = userEvent.setup()

    renderWorkspace()

    await user.click(await screen.findByRole('button', { name: /choose directory/i }))

    await waitFor(() => expect(bridge.createSession).toHaveBeenCalledWith())
    expect((await screen.findAllByText('project')).length).toBeGreaterThan(0)
  })

  it('applies streaming transcript updates and can abort', async () => {
    const bridge = installBridge({
      listSessions: vi.fn(async () => [{ ...baseSession, status: 'running' as const }]),
    })
    const user = userEvent.setup()

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

    await user.click(screen.getByRole('button', { name: 'Abort' }))
    expect(bridge.abort).toHaveBeenCalledWith('session-1')
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

  it('renders todos above the composer and in the sidebar with native ordering', async () => {
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
    expect(text.indexOf('Active task')).toBeLessThan(text.indexOf('Pending task'))
    expect(text.indexOf('Pending task')).toBeLessThan(text.indexOf('Done task'))
    expect(screen.getByText('Work state')).toBeInTheDocument()
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

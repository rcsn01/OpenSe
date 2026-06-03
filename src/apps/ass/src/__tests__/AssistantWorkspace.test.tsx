import { act, render, screen, waitFor } from '@testing-library/react'
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
    expect(bridge.sendCommand).toHaveBeenCalledWith('session-1', 'hello')

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
    await user.keyboard('{ArrowDown}{Enter}')

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

  it('renders extension UI requests and sends responses', async () => {
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
})

import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { EventEmitter } from 'node:events'
import { afterEach, describe, expect, it, vi } from 'vitest'
import assistantModule from '../electron/assistant-service.cjs'

const {
  buildPiRuntimeEnv,
  createAssistantService,
  normalizeMessageRecord,
  normalizePiEvent,
  parseEnvOutput,
  validateCommand,
  validateCreateSessionInput,
  validateSessionId,
} = assistantModule

let tempRoot

const makeTempRoot = () => {
  tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'open-ass-test-'))
  return tempRoot
}

const createFakeRpcProcess = () => {
  const child = new EventEmitter()
  child.stdout = new EventEmitter()
  child.stderr = new EventEmitter()
  child.exitCode = null
  child.signalCode = null
  child.writes = []
  child.stdin = {
    destroyed: false,
    writable: true,
    write(line) {
      const command = JSON.parse(line)
      child.writes.push(command)
      const base = { id: command.id, type: 'response', command: command.type, success: true }
      const data = (() => {
        if (command.type === 'get_state') {
          return {
            sessionId: 'pi-session-id',
            sessionFile: '/tmp/pi-session.jsonl',
            sessionName: 'project',
            model: { provider: 'google', id: 'gemini-test' },
            thinkingLevel: 'medium',
            isStreaming: false,
            isCompacting: false,
            steeringMode: 'all',
            followUpMode: 'one-at-a-time',
            autoCompactionEnabled: true,
            messageCount: 1,
            pendingMessageCount: 0,
          }
        }
        if (command.type === 'get_messages') {
          return [{ id: 'msg_loaded', role: 'user', content: [{ type: 'text', text: 'loaded' }] }]
        }
        if (command.type === 'get_commands') return { commands: [{ name: 'fix', source: 'prompt' }] }
        if (command.type === 'get_available_models') return { models: [{ provider: 'google', id: 'gemini-test' }] }
        if (command.type === 'get_session_stats') return { totalMessages: 1 }
        if (command.type === 'bash') return { output: 'ok', exitCode: 0, cancelled: false, truncated: false }
      })()
      setImmediate(() => {
        child.stdout.emit('data', `${JSON.stringify(data === undefined ? base : { ...base, data })}\n`)
        if (command.type === 'prompt') {
          child.stdout.emit(
            'data',
            `${JSON.stringify({
              type: 'message_update',
              message: { id: 'msg_assistant', role: 'assistant', content: [] },
              assistantMessageEvent: { type: 'text_delta', delta: 'hello' },
            })}\n`,
          )
        }
      })
    },
  }
  child.kill = (signal = 'SIGTERM') => {
    child.signalCode = signal
    child.exitCode = 0
    child.emit('exit', 0, signal)
  }
  return child
}

describe('assistant service', () => {
  afterEach(() => {
    if (tempRoot) {
      fs.rmSync(tempRoot, { recursive: true, force: true })
      tempRoot = undefined
    }
    vi.restoreAllMocks()
  })

  it('validates renderer-controlled input', () => {
    expect(validateSessionId('ses_test')).toBe('ses_test')
    expect(() => validateSessionId('../bad')).toThrow(/session id/)
    expect(validateCommand('hello')).toBe('hello')
    expect(() => validateCommand('')).toThrow(/Command/)

    const directoryPath = makeTempRoot()
    expect(validateCreateSessionInput({ directoryPath })).toEqual({ directoryPath })
    expect(() => validateCreateSessionInput({ directoryPath: '/does/not/exist' })).toThrow(/does not exist/)
  })

  it('loads login shell environment so the desktop process can find terminal-installed Pi', () => {
    expect(parseEnvOutput('PATH=/opt/homebrew/bin:/usr/bin\nPI_BIN_PATH=/opt/homebrew/bin/pi\n')).toEqual({
      PATH: '/opt/homebrew/bin:/usr/bin',
      PI_BIN_PATH: '/opt/homebrew/bin/pi',
    })

    const spawnSync = vi.fn(() => ({
      status: 0,
      stdout: 'PATH=/opt/homebrew/bin:/usr/bin\nPI_BIN_PATH=/opt/homebrew/bin/pi\n',
    }))
    const env = buildPiRuntimeEnv({ SHELL: '/bin/zsh', PATH: '/usr/bin' }, spawnSync)

    expect(spawnSync).toHaveBeenCalledWith('/bin/zsh', ['-lc', 'env'], expect.objectContaining({ encoding: 'utf8' }))
    expect(env.PATH).toBe('/opt/homebrew/bin:/usr/bin')
    expect(env.PI_BIN_PATH).toBe('/opt/homebrew/bin/pi')
    expect(env.OPENCODE_CLIENT).toBe('desktop')
  })

  it('persists the Open-Ass session registry and starts Pi in RPC mode', async () => {
    const directoryPath = makeTempRoot()
    const fakeProcess = createFakeRpcProcess()
    const spawn = vi.fn(() => fakeProcess)
    const service = createAssistantService({
      userDataPath: path.join(directoryPath, 'user-data'),
      spawn,
      spawnSync: vi.fn(() => ({ status: 0, stdout: '0.78.0' })),
      env: { OPENASS_DISABLE_SHELL_ENV: '1' },
    })

    const session = await service.createSession({ directoryPath })
    const sessions = await service.listSessions()

    expect(session.displayName).toBe('project')
    expect(session.status).toBe('running')
    expect(session.piSessionFile).toBe('/tmp/pi-session.jsonl')
    expect(sessions).toHaveLength(1)
    expect(spawn).toHaveBeenCalledWith(
      'pi',
      expect.arrayContaining(['--mode', 'rpc', '--session-dir']),
      expect.objectContaining({ cwd: directoryPath, env: expect.objectContaining({ OPENCODE_CLIENT: 'desktop' }) }),
    )
    expect(fakeProcess.writes.map((command) => command.type)).toContain('get_state')
    expect(fakeProcess.writes.map((command) => command.type)).toContain('get_messages')
  })

  it('does not pass a directory-valued piSessionFile to Pi --session', async () => {
    const directoryPath = makeTempRoot()
    const userDataPath = path.join(directoryPath, 'user-data')
    const staleSessionDirectory = path.join(directoryPath, 'stale-session-dir')
    fs.mkdirSync(staleSessionDirectory, { recursive: true })
    fs.mkdirSync(path.join(userDataPath, 'open-ass'), { recursive: true })
    fs.writeFileSync(
      path.join(userDataPath, 'open-ass', 'sessions.json'),
      JSON.stringify([
        {
          id: 'ses_existing',
          piSessionId: 'ses_existing',
          piSessionFile: staleSessionDirectory,
          directoryPath,
          displayName: 'existing',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          status: 'closed',
        },
      ]),
    )

    const fakeProcess = createFakeRpcProcess()
    const spawn = vi.fn(() => fakeProcess)
    const service = createAssistantService({
      userDataPath,
      spawn,
      spawnSync: vi.fn(() => ({ status: 0, stdout: '0.78.0' })),
      env: { OPENASS_DISABLE_SHELL_ENV: '1' },
    })

    await service.openSession('ses_existing')
    const args = spawn.mock.calls[0][1]

    expect(args).not.toContain('--session')
    expect(args).toEqual(expect.arrayContaining(['--session-id', 'ses_existing']))
  })

  it('loads messages and forwards prompt calls over Pi RPC JSONL', async () => {
    const directoryPath = makeTempRoot()
    const fakeProcess = createFakeRpcProcess()
    const service = createAssistantService({
      userDataPath: path.join(directoryPath, 'user-data'),
      spawn: vi.fn(() => fakeProcess),
      spawnSync: vi.fn(() => ({ status: 0, stdout: '0.78.0' })),
      env: { OPENASS_DISABLE_SHELL_ENV: '1' },
    })
    const session = await service.createSession({ directoryPath })
    const events = []
    const unsubscribe = service.onSessionEvent(session.id, (event) => events.push(event))

    await service.openSession(session.id)
    await service.sendCommand(session.id, 'status')
    await new Promise((resolve) => setImmediate(resolve))

    expect(events.some((event) => event.type === 'messages' && event.messages[0]?.content === 'loaded')).toBe(true)
    expect(fakeProcess.writes.find((command) => command.type === 'prompt')).toMatchObject({
      type: 'prompt',
      message: 'status',
      streamingBehavior: 'followUp',
    })
    expect(events.some((event) => event.type === 'text_delta' && event.delta === 'hello')).toBe(true)

    unsubscribe()
  })

  it('forwards runtime setters over Pi RPC and refreshes state', async () => {
    const directoryPath = makeTempRoot()
    const fakeProcess = createFakeRpcProcess()
    const service = createAssistantService({
      userDataPath: path.join(directoryPath, 'user-data'),
      spawn: vi.fn(() => fakeProcess),
      spawnSync: vi.fn(() => ({ status: 0, stdout: '0.78.0' })),
      env: { OPENASS_DISABLE_SHELL_ENV: '1' },
    })
    const session = await service.createSession({ directoryPath })

    await service.setThinkingLevel(session.id, 'high')

    expect(fakeProcess.writes.find((command) => command.type === 'set_thinking_level')).toMatchObject({
      type: 'set_thinking_level',
      level: 'high',
    })
    expect(fakeProcess.writes.filter((command) => command.type === 'get_state').length).toBeGreaterThan(1)
  })

  it('lists Pi RPC commands alongside Open-Ass built-ins', async () => {
    const directoryPath = makeTempRoot()
    const fakeProcess = createFakeRpcProcess()
    const service = createAssistantService({
      userDataPath: path.join(directoryPath, 'user-data'),
      spawn: vi.fn(() => fakeProcess),
      spawnSync: vi.fn(() => ({ status: 0, stdout: '0.78.0' })),
      env: { OPENASS_DISABLE_SHELL_ENV: '1' },
    })
    const session = await service.createSession({ directoryPath })

    const capabilities = await service.listCapabilities(session.id)

    expect(capabilities.commands).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'compact', source: 'built-in' }),
        expect.objectContaining({ name: 'name', source: 'built-in' }),
        expect.objectContaining({ name: 'session', source: 'built-in' }),
        expect.objectContaining({ name: 'clone', source: 'built-in' }),
        expect.objectContaining({ name: 'model', source: 'built-in' }),
        expect.objectContaining({ name: 'fix', source: 'prompt' }),
      ]),
    )
  })

  it('handles supported built-in slash commands over native Pi RPC calls', async () => {
    const directoryPath = makeTempRoot()
    const fakeProcess = createFakeRpcProcess()
    const service = createAssistantService({
      userDataPath: path.join(directoryPath, 'user-data'),
      spawn: vi.fn(() => fakeProcess),
      spawnSync: vi.fn(() => ({ status: 0, stdout: '0.78.0' })),
      env: { OPENASS_DISABLE_SHELL_ENV: '1' },
    })
    const session = await service.createSession({ directoryPath })

    const compact = await service.runSlashCommand(session.id, 'compact', 'notes')
    const renamed = await service.runSlashCommand(session.id, 'name', 'New name')
    const details = await service.runSlashCommand(session.id, 'session', '')
    const model = await service.runSlashCommand(session.id, 'model', 'google/gemini-test')
    const clone = await service.runSlashCommand(session.id, 'clone', '')

    expect(compact).toMatchObject({ handledBy: 'builtin', message: expect.stringContaining('notes') })
    expect(fakeProcess.writes.find((command) => command.type === 'compact')).toMatchObject({
      type: 'compact',
      customInstructions: 'notes',
    })
    expect(fakeProcess.writes.find((command) => command.type === 'set_session_name')).toMatchObject({
      type: 'set_session_name',
      name: 'New name',
    })
    expect(renamed.session).toMatchObject({ displayName: 'New name', title: 'New name' })
    expect(details).toMatchObject({ handledBy: 'builtin', message: expect.stringContaining('Messages: 1') })
    expect(fakeProcess.writes.find((command) => command.type === 'set_model')).toMatchObject({
      type: 'set_model',
      provider: 'google',
      modelId: 'gemini-test',
    })
    expect(model).toMatchObject({ handledBy: 'builtin', message: 'Model set to google/gemini-test.' })
    expect(fakeProcess.writes.find((command) => command.type === 'clone')).toMatchObject({ type: 'clone' })
    expect(clone).toMatchObject({ handledBy: 'builtin', session: expect.objectContaining({ id: session.id }) })
  })

  it('emits a synthetic select request for no-arg /model and resolves it locally', async () => {
    const directoryPath = makeTempRoot()
    const fakeProcess = createFakeRpcProcess()
    const service = createAssistantService({
      userDataPath: path.join(directoryPath, 'user-data'),
      spawn: vi.fn(() => fakeProcess),
      spawnSync: vi.fn(() => ({ status: 0, stdout: '0.78.0' })),
      env: { OPENASS_DISABLE_SHELL_ENV: '1' },
    })
    const session = await service.createSession({ directoryPath })
    const events = []
    const unsubscribe = service.onSessionEvent(session.id, (event) => events.push(event))

    const result = await service.runSlashCommand(session.id, 'model', '')
    const requestEvent = events.find((event) => event.type === 'extension_ui')
    const request = requestEvent?.request

    expect(result).toEqual({ handledBy: 'builtin' })
    expect(request).toMatchObject({
      type: 'select',
      title: 'Choose model',
      options: [expect.objectContaining({ label: 'google/gemini-test' })],
    })
    expect(fakeProcess.writes.find((command) => command.type === 'prompt' && command.message === '/model')).toBeUndefined()

    await service.respondToExtensionUi(session.id, { id: request.id, value: request.options[0].value })

    expect(fakeProcess.writes.find((command) => command.type === 'set_model')).toMatchObject({
      type: 'set_model',
      provider: 'google',
      modelId: 'gemini-test',
    })
    expect((await service.getSessionData(session.id)).model).toBe('google/gemini-test')

    unsubscribe()
  })

  it('forwards discovered Pi slash commands through prompt unchanged', async () => {
    const directoryPath = makeTempRoot()
    const fakeProcess = createFakeRpcProcess()
    const service = createAssistantService({
      userDataPath: path.join(directoryPath, 'user-data'),
      spawn: vi.fn(() => fakeProcess),
      spawnSync: vi.fn(() => ({ status: 0, stdout: '0.78.0' })),
      env: { OPENASS_DISABLE_SHELL_ENV: '1' },
    })
    const session = await service.createSession({ directoryPath })

    const result = await service.runSlashCommand(session.id, 'fix', 'test')

    expect(result).toEqual({ handledBy: 'pi' })
    expect(fakeProcess.writes.find((command) => command.type === 'prompt')).toMatchObject({
      type: 'prompt',
      message: '/fix test',
      streamingBehavior: 'followUp',
    })
  })

  it('does not send unavailable slash commands to the model as prompts', async () => {
    const directoryPath = makeTempRoot()
    const fakeProcess = createFakeRpcProcess()
    const service = createAssistantService({
      userDataPath: path.join(directoryPath, 'user-data'),
      spawn: vi.fn(() => fakeProcess),
      spawnSync: vi.fn(() => ({ status: 0, stdout: '0.78.0' })),
      env: { OPENASS_DISABLE_SHELL_ENV: '1' },
    })
    const session = await service.createSession({ directoryPath })

    const result = await service.runSlashCommand(session.id, 'missing', '')

    expect(result).toMatchObject({
      handledBy: 'builtin',
      message: expect.stringContaining('/missing is not available'),
    })
    expect(fakeProcess.writes.find((command) => command.type === 'prompt' && command.message === '/missing')).toBeUndefined()
  })

  it('forwards Pi extension UI responses that are not Open-Ass synthetic requests', async () => {
    const directoryPath = makeTempRoot()
    const fakeProcess = createFakeRpcProcess()
    const service = createAssistantService({
      userDataPath: path.join(directoryPath, 'user-data'),
      spawn: vi.fn(() => fakeProcess),
      spawnSync: vi.fn(() => ({ status: 0, stdout: '0.78.0' })),
      env: { OPENASS_DISABLE_SHELL_ENV: '1' },
    })
    const session = await service.createSession({ directoryPath })

    await service.respondToExtensionUi(session.id, { id: 'pi-request-1', value: 'answer' })

    expect(fakeProcess.writes.find((command) => command.type === 'extension_ui_response')).toMatchObject({
      type: 'extension_ui_response',
      id: 'pi-request-1',
      value: 'answer',
    })
  })

  it('maps Pi RPC events and messages into renderer events', () => {
    expect(
      normalizePiEvent('ses_test', {
        type: 'message_update',
        message: { id: 'msg_1', role: 'assistant', content: [] },
        assistantMessageEvent: { type: 'text_delta', delta: 'abc' },
      }),
    ).toEqual([
      {
        type: 'text_delta',
        sessionId: 'ses_test',
        messageId: 'msg_1',
        delta: 'abc',
      },
    ])

    expect(
      normalizeMessageRecord({
        id: 'msg_1',
        role: 'assistant',
        content: [{ type: 'text', text: 'hello' }],
      }),
    ).toMatchObject({ id: 'msg_1', role: 'assistant', content: 'hello' })
  })

  it('does not turn fire-and-forget extension UI status events into dialogs', () => {
    expect(
      normalizePiEvent('ses_test', {
        type: 'extension_ui_request',
        id: 'status_1',
        method: 'setStatus',
        statusKey: 'agent',
        statusText: 'Working',
      }),
    ).toEqual([
      {
        type: 'metadata',
        sessionId: 'ses_test',
        metadata: {
          extensionStatuses: {
            agent: 'Working',
          },
        },
      },
    ])
  })
})

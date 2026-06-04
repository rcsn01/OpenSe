import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { EventEmitter } from 'node:events'
import { afterEach, describe, expect, it, vi } from 'vitest'
import assistantModule from '../electron/assistant-service.cjs'

const {
  buildPiRuntimeEnv,
  createAssistantService,
  getRpcMessagesArray,
  normalizeMessageRecord,
  normalizePiEvent,
  normalizeQueueItem,
  normalizeTodoDetails,
  parseEnvOutput,
  resolvePiSessionDir,
  scanPiSessionsForProject,
  validateCommand,
  validateCreateSessionInput,
  validateSessionId,
  validateStartTerminalInput,
  validateTerminalId,
  validateTerminalWriteData,
} = assistantModule

let tempRoot

const makeTempRoot = () => {
  tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'open-ass-test-'))
  return tempRoot
}

const writePiSessionFile = (sessionRoot, cwd, name, entries = []) => {
  fs.mkdirSync(sessionRoot, { recursive: true })
  const filePath = path.join(sessionRoot, `${name}.jsonl`)
  fs.writeFileSync(
    filePath,
    [
      JSON.stringify({ type: 'session', version: 3, id: name, timestamp: '2026-01-01T00:00:00.000Z', cwd }),
      ...entries.map((entry) => JSON.stringify(entry)),
    ].join('\n'),
  )
  return filePath
}

const createFakeRpcProcess = (options = {}) => {
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
          return options.messages ?? [{ id: 'msg_loaded', role: 'user', content: [{ type: 'text', text: 'loaded' }] }]
        }
        if (command.type === 'get_commands') return { commands: options.commands ?? [{ name: 'fix', source: 'prompt' }] }
        if (command.type === 'get_available_models') return { models: [{ provider: 'google', id: 'gemini-test' }] }
        if (command.type === 'get_session_stats') return { totalMessages: 1 }
        if (command.type === 'new_session') return { cancelled: false }
        if (command.type === 'export_html') return { path: command.outputPath ?? '/tmp/pi-session.html' }
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

const createFakePtyProcess = () => {
  const child = new EventEmitter()
  child.writes = []
  child.resizes = []
  child.killed = false
  child.write = (data) => {
    child.writes.push(data)
  }
  child.resize = (cols, rows) => {
    child.resizes.push([cols, rows])
  }
  child.kill = () => {
    child.killed = true
    child.emit('exit', 0, 'SIGTERM')
  }
  child.emitData = (data) => {
    child.emit('data', data)
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
    expect(validateTerminalId('term_test')).toBe('term_test')
    expect(() => validateTerminalId('ses_test')).toThrow(/terminal id/)
    expect(validateTerminalWriteData('hello')).toBe('hello')
    expect(() => validateTerminalWriteData('x'.repeat(100_001))).toThrow(/too large/)

    const directoryPath = makeTempRoot()
    expect(validateCreateSessionInput({ directoryPath })).toEqual({ directoryPath })
    expect(() => validateCreateSessionInput({ directoryPath: '/does/not/exist' })).toThrow(/does not exist/)
    expect(validateStartTerminalInput({ directoryPath })).toEqual({ directoryPath })
    expect(() => validateStartTerminalInput({ directoryPath: '/does/not/exist' })).toThrow(/does not exist/)
  })

  it('starts native Pi TUI terminals with node-pty and reuses one process per directory', async () => {
    const directoryPath = makeTempRoot()
    const fakePty = createFakePtyProcess()
    const ptySpawn = vi.fn(() => fakePty)
    const service = createAssistantService({
      userDataPath: path.join(directoryPath, 'user-data'),
      ptySpawn,
      spawnSync: vi.fn(() => ({ status: 0, stdout: '0.78.0' })),
      env: { OPENASS_DISABLE_SHELL_ENV: '1' },
    })

    const first = await service.startTerminal({ directoryPath })
    const second = await service.startTerminal({ directoryPath })

    expect(first).toMatchObject({ id: expect.stringMatching(/^term_/), directoryPath, status: 'running' })
    expect(second.id).toBe(first.id)
    expect(ptySpawn).toHaveBeenCalledTimes(1)
    expect(ptySpawn).toHaveBeenCalledWith(
      'pi',
      [],
      expect.objectContaining({
        cwd: directoryPath,
        cols: 80,
        rows: 24,
        name: 'xterm-256color',
        env: expect.objectContaining({ TERM: 'xterm-256color', OPENCODE_CLIENT: 'desktop' }),
      }),
    )
  })

  it('prompts for a terminal directory when none is provided and returns null on cancel', async () => {
    const directoryPath = makeTempRoot()
    const ptySpawn = vi.fn(() => createFakePtyProcess())
    const service = createAssistantService({
      userDataPath: path.join(directoryPath, 'user-data'),
      ptySpawn,
      chooseDirectory: vi.fn(async () => directoryPath),
      spawnSync: vi.fn(() => ({ status: 0, stdout: '0.78.0' })),
      env: { OPENASS_DISABLE_SHELL_ENV: '1' },
    })

    const session = await service.startTerminal()

    expect(session).toMatchObject({ directoryPath, status: 'running' })
    expect(ptySpawn).toHaveBeenCalledTimes(1)

    const cancelled = createAssistantService({
      userDataPath: path.join(directoryPath, 'cancelled-user-data'),
      ptySpawn,
      chooseDirectory: vi.fn(async () => null),
      spawnSync: vi.fn(() => ({ status: 0, stdout: '0.78.0' })),
      env: { OPENASS_DISABLE_SHELL_ENV: '1' },
    })
    await expect(cancelled.startTerminal()).resolves.toBeNull()
  })

  it('emits terminal data, replays recent output, writes input, resizes, and reports exit', async () => {
    const directoryPath = makeTempRoot()
    const fakePty = createFakePtyProcess()
    const service = createAssistantService({
      userDataPath: path.join(directoryPath, 'user-data'),
      ptySpawn: vi.fn(() => fakePty),
      spawnSync: vi.fn(() => ({ status: 0, stdout: '0.78.0' })),
      env: { OPENASS_DISABLE_SHELL_ENV: '1' },
    })
    const terminal = await service.startTerminal({ directoryPath })
    const events = []
    const unsubscribe = service.onTerminalEvent(terminal.id, (event) => events.push(event))

    fakePty.emitData('hello')
    await service.writeTerminal(terminal.id, 'input')
    await service.resizeTerminal(terminal.id, 120, 40)
    const reattached = await service.startTerminal({ directoryPath })
    fakePty.emit('exit', 7, 'SIGTERM')

    expect(events).toContainEqual({ type: 'data', id: terminal.id, data: 'hello' })
    expect(fakePty.writes).toEqual(['input'])
    expect(fakePty.resizes).toEqual([[120, 40]])
    expect(reattached.initialData).toBe('hello')
    expect(events).toContainEqual({
      type: 'status',
      id: terminal.id,
      status: 'exited',
      exitCode: 7,
      signal: 'SIGTERM',
    })
    unsubscribe()
  })

  it('stops RPC and terminal processes on dispose', async () => {
    const directoryPath = makeTempRoot()
    const fakeRpc = createFakeRpcProcess()
    const fakePty = createFakePtyProcess()
    const service = createAssistantService({
      userDataPath: path.join(directoryPath, 'user-data'),
      spawn: vi.fn(() => fakeRpc),
      ptySpawn: vi.fn(() => fakePty),
      spawnSync: vi.fn(() => ({ status: 0, stdout: '0.78.0' })),
      env: { OPENASS_DISABLE_SHELL_ENV: '1' },
    })

    await service.createSession({ directoryPath })
    await service.startTerminal({ directoryPath })
    service.dispose()

    expect(fakeRpc.signalCode).toBe('SIGTERM')
    expect(fakePty.killed).toBe(true)
  })

  it('normalizes documented Pi get_messages response shapes', () => {
    const messages = [{ id: 'msg1', role: 'user', content: 'hello' }]

    expect(getRpcMessagesArray(messages)).toEqual(messages)
    expect(getRpcMessagesArray({ messages })).toEqual(messages)
    expect(getRpcMessagesArray({ other: messages })).toEqual([])
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

  it('persists the opened project and starts new Pi sessions in native RPC mode', async () => {
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
      expect.arrayContaining(['--mode', 'rpc']),
      expect.objectContaining({ cwd: directoryPath, env: expect.objectContaining({ OPENCODE_CLIENT: 'desktop' }) }),
    )
    expect(spawn.mock.calls[0][1]).not.toContain('--session-dir')
    expect(spawn.mock.calls[0][1]).not.toContain('--session-id')
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
    expect(args).not.toContain('--session-id')
  })

  it('scans Pi JSONL sessions for only the requested project and sorts by latest activity', () => {
    const directoryPath = makeTempRoot()
    const otherDirectoryPath = fs.mkdtempSync(path.join(os.tmpdir(), 'open-ass-other-'))
    const sessionRoot = path.join(directoryPath, 'pi-native-sessions')

    const older = writePiSessionFile(sessionRoot, directoryPath, '019-old', [
      { type: 'session_info', id: 'info1', parentId: null, timestamp: '2026-01-01T00:00:01.000Z', name: 'Older name' },
      {
        type: 'message',
        id: 'msg1',
        parentId: 'info1',
        timestamp: '2026-01-01T00:00:02.000Z',
        message: { role: 'user', content: [{ type: 'text', text: 'first older message' }], timestamp: Date.parse('2026-01-01T00:00:02.000Z') },
      },
    ])
    const newer = writePiSessionFile(sessionRoot, directoryPath, '019-new', [
      { type: 'session_info', id: 'info2', parentId: null, timestamp: '2026-01-01T00:00:01.000Z', name: 'First name' },
      { type: 'session_info', id: 'info3', parentId: 'info2', timestamp: '2026-01-01T00:00:03.000Z', name: 'Latest name' },
      {
        type: 'message',
        id: 'msg2',
        parentId: 'info3',
        timestamp: '2026-01-01T00:00:04.000Z',
        message: { role: 'user', content: [{ type: 'text', text: 'first newer message' }], timestamp: Date.parse('2026-01-01T00:00:04.000Z') },
      },
      {
        type: 'message',
        id: 'msg3',
        parentId: 'msg2',
        timestamp: '2026-01-01T00:00:05.000Z',
        message: { role: 'assistant', content: [{ type: 'text', text: 'assistant reply' }], timestamp: Date.parse('2026-01-01T00:00:05.000Z') },
      },
    ])
    writePiSessionFile(sessionRoot, otherDirectoryPath, '019-other', [
      {
        type: 'message',
        id: 'msg4',
        parentId: null,
        timestamp: '2026-01-01T00:00:06.000Z',
        message: { role: 'user', content: 'other project' },
      },
    ])

    const sessions = scanPiSessionsForProject(directoryPath, { PI_CODING_AGENT_SESSION_DIR: sessionRoot })

    expect(resolvePiSessionDir(directoryPath, { PI_CODING_AGENT_SESSION_DIR: sessionRoot })).toBe(sessionRoot)
    expect(sessions.map((session) => session.piSessionFile)).toEqual([newer, older])
    expect(sessions[0]).toMatchObject({
      piSessionId: '019-new',
      displayName: 'Latest name',
      firstMessage: 'first newer message',
      messageCount: 2,
    })

    fs.rmSync(otherDirectoryPath, { recursive: true, force: true })
  })

  it('opens scanned Pi sessions with --session and resolves /resume prefixes in the current project', async () => {
    const directoryPath = makeTempRoot()
    const sessionRoot = path.join(directoryPath, 'pi-native-sessions')
    const firstFile = writePiSessionFile(sessionRoot, directoryPath, '019-first-session', [
      {
        type: 'message',
        id: 'msg1',
        parentId: null,
        timestamp: '2026-01-01T00:00:02.000Z',
        message: { role: 'user', content: 'first session', timestamp: Date.parse('2026-01-01T00:00:02.000Z') },
      },
    ])
    const secondFile = writePiSessionFile(sessionRoot, directoryPath, '019-second-session', [
      {
        type: 'message',
        id: 'msg2',
        parentId: null,
        timestamp: '2026-01-01T00:00:03.000Z',
        message: { role: 'user', content: 'second session', timestamp: Date.parse('2026-01-01T00:00:03.000Z') },
      },
    ])
    const userDataPath = path.join(directoryPath, 'user-data')
    fs.mkdirSync(path.join(userDataPath, 'open-ass'), { recursive: true })
    fs.writeFileSync(
      path.join(userDataPath, 'open-ass', 'sessions.json'),
      JSON.stringify([{ directoryPath, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }]),
    )

    const processes = [
      createFakeRpcProcess(),
      createFakeRpcProcess({
        messages: {
          messages: [
            { id: 'msg_resumed_user', role: 'user', content: 'resumed user' },
            { id: 'msg_resumed_assistant', role: 'assistant', content: 'resumed assistant' },
          ],
        },
      }),
    ]
    const spawn = vi.fn(() => processes.shift() ?? createFakeRpcProcess())
    const service = createAssistantService({
      userDataPath,
      spawn,
      spawnSync: vi.fn(() => ({ status: 0, stdout: '0.78.0' })),
      env: { OPENASS_DISABLE_SHELL_ENV: '1', PI_CODING_AGENT_SESSION_DIR: sessionRoot },
    })

    const sessions = await service.listSessions()
    const first = sessions.find((session) => session.piSessionId === '019-first-session')
    const second = sessions.find((session) => session.piSessionId === '019-second-session')
    const events = []
    const unsubscribe = service.onSessionEvent(second.id, (event) => events.push(event))

    await service.openSession(first.id)
    const resumed = await service.runSlashCommand(first.id, 'resume', '019-second')

    expect(spawn.mock.calls[0][1]).toEqual(expect.arrayContaining(['--session', firstFile]))
    expect(spawn.mock.calls[1][1]).toEqual(expect.arrayContaining(['--session', secondFile]))
    expect(resumed).toMatchObject({ handledBy: 'builtin', session: expect.objectContaining({ id: second.id }) })
    expect(events.some((event) =>
      event.type === 'transcript_snapshot' &&
      event.items.some((item) => item.info.content === 'resumed assistant'),
    )).toBe(true)
    unsubscribe()
  })

  it('emits normalized transcript messages from get_messages objects', async () => {
    const directoryPath = makeTempRoot()
    const fakeProcess = createFakeRpcProcess({
      messages: {
        messages: [
          { id: 'msg_user', role: 'user', content: [{ type: 'text', text: 'object user' }] },
          {
            id: 'msg_assistant',
            role: 'assistant',
            content: [
              { type: 'text', text: 'object assistant' },
              { type: 'toolCall', id: 'tool-1', name: 'todo', arguments: { todos: [{ text: 'Keep structure' }] } },
            ],
          },
          {
            id: 'tool-1-result',
            role: 'toolResult',
            toolCallId: 'tool-1',
            toolName: 'todo',
            content: [{ type: 'text', text: 'updated' }],
            details: { todos: [{ id: '1', text: 'Keep structure', status: 'pending' }] },
          },
        ],
      },
    })
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

    expect(events).toContainEqual(expect.objectContaining({
      type: 'transcript_snapshot',
      items: [
        expect.objectContaining({
          info: expect.objectContaining({
            role: 'user',
            content: 'object user',
            raw: expect.objectContaining({ id: 'msg_user' }),
          }),
          parts: [expect.objectContaining({ type: 'text', text: 'object user' })],
        }),
        expect.objectContaining({
          info: expect.objectContaining({
            role: 'assistant',
            content: 'object assistant',
          }),
          parts: [
            expect.objectContaining({ id: expect.any(String), messageId: 'msg_assistant', type: 'text', text: 'object assistant' }),
            expect.objectContaining({ id: 'tool-1', messageId: 'msg_assistant', type: 'toolCall', name: 'todo' }),
          ],
        }),
        expect.objectContaining({
          info: expect.objectContaining({
            role: 'toolResult',
            toolCallId: 'tool-1',
            toolName: 'todo',
            content: 'updated',
            details: { todos: [{ id: '1', text: 'Keep structure', status: 'pending' }] },
          }),
        }),
      ],
    }))
    const loaded = events.find((event) => event.type === 'transcript_snapshot')
    expect(loaded.items[1].info.content).not.toContain('todo')
    unsubscribe()
  })

  it('normalizes persisted JSONL message entries from opened sessions', async () => {
    const userEntry = {
      type: 'message',
      id: 'jsonl-user',
      parentId: 'model-change',
      timestamp: '2026-06-01T04:26:33.522Z',
      message: {
        role: 'user',
        content: [{ type: 'text', text: 'old prompt' }],
        timestamp: 1780287993522,
      },
    }
    const assistantEntry = {
      type: 'message',
      id: 'jsonl-assistant',
      parentId: 'jsonl-user',
      timestamp: '2026-06-01T04:26:33.523Z',
      message: {
        role: 'assistant',
        content: [{ type: 'text', text: 'old answer' }],
        stopReason: 'stop',
        timestamp: 1780287993523,
      },
    }

    expect(normalizeMessageRecord(userEntry)).toMatchObject({
      id: 'jsonl-user',
      role: 'user',
      parentMessageId: 'model-change',
      content: 'old prompt',
      parts: [expect.objectContaining({ id: expect.any(String), messageId: 'jsonl-user', type: 'text', text: 'old prompt' })],
    })
    expect(normalizeMessageRecord(assistantEntry)).toMatchObject({
      id: 'jsonl-assistant',
      role: 'assistant',
      parentMessageId: 'jsonl-user',
      content: 'old answer',
      parts: [expect.objectContaining({ id: expect.any(String), messageId: 'jsonl-assistant', type: 'text', text: 'old answer' })],
    })
  })

  it('emits direct opencode transcript item arrays returned by get_messages', async () => {
    const directoryPath = makeTempRoot()
    const fakeProcess = createFakeRpcProcess({
      messages: [
        {
          info: {
            id: 'msg_old_user',
            role: 'user',
            parentID: 'root',
            time: { created: 1780287993522 },
          },
          parts: [{ id: 'prt_old_user', type: 'text', text: 'direct old prompt' }],
        },
        {
          info: {
            id: 'msg_old_assistant',
            role: 'assistant',
            parentID: 'msg_old_user',
            time: { created: 1780287993523 },
          },
          parts: [{ id: 'prt_old_assistant', type: 'text', text: 'direct old answer' }],
        },
      ],
    })
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

    const snapshot = events.find((event) => event.type === 'transcript_snapshot')
    expect(snapshot?.items).toEqual([
      expect.objectContaining({
        info: expect.objectContaining({
          id: 'msg_old_user',
          role: 'user',
          parentMessageId: 'root',
          content: 'direct old prompt',
          createdAt: '2026-06-01T04:26:33.522Z',
        }),
        parts: [expect.objectContaining({ id: 'prt_old_user', messageId: 'msg_old_user', type: 'text', text: 'direct old prompt' })],
      }),
      expect.objectContaining({
        info: expect.objectContaining({
          id: 'msg_old_assistant',
          role: 'assistant',
          parentMessageId: 'msg_old_user',
          content: 'direct old answer',
          createdAt: '2026-06-01T04:26:33.523Z',
        }),
        parts: [expect.objectContaining({ id: 'prt_old_assistant', messageId: 'msg_old_assistant', type: 'text', text: 'direct old answer' })],
      }),
    ])
    unsubscribe()
  })

  it('falls back to persisted JSONL history when opened session get_messages is empty', async () => {
    const directoryPath = makeTempRoot()
    const sessionRoot = path.join(directoryPath, 'pi-native-sessions')
    const sessionFile = writePiSessionFile(sessionRoot, directoryPath, '019-fallback-session', [
      {
        type: 'message',
        id: 'jsonl-fallback-user',
        parentId: null,
        timestamp: '2026-06-01T04:26:33.522Z',
        message: { role: 'user', content: [{ type: 'text', text: 'fallback old prompt' }] },
      },
      {
        type: 'message',
        id: 'jsonl-fallback-assistant',
        parentId: 'jsonl-fallback-user',
        timestamp: '2026-06-01T04:26:33.523Z',
        message: { role: 'assistant', content: [{ type: 'text', text: 'fallback old answer' }] },
      },
    ])
    const userDataPath = path.join(directoryPath, 'user-data')
    fs.mkdirSync(path.join(userDataPath, 'open-ass'), { recursive: true })
    fs.writeFileSync(
      path.join(userDataPath, 'open-ass', 'sessions.json'),
      JSON.stringify([{ directoryPath, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }]),
    )
    const fakeProcess = createFakeRpcProcess({ messages: [] })
    const service = createAssistantService({
      userDataPath,
      spawn: vi.fn(() => fakeProcess),
      spawnSync: vi.fn(() => ({ status: 0, stdout: '0.78.0' })),
      env: { OPENASS_DISABLE_SHELL_ENV: '1', PI_CODING_AGENT_SESSION_DIR: sessionRoot },
    })
    const [session] = await service.listSessions()
    const events = []
    const unsubscribe = service.onSessionEvent(session.id, (event) => events.push(event))

    await service.openSession(session.id)

    expect(session.piSessionFile).toBe(sessionFile)
    const snapshot = events.filter((event) => event.type === 'transcript_snapshot').at(-1)
    expect(snapshot?.items).toEqual([
      expect.objectContaining({
        info: expect.objectContaining({ id: 'jsonl-fallback-user', content: 'fallback old prompt' }),
      }),
      expect.objectContaining({
        info: expect.objectContaining({
          id: 'jsonl-fallback-assistant',
          parentMessageId: 'jsonl-fallback-user',
          content: 'fallback old answer',
        }),
      }),
    ])
    unsubscribe()
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

    expect(events.some((event) => event.type === 'transcript_snapshot' && event.items[0]?.info.content === 'loaded')).toBe(true)
    expect(fakeProcess.writes.find((command) => command.type === 'prompt')).toMatchObject({
      type: 'prompt',
      message: 'status',
      streamingBehavior: 'followUp',
      messageID: expect.stringMatching(/^msg_/),
      textPartID: expect.stringMatching(/^prt_/),
      parts: [expect.objectContaining({ id: expect.stringMatching(/^prt_/), type: 'text', text: 'status' })],
    })
    expect(events.some((event) =>
      event.type === 'transcript_part_delta' &&
      event.messageId === 'msg_assistant' &&
      event.delta === 'hello',
    )).toBe(true)

    unsubscribe()
  })

  it('refreshes canonical history from get_messages after agent_end', async () => {
    const directoryPath = makeTempRoot()
    const options = {
      messages: [{ id: 'msg_initial', role: 'user', content: 'initial' }],
    }
    const fakeProcess = createFakeRpcProcess(options)
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
    options.messages = [{ id: 'msg_after', role: 'assistant', content: 'after refresh' }]
    fakeProcess.stdout.emit('data', `${JSON.stringify({ type: 'agent_end' })}\n`)
    await new Promise((resolve) => setImmediate(resolve))
    await new Promise((resolve) => setImmediate(resolve))

    const snapshots = events.filter((event) => event.type === 'transcript_snapshot')
    expect(snapshots.at(-1)?.items).toEqual([
      expect.objectContaining({
        info: expect.objectContaining({ id: 'msg_after', content: 'after refresh' }),
      }),
    ])

    unsubscribe()
  })

  it('loads paged transcript history with before and limit when supported', async () => {
    const directoryPath = makeTempRoot()
    const fakeProcess = createFakeRpcProcess({
      messages: {
        items: [{ id: 'msg_old', role: 'user', content: 'older' }],
        cursor: 'cursor_previous',
        complete: false,
      },
    })
    const service = createAssistantService({
      userDataPath: path.join(directoryPath, 'user-data'),
      spawn: vi.fn(() => fakeProcess),
      spawnSync: vi.fn(() => ({ status: 0, stdout: '0.78.0' })),
      env: { OPENASS_DISABLE_SHELL_ENV: '1' },
    })
    const session = await service.createSession({ directoryPath })
    const events = []
    const unsubscribe = service.onSessionEvent(session.id, (event) => events.push(event))

    const page = await service.loadTranscriptPage(session.id, { before: 'cursor_latest', limit: 25 })

    expect(fakeProcess.writes.filter((command) => command.type === 'get_messages').at(-1)).toMatchObject({
      type: 'get_messages',
      before: 'cursor_latest',
      limit: 25,
    })
    expect(page).toMatchObject({
      cursor: 'cursor_previous',
      complete: false,
      mode: 'prepend',
      items: [expect.objectContaining({ info: expect.objectContaining({ id: 'msg_old', content: 'older' }) })],
    })
    expect(events.at(-1)).toMatchObject({
      type: 'transcript_snapshot',
      cursor: 'cursor_previous',
      complete: false,
      mode: 'prepend',
    })

    unsubscribe()
  })

  it('allows active-turn steering prompts without changing follow-up defaults', async () => {
    const directoryPath = makeTempRoot()
    const fakeProcess = createFakeRpcProcess()
    const service = createAssistantService({
      userDataPath: path.join(directoryPath, 'user-data'),
      spawn: vi.fn(() => fakeProcess),
      spawnSync: vi.fn(() => ({ status: 0, stdout: '0.78.0' })),
      env: { OPENASS_DISABLE_SHELL_ENV: '1' },
    })
    const session = await service.createSession({ directoryPath })

    await service.sendCommand(session.id, 'steer now', 'steer')
    await service.sendCommand(session.id, 'queue later')

    expect(fakeProcess.writes.filter((command) => command.type === 'prompt')).toEqual([
      expect.objectContaining({ message: 'steer now', streamingBehavior: 'steer' }),
      expect.objectContaining({ message: 'queue later', streamingBehavior: 'followUp' }),
    ])
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

  it('lists Pi TUI built-ins, Open-Ass commands, and Pi RPC commands in TUI order', async () => {
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

    expect(capabilities.commands.slice(0, 21).map((command) => command.name)).toEqual([
      'settings',
      'model',
      'scoped-models',
      'export',
      'import',
      'share',
      'copy',
      'name',
      'session',
      'changelog',
      'hotkeys',
      'fork',
      'clone',
      'tree',
      'login',
      'logout',
      'new',
      'compact',
      'resume',
      'reload',
      'quit',
    ])
    expect(capabilities.commands).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'compact', source: 'builtin' }),
        expect.objectContaining({ name: 'name', source: 'builtin' }),
        expect.objectContaining({ name: 'session', source: 'builtin' }),
        expect.objectContaining({ name: 'clone', source: 'builtin' }),
        expect.objectContaining({ name: 'model', source: 'builtin' }),
        expect.objectContaining({ name: 'resume', source: 'builtin' }),
        expect.objectContaining({ name: 'reload', source: 'builtin' }),
        expect.objectContaining({ name: 'todos', source: 'open-ass' }),
        expect.objectContaining({ name: 'fix', source: 'prompt' }),
      ]),
    )
  })

  it('keeps RPC command sources and lets built-ins override conflicting RPC names', async () => {
    const directoryPath = makeTempRoot()
    const fakeProcess = createFakeRpcProcess({
      commands: [
        { name: 'model', source: 'prompt', description: 'Conflicting prompt template.' },
        { name: 'skill:review', source: 'skill', description: 'Run review skill.' },
        { name: 'ship', source: 'extension', description: 'Run release extension.' },
      ],
    })
    const service = createAssistantService({
      userDataPath: path.join(directoryPath, 'user-data'),
      spawn: vi.fn(() => fakeProcess),
      spawnSync: vi.fn(() => ({ status: 0, stdout: '0.78.0' })),
      env: { OPENASS_DISABLE_SHELL_ENV: '1' },
    })
    const session = await service.createSession({ directoryPath })

    const capabilities = await service.listCapabilities(session.id)

    expect(capabilities.commands.filter((command) => command.name === 'model')).toEqual([
      expect.objectContaining({ name: 'model', source: 'builtin', description: 'Select model (opens selector UI)' }),
    ])
    expect(capabilities.commands).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'skill:review', source: 'skill' }),
        expect.objectContaining({ name: 'ship', source: 'extension' }),
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
    const started = await service.runSlashCommand(session.id, 'new', '')
    const exported = await service.runSlashCommand(session.id, 'export', '/tmp/export.html')

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
    expect(fakeProcess.writes.find((command) => command.type === 'new_session')).toMatchObject({ type: 'new_session' })
    expect(started).toMatchObject({ handledBy: 'builtin', message: 'Started new session.' })
    expect(fakeProcess.writes.find((command) => command.type === 'export_html')).toMatchObject({
      type: 'export_html',
      outputPath: '/tmp/export.html',
    })
    expect(exported).toMatchObject({ handledBy: 'builtin', message: 'Exported session to /tmp/export.html.' })
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

    expect(result).toMatchObject({
      handledBy: 'builtin',
      uiRequest: expect.objectContaining({
        type: 'select',
        title: 'Choose model',
      }),
    })
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

  it('emits a synthetic option-list request for no-arg /features and writes selected flags locally', async () => {
    const directoryPath = makeTempRoot()
    const fakeProcess = createFakeRpcProcess({ commands: [{ name: 'features', source: 'extension' }] })
    const service = createAssistantService({
      userDataPath: path.join(directoryPath, 'user-data'),
      spawn: vi.fn(() => fakeProcess),
      spawnSync: vi.fn(() => ({ status: 0, stdout: '0.78.0' })),
      env: { OPENASS_DISABLE_SHELL_ENV: '1' },
    })
    const session = await service.createSession({ directoryPath })
    const events = []
    const unsubscribe = service.onSessionEvent(session.id, (event) => events.push(event))

    const result = await service.runSlashCommand(session.id, 'features', '')
    const requestEvent = events.find((event) => event.type === 'extension_ui')
    const request = requestEvent?.request

    expect(result).toMatchObject({
      handledBy: 'builtin',
      uiRequest: expect.objectContaining({
        type: 'option-list',
        title: 'Feature Flags',
        selectionMode: 'multiple',
      }),
    })
    expect(request.options).toContainEqual(expect.objectContaining({ value: 'subagents', checked: true }))
    expect(fakeProcess.writes.find((command) => command.type === 'prompt' && command.message === '/features')).toBeUndefined()

    await service.respondToExtensionUi(session.id, { id: request.id, values: ['memories', 'websearch'] })

    const saved = JSON.parse(fs.readFileSync(path.join(directoryPath, '.pi', 'features.json'), 'utf8'))
    expect(saved.flags).toMatchObject({
      subagents: false,
      memories: true,
      websearch: true,
    })

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

    const result = await service.runSlashCommand(session.id, 'fix', 'test', {
      messageID: 'msg_custom',
      textPartID: 'prt_custom',
    })

    expect(result).toEqual({ handledBy: 'pi' })
    expect(fakeProcess.writes.find((command) => command.type === 'prompt')).toMatchObject({
      type: 'prompt',
      message: '/fix test',
      streamingBehavior: 'followUp',
      messageID: 'msg_custom',
      textPartID: 'prt_custom',
      parts: [expect.objectContaining({ id: 'prt_custom', text: '/fix test' })],
    })
  })

  it('forwards discovered extension and skill slash commands unchanged', async () => {
    const directoryPath = makeTempRoot()
    const fakeProcess = createFakeRpcProcess({
      commands: [
        { name: 'ship', source: 'extension' },
        { name: 'skill:review', source: 'skill' },
      ],
    })
    const service = createAssistantService({
      userDataPath: path.join(directoryPath, 'user-data'),
      spawn: vi.fn(() => fakeProcess),
      spawnSync: vi.fn(() => ({ status: 0, stdout: '0.78.0' })),
      env: { OPENASS_DISABLE_SHELL_ENV: '1' },
    })
    const session = await service.createSession({ directoryPath })

    const extensionResult = await service.runSlashCommand(session.id, 'ship', 'now')
    const skillResult = await service.runSlashCommand(session.id, 'skill:review', 'diff')

    expect(extensionResult).toEqual({ handledBy: 'pi' })
    expect(skillResult).toEqual({ handledBy: 'pi' })
    expect(fakeProcess.writes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: 'prompt', message: '/ship now', streamingBehavior: 'followUp' }),
        expect.objectContaining({ type: 'prompt', message: '/skill:review diff', streamingBehavior: 'followUp' }),
      ]),
    )
  })

  it('handles /resume locally instead of forwarding it', async () => {
    const directoryPath = makeTempRoot()
    const fakeProcess = createFakeRpcProcess()
    const service = createAssistantService({
      userDataPath: path.join(directoryPath, 'user-data'),
      spawn: vi.fn(() => fakeProcess),
      spawnSync: vi.fn(() => ({ status: 0, stdout: '0.78.0' })),
      env: { OPENASS_DISABLE_SHELL_ENV: '1' },
    })
    const session = await service.createSession({ directoryPath })

    const result = await service.runSlashCommand(session.id, 'resume', '')

    expect(result).toMatchObject({ handledBy: 'builtin', message: expect.stringContaining('No other Pi sessions') })
    expect(fakeProcess.writes.find((command) => command.type === 'prompt' && command.message === '/resume')).toBeUndefined()
  })

  it('does not forward Pi built-ins as prompts', async () => {
    const directoryPath = makeTempRoot()
    const fakeProcess = createFakeRpcProcess()
    const service = createAssistantService({
      userDataPath: path.join(directoryPath, 'user-data'),
      spawn: vi.fn(() => fakeProcess),
      spawnSync: vi.fn(() => ({ status: 0, stdout: '0.78.0' })),
      env: { OPENASS_DISABLE_SHELL_ENV: '1' },
      clipboard: { writeText: vi.fn() },
    })
    const session = await service.createSession({ directoryPath })

    for (const command of [
      'settings',
      'model',
      'scoped-models',
      'export',
      'import',
      'share',
      'copy',
      'name',
      'session',
      'changelog',
      'hotkeys',
      'fork',
      'tree',
      'login',
      'logout',
      'resume',
      'quit',
    ]) {
      await service.runSlashCommand(session.id, command, '')
    }

    expect(fakeProcess.writes.filter((command) => command.type === 'prompt')).toEqual([])
  })

  it('copies the last assistant text and reloads the current Pi RPC process', async () => {
    const directoryPath = makeTempRoot()
    const clipboard = { writeText: vi.fn() }
    const processes = [
      createFakeRpcProcess({ messages: [{ id: 'assistant-1', role: 'assistant', content: 'copy me' }] }),
      createFakeRpcProcess(),
    ]
    const spawn = vi.fn(() => processes.shift())
    const service = createAssistantService({
      userDataPath: path.join(directoryPath, 'user-data'),
      spawn,
      spawnSync: vi.fn(() => ({ status: 0, stdout: '0.78.0' })),
      env: { OPENASS_DISABLE_SHELL_ENV: '1' },
      clipboard,
    })
    const session = await service.createSession({ directoryPath })

    const copied = await service.runSlashCommand(session.id, 'copy', '')
    const reloaded = await service.runSlashCommand(session.id, 'reload', '')

    expect(copied).toMatchObject({ handledBy: 'builtin', message: expect.stringContaining('Copied') })
    expect(clipboard.writeText).toHaveBeenCalledWith('copy me')
    expect(spawn).toHaveBeenCalledTimes(2)
    expect(reloaded).toMatchObject({ handledBy: 'builtin', message: expect.stringContaining('Reloaded') })
  })

  it('resolves /resume and /quit built-in UI responses locally', async () => {
    const directoryPath = makeTempRoot()
    const processes = [createFakeRpcProcess(), createFakeRpcProcess()]
    const service = createAssistantService({
      userDataPath: path.join(directoryPath, 'user-data'),
      spawn: vi.fn(() => processes.shift() ?? createFakeRpcProcess()),
      spawnSync: vi.fn(() => ({ status: 0, stdout: '0.78.0' })),
      env: { OPENASS_DISABLE_SHELL_ENV: '1' },
    })
    const first = await service.createSession({ directoryPath })
    const second = await service.createSession({ directoryPath })

    const resume = await service.runSlashCommand(first.id, 'resume', '')
    const resumed = await service.respondToExtensionUi(first.id, {
      id: resume.uiRequest.id,
      value: second.id,
    })
    const quit = await service.runSlashCommand(second.id, 'quit', '')
    const closed = await service.respondToExtensionUi(second.id, {
      id: quit.uiRequest.id,
      confirmed: true,
    })

    expect(resume.uiRequest).toMatchObject({ type: 'select', title: 'Resume session' })
    expect(resumed).toMatchObject({ handledBy: 'builtin', session: expect.objectContaining({ id: second.id }) })
    expect(quit.uiRequest).toMatchObject({ type: 'confirm', title: 'Close Pi session' })
    expect(closed).toMatchObject({ handledBy: 'builtin', message: expect.stringContaining('Closed') })
    expect((await service.getSessionData(second.id)).status).toBe('closed')
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

  it('handles /todos as a native Open-Ass command', async () => {
    const directoryPath = makeTempRoot()
    const fakeProcess = createFakeRpcProcess()
    const service = createAssistantService({
      userDataPath: path.join(directoryPath, 'user-data'),
      spawn: vi.fn(() => fakeProcess),
      spawnSync: vi.fn(() => ({ status: 0, stdout: '0.78.0' })),
      env: { OPENASS_DISABLE_SHELL_ENV: '1' },
    })
    const session = await service.createSession({ directoryPath })

    const result = await service.runSlashCommand(session.id, 'todos', '')

    expect(result).toMatchObject({
      handledBy: 'builtin',
      message: expect.stringContaining('native Open-Ass'),
    })
    expect(fakeProcess.writes.find((command) => command.type === 'prompt' && command.message === '/todos')).toBeUndefined()

    await service.executeTuiCommand(session.id, '/todos')
    expect(fakeProcess.writes.find((command) => command.type === 'prompt' && command.message === '/todos')).toBeUndefined()
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

    await service.respondToExtensionUi(session.id, { id: 'pi-request-2', values: ['one', 'two'] })

    expect(fakeProcess.writes.find((command) => command.id === 'pi-request-2')).toMatchObject({
      type: 'extension_ui_response',
      id: 'pi-request-2',
      values: ['one', 'two'],
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
        type: 'transcript_message_upsert',
        sessionId: 'ses_test',
        info: expect.objectContaining({ id: 'msg_1', role: 'assistant' }),
      },
      {
        type: 'transcript_part_upsert',
        sessionId: 'ses_test',
        part: expect.objectContaining({
          id: 'msg_1:text',
          messageId: 'msg_1',
          type: 'text',
          text: '',
        }),
      },
      {
        type: 'transcript_part_delta',
        sessionId: 'ses_test',
        messageId: 'msg_1',
        partId: 'msg_1:text',
        partType: 'text',
        delta: 'abc',
        raw: expect.objectContaining({ type: 'text_delta' }),
      },
    ])

    expect(
      normalizePiEvent('ses_test', {
        type: 'message_update',
        assistantMessageEvent: { type: 'text_delta', delta: 'keyed only', messageID: 'msg_keyed', partID: 'prt_keyed' },
      }),
    ).toEqual([
      {
        type: 'transcript_part_upsert',
        sessionId: 'ses_test',
        part: expect.objectContaining({
          id: 'prt_keyed',
          messageId: 'msg_keyed',
          type: 'text',
          text: '',
        }),
      },
      {
        type: 'transcript_part_delta',
        sessionId: 'ses_test',
        messageId: 'msg_keyed',
        partId: 'prt_keyed',
        partType: 'text',
        delta: 'keyed only',
        raw: expect.objectContaining({ type: 'text_delta' }),
      },
    ])

    expect(
      normalizePiEvent('ses_test', {
        type: 'message_update',
        assistantMessageEvent: { type: 'thinking_delta', delta: 'thought' },
      }),
    ).toEqual([
      {
        type: 'transcript_unkeyed_delta',
        sessionId: 'ses_test',
        content: 'thought',
        partType: 'thinking',
        raw: expect.objectContaining({ type: 'thinking_delta' }),
      },
    ])

    expect(
      normalizeMessageRecord({
        id: 'msg_1',
        role: 'assistant',
        content: [
          { type: 'text', text: 'hello' },
          { type: 'toolCall', id: 'tool-1', name: 'todo', arguments: { todos: [{ text: 'Ship' }] } },
        ],
      }),
    ).toMatchObject({
      id: 'msg_1',
      role: 'assistant',
      content: 'hello',
      raw: expect.objectContaining({ id: 'msg_1' }),
      parts: [
        expect.objectContaining({ id: expect.any(String), messageId: 'msg_1', type: 'text', text: 'hello' }),
        expect.objectContaining({ id: 'tool-1', messageId: 'msg_1', type: 'toolCall', toolCallId: 'tool-1', name: 'todo' }),
      ],
    })

    expect(
      normalizeMessageRecord({
        id: 'result_1',
        role: 'toolResult',
        toolCallId: 'tool-1',
        toolName: 'todo',
        content: [{ type: 'text', text: 'updated' }],
        details: { todos: [{ text: 'Ship' }] },
      }),
    ).toMatchObject({
      id: 'result_1',
      role: 'toolResult',
      toolCallId: 'tool-1',
      toolName: 'todo',
      content: 'updated',
      details: { todos: [{ text: 'Ship' }] },
    })
  })

  it('normalizes todo tool results and queue state for renderer events', () => {
    expect(
      normalizeTodoDetails({
        todos: [
          { id: 'a', text: 'Build UI', status: 'in_progress', explanation: 'working' },
          { id: 2, content: 'Old item', done: true },
        ],
      }),
    ).toEqual([
      { id: 'a', content: 'Build UI', status: 'in_progress', explanation: 'working' },
      { id: '2', content: 'Old item', status: 'completed', explanation: undefined },
    ])

    expect(normalizeQueueItem('follow this up')).toEqual({ content: 'follow this up' })
    expect(normalizeQueueItem({ id: 7, message: 'steer this', timestamp: '2026-06-03T00:00:00.000Z' })).toEqual({
      id: '7',
      content: 'steer this',
      createdAt: '2026-06-03T00:00:00.000Z',
    })

    expect(
      normalizePiEvent('ses_test', {
        type: 'turn_end',
        toolResults: [
          {
            toolCallId: 'tool-1',
            toolName: 'todo',
            content: [{ type: 'text', text: 'updated' }],
            details: { todos: [{ id: '1', text: 'Ship it', status: 'pending' }] },
          },
        ],
      }),
    ).toEqual([
      {
        type: 'todos',
        sessionId: 'ses_test',
        todos: [{ id: '1', content: 'Ship it', status: 'pending', explanation: undefined }],
      },
      expect.objectContaining({ type: 'tool', sessionId: 'ses_test' }),
    ])

    expect(
      normalizePiEvent('ses_test', {
        type: 'queue_update',
        steering: ['watch tests'],
        followUp: [{ content: 'summarize', createdAt: '2026-06-03T00:00:00.000Z' }],
      }),
    ).toEqual([
      {
        type: 'metadata',
        sessionId: 'ses_test',
        metadata: {
          queue: {
            steering: [{ content: 'watch tests' }],
            followUp: [{ content: 'summarize', createdAt: '2026-06-03T00:00:00.000Z' }],
          },
          steerQueue: {
            active: true,
            queuedCount: 2,
            canSteer: true,
            canQueue: true,
            hint: 'Enter steers the active turn. Tab queues a follow-up.',
          },
        },
      },
    ])
  })

  it('emits steer queue metadata on agent lifecycle events', () => {
    expect(normalizePiEvent('ses_test', { type: 'agent_start' })).toEqual([
      { type: 'status', sessionId: 'ses_test', status: 'running' },
      {
        type: 'metadata',
        sessionId: 'ses_test',
        metadata: {
          steerQueue: {
            active: true,
            queuedCount: 0,
            canSteer: true,
            canQueue: true,
            hint: 'Enter steers the active turn. Tab queues a follow-up.',
          },
        },
      },
    ])

    expect(normalizePiEvent('ses_test', { type: 'agent_end' })).toContainEqual({
      type: 'metadata',
      sessionId: 'ses_test',
      metadata: {
        steerQueue: {
          active: false,
          queuedCount: 0,
          canSteer: false,
          canQueue: false,
          hint: '',
        },
      },
    })
  })

  it('emits latest persisted todos when messages are loaded', async () => {
    const directoryPath = makeTempRoot()
    const fakeProcess = createFakeRpcProcess({
      messages: [
        { id: 'msg_loaded', role: 'user', content: [{ type: 'text', text: 'loaded' }] },
        {
          id: 'tool_loaded',
          role: 'toolResult',
          toolName: 'todo',
          content: [{ type: 'text', text: 'updated' }],
          details: { todos: [{ id: '1', text: 'Persisted todo', status: 'pending' }] },
        },
      ],
    })
    const service = createAssistantService({
      userDataPath: path.join(directoryPath, 'user-data'),
      spawn: vi.fn(() => fakeProcess),
      spawnSync: vi.fn(() => ({ status: 0, stdout: '0.78.0' })),
      env: { OPENASS_DISABLE_SHELL_ENV: '1' },
    })
    const events = []
    const session = await service.createSession({ directoryPath })
    const unsubscribe = service.onSessionEvent(session.id, (event) => events.push(event))

    await service.openSession(session.id)

    expect(events).toContainEqual({
      type: 'todos',
      sessionId: session.id,
      todos: [{ id: '1', content: 'Persisted todo', status: 'pending', explanation: undefined }],
    })

    unsubscribe()
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

  it('normalizes Pi optionList and checklist extension UI requests into renderer events', () => {
    expect(
      normalizePiEvent('ses_test', {
        type: 'extension_ui_request',
        id: 'options_1',
        method: 'optionList',
        title: 'Permission Mode',
        message: 'Current mode: default',
        selectionMode: 'single',
        options: [
          { label: 'Default', value: 'default', checked: true },
          { label: 'Auto Review', value: 'auto-review', description: 'Reviewed approvals', disabled: true },
        ],
      }),
    ).toEqual([
      {
        type: 'extension_ui',
        sessionId: 'ses_test',
        request: {
          id: 'options_1',
          type: 'option-list',
          title: 'Permission Mode',
          message: 'Current mode: default',
          selectionMode: 'single',
          options: [
            { label: 'Default', value: 'default', description: undefined, checked: true, disabled: undefined },
            { label: 'Auto Review', value: 'auto-review', description: 'Reviewed approvals', checked: undefined, disabled: true },
          ],
        },
      },
    ])

    expect(
      normalizePiEvent('ses_test', {
        type: 'extension_ui_request',
        id: 'options_2',
        method: 'checklist',
        title: 'Tools',
        options: ['Read', 'Write'],
      }),
    ).toEqual([
      {
        type: 'extension_ui',
        sessionId: 'ses_test',
        request: {
          id: 'options_2',
          type: 'option-list',
          title: 'Tools',
          message: undefined,
          selectionMode: 'multiple',
          options: [
            { label: 'Read', value: 'Read' },
            { label: 'Write', value: 'Write' },
          ],
        },
      },
    ])
  })

  it('ignores todo-list extension widgets because Open-Ass has a dedicated todo panel', () => {
    expect(
      normalizePiEvent('ses_test', {
        type: 'extension_ui_request',
        id: 'widget_1',
        method: 'setWidget',
        widgetKey: 'todo-list',
        widgetLines: ['Todos 1 active', '◐ #1 Ship feature'],
      }),
    ).toEqual([
      {
        type: 'metadata',
        sessionId: 'ses_test',
        metadata: {},
      },
    ])
  })
})

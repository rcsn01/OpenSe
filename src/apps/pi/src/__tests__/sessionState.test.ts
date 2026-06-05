import { describe, expect, it } from 'vitest'
import { initialSessionViewState, reduceSessionEvent, selectTranscriptItems } from '../lib/sessionState'

const sessionId = 'session-1'

describe('sessionState', () => {
  it('replaces canonical snapshots without dropping older history from the snapshot', () => {
    const state = reduceSessionEvent(initialSessionViewState, {
      type: 'transcript_snapshot',
      sessionId,
      items: [
        {
          info: { id: 'old-user', role: 'user', content: 'older prompt', status: 'complete' },
          parts: [{ id: 'old-user:text', messageId: 'old-user', type: 'text', text: 'older prompt' }],
        },
        {
          info: { id: 'old-assistant', role: 'assistant', content: 'older answer', status: 'complete' },
          parts: [{ id: 'old-assistant:text', messageId: 'old-assistant', type: 'text', text: 'older answer' }],
        },
        {
          info: { id: 'new-user', role: 'user', content: 'new prompt', status: 'complete' },
          parts: [{ id: 'new-user:text', messageId: 'new-user', type: 'text', text: 'new prompt' }],
        },
      ],
    })

    expect(state.messagesBySessionId[sessionId].map((message) => message.id)).toEqual([
      'old-user',
      'old-assistant',
      'new-user',
    ])
    expect(selectTranscriptItems(state, sessionId).map((item) => item.parts[0]?.id)).toEqual([
      'old-user:text',
      'old-assistant:text',
      'new-user:text',
    ])
  })

  it('keyed message and part updates insert and update in stable order', () => {
    const withMessages = [
      { id: 'msg_001_user', role: 'user' as const, content: 'ping', status: 'complete' as const },
      { id: 'msg_002_assistant', role: 'assistant' as const, content: '', status: 'streaming' as const },
      { id: 'msg_003_user', role: 'user' as const, content: 'give me example todo', status: 'complete' as const },
    ].reduce(
      (state, info) => reduceSessionEvent(state, { type: 'transcript_message_upsert', sessionId, info }),
      initialSessionViewState,
    )

    const withText = reduceSessionEvent(withMessages, {
      type: 'transcript_part_delta',
      sessionId,
      messageId: 'msg_002_assistant',
      partId: 'msg_002_assistant:text',
      partType: 'text',
      delta: 'Pong',
    })
    const updated = reduceSessionEvent(withText, {
      type: 'transcript_part_delta',
      sessionId,
      messageId: 'msg_002_assistant',
      partId: 'msg_002_assistant:text',
      partType: 'text',
      delta: '!',
    })

    expect(updated.messagesBySessionId[sessionId].map((message) => message.id)).toEqual([
      'msg_001_user',
      'msg_002_assistant',
      'msg_003_user',
    ])
    expect(updated.partsByMessageId['msg_002_assistant']).toEqual([
      { id: 'msg_002_assistant:text', messageId: 'msg_002_assistant', type: 'text', text: 'Pong!', raw: undefined },
    ])
  })

  it('inserts out-of-order keyed messages and parts by stable opencode id', () => {
    const withMessages = [
      { id: 'msg_003_user', role: 'user' as const, content: 'third', status: 'complete' as const },
      { id: 'msg_001_user', role: 'user' as const, content: 'first', status: 'complete' as const },
      { id: 'msg_002_assistant', role: 'assistant' as const, content: 'second', status: 'complete' as const },
    ].reduce(
      (state, info) => reduceSessionEvent(state, { type: 'transcript_message_upsert', sessionId, info }),
      initialSessionViewState,
    )

    const withParts = [
      { id: 'prt_003', messageId: 'msg_002_assistant', type: 'text' as const, text: 'third part' },
      { id: 'prt_001', messageId: 'msg_002_assistant', type: 'text' as const, text: 'first part' },
      { id: 'prt_002', messageId: 'msg_002_assistant', type: 'text' as const, text: 'second part' },
    ].reduce(
      (state, part) => reduceSessionEvent(state, { type: 'transcript_part_upsert', sessionId, part }),
      withMessages,
    )

    expect(selectTranscriptItems(withParts, sessionId).map((item) => item.info.content)).toEqual([
      'first',
      'second',
      'third',
    ])
    expect(withParts.partsByMessageId.msg_002_assistant.flatMap((part) => (part.type === 'text' ? [part.text] : []))).toEqual([
      'first part',
      'second part',
      'third part',
    ])
  })

  it('stores keyed deltas without rendering synthetic assistant messages', () => {
    const withDelta = reduceSessionEvent(initialSessionViewState, {
      type: 'transcript_part_delta',
      sessionId,
      messageId: 'assistant-later',
      partId: 'assistant-later:text',
      partType: 'text',
      delta: 'hidden until canonical',
    })

    expect(withDelta.messagesBySessionId[sessionId]).toBeUndefined()
    expect(selectTranscriptItems(withDelta, sessionId)).toEqual([])
    expect(withDelta.partsByMessageId['assistant-later']).toEqual([
      {
        id: 'assistant-later:text',
        messageId: 'assistant-later',
        type: 'text',
        text: 'hidden until canonical',
        raw: undefined,
      },
    ])

    const withCanonical = reduceSessionEvent(withDelta, {
      type: 'transcript_message_upsert',
      sessionId,
      info: { id: 'assistant-later', role: 'assistant', content: '', status: 'streaming' },
    })

    expect(selectTranscriptItems(withCanonical, sessionId)[0].parts[0]).toMatchObject({
      text: 'hidden until canonical',
    })
  })

  it('reconciles optimistic user echoes by canonical message id', () => {
    const withOptimistic = reduceSessionEvent(initialSessionViewState, {
      type: 'transcript_optimistic_add',
      sessionId,
      item: {
        info: { id: 'msg_local', role: 'user', content: 'ping', optimistic: true },
        parts: [{ id: 'prt_local', messageId: 'msg_local', type: 'text', text: 'ping' }],
      },
    })

    expect(selectTranscriptItems(withOptimistic, sessionId).map((item) => item.info.id)).toEqual(['msg_local'])
    expect(withOptimistic.messagesBySessionId[sessionId].map((message) => message.id)).toEqual(['msg_local'])
    expect(withOptimistic.partsByMessageId.msg_local).toEqual([
      { id: 'prt_local', messageId: 'msg_local', type: 'text', text: 'ping' },
    ])
    expect(withOptimistic.optimisticBySessionId[sessionId]).toHaveLength(1)

    const refreshedBeforeEcho = reduceSessionEvent(withOptimistic, {
      type: 'transcript_snapshot',
      sessionId,
      items: [
        {
          info: { id: 'msg_earlier', role: 'assistant', content: 'old answer', status: 'complete' },
          parts: [{ id: 'prt_earlier', messageId: 'msg_earlier', type: 'text', text: 'old answer' }],
        },
      ],
    })

    expect(selectTranscriptItems(refreshedBeforeEcho, sessionId).map((item) => item.info.id)).toEqual([
      'msg_earlier',
      'msg_local',
    ])
    expect(refreshedBeforeEcho.optimisticBySessionId[sessionId]).toHaveLength(1)

    const reconciled = reduceSessionEvent(refreshedBeforeEcho, {
      type: 'transcript_snapshot',
      sessionId,
      items: [
        {
          info: { id: 'msg_local', role: 'user', content: 'ping', status: 'complete' },
          parts: [{ id: 'prt_local', messageId: 'msg_local', type: 'text', text: 'ping' }],
        },
      ],
    })

    expect(reconciled.optimisticBySessionId[sessionId]).toBeUndefined()
    expect(selectTranscriptItems(reconciled, sessionId).map((item) => item.info.id)).toEqual(['msg_local'])
    expect(selectTranscriptItems(reconciled, sessionId)[0].info.optimistic).toBeUndefined()
  })

  it('removes failed optimistic echoes without deleting canonical messages', () => {
    const withOptimistic = reduceSessionEvent(initialSessionViewState, {
      type: 'transcript_optimistic_add',
      sessionId,
      item: {
        info: { id: 'msg_local', role: 'user', content: 'ping', optimistic: true },
        parts: [{ id: 'prt_local', messageId: 'msg_local', type: 'text', text: 'ping' }],
      },
    })

    const removed = reduceSessionEvent(withOptimistic, {
      type: 'transcript_optimistic_remove',
      sessionId,
      messageId: 'msg_local',
    })

    expect(selectTranscriptItems(removed, sessionId)).toEqual([])
    expect(removed.partsByMessageId.msg_local).toBeUndefined()

    const canonical = reduceSessionEvent(withOptimistic, {
      type: 'transcript_message_upsert',
      sessionId,
      info: { id: 'msg_local', role: 'user', content: 'ping', status: 'complete' },
    })
    expect(selectTranscriptItems(canonical, sessionId)[0].info.optimistic).toBeUndefined()
    expect(canonical.optimisticBySessionId[sessionId]).toHaveLength(1)

    const removeAfterCanonical = reduceSessionEvent(canonical, {
      type: 'transcript_optimistic_remove',
      sessionId,
      messageId: 'msg_local',
    })

    expect(selectTranscriptItems(removeAfterCanonical, sessionId).map((item) => item.info.id)).toEqual(['msg_local'])
    expect(selectTranscriptItems(removeAfterCanonical, sessionId)[0].info.optimistic).toBeUndefined()
  })

  it('treats a same-text canonical user snapshot as confirmation when Pi does not echo local ids', () => {
    const withOptimistic = reduceSessionEvent(initialSessionViewState, {
      type: 'transcript_optimistic_add',
      sessionId,
      item: {
        info: {
          id: 'msg_local',
          role: 'user',
          content: 'make a todo list',
          createdAt: '2026-06-03T00:00:10.000Z',
          optimistic: true,
        },
        parts: [{ id: 'prt_local', messageId: 'msg_local', type: 'text', text: 'make a todo list' }],
      },
    })

    const confirmed = reduceSessionEvent(withOptimistic, {
      type: 'transcript_snapshot',
      sessionId,
      items: [
        {
          info: {
            id: 'msg_pi',
            role: 'user',
            content: 'make a todo list',
            createdAt: '2026-06-03T00:00:11.000Z',
            status: 'complete',
          },
          parts: [{ id: 'prt_pi', messageId: 'msg_pi', type: 'text', text: 'make a todo list' }],
        },
        {
          info: { id: 'msg_assistant', role: 'assistant', content: 'Done', status: 'complete' },
          parts: [{ id: 'prt_assistant', messageId: 'msg_assistant', type: 'text', text: 'Done' }],
        },
      ],
    })

    expect(confirmed.optimisticBySessionId[sessionId]).toBeUndefined()
    expect(selectTranscriptItems(confirmed, sessionId).map((item) => item.info.id)).toEqual([
      'msg_pi',
      'msg_assistant',
    ])
    expect(selectTranscriptItems(confirmed, sessionId).map((item) => item.info.content)).toEqual([
      'make a todo list',
      'Done',
    ])
  })

  it('keeps no-id chunks only in live preview and clears them on canonical snapshot', () => {
    const withLive = reduceSessionEvent(initialSessionViewState, {
      type: 'transcript_unkeyed_delta',
      sessionId,
      content: 'Working',
      partType: 'text',
    })

    expect(withLive.messagesBySessionId[sessionId]).toBeUndefined()
    expect(withLive.liveUnkeyedBySessionId[sessionId][0]).toMatchObject({
      type: 'text',
      text: 'Working',
    })

    const withSnapshot = reduceSessionEvent(withLive, {
      type: 'transcript_snapshot',
      sessionId,
      items: [
        {
          info: { id: 'assistant-real', role: 'assistant', content: 'Done', status: 'complete' },
          parts: [{ id: 'assistant-real:text', messageId: 'assistant-real', type: 'text', text: 'Done' }],
        },
      ],
    })

    expect(withSnapshot.liveUnkeyedBySessionId[sessionId]).toBeUndefined()
    expect(selectTranscriptItems(withSnapshot, sessionId)[0].parts[0]).toMatchObject({ text: 'Done' })
  })

  it('does not use active-turn guesses for unkeyed active sequence chunks', () => {
    const withHistory = reduceSessionEvent(initialSessionViewState, {
      type: 'transcript_snapshot',
      sessionId,
      items: [
        {
          info: { id: 'msg-ping-1', role: 'user', content: 'ping', status: 'complete' },
          parts: [{ id: 'prt-ping-1', messageId: 'msg-ping-1', type: 'text', text: 'ping' }],
        },
        {
          info: { id: 'msg-pong-1', role: 'assistant', content: 'pong', status: 'complete' },
          parts: [{ id: 'prt-pong-1', messageId: 'msg-pong-1', type: 'text', text: 'pong' }],
        },
        {
          info: { id: 'msg-todo', role: 'user', content: 'give me example todo', status: 'complete' },
          parts: [{ id: 'prt-todo', messageId: 'msg-todo', type: 'text', text: 'give me example todo' }],
        },
        {
          info: { id: 'msg-clear', role: 'user', content: 'clear your todo', status: 'complete' },
          parts: [{ id: 'prt-clear', messageId: 'msg-clear', type: 'text', text: 'clear your todo' }],
        },
        {
          info: { id: 'msg-ping-2', role: 'user', content: 'ping', status: 'complete' },
          parts: [{ id: 'prt-ping-2', messageId: 'msg-ping-2', type: 'text', text: 'ping' }],
        },
      ],
    })

    const withUnkeyed = reduceSessionEvent(withHistory, {
      type: 'transcript_unkeyed_delta',
      sessionId,
      content: 'Pong again',
      partType: 'text',
    })

    expect(withUnkeyed.messagesBySessionId[sessionId].map((message) => message.content)).toEqual([
      'ping',
      'pong',
      'give me example todo',
      'clear your todo',
      'ping',
    ])
    expect(withUnkeyed.liveUnkeyedBySessionId[sessionId][0]).toMatchObject({ text: 'Pong again' })
  })

  it('legacy tool events update side-channel state without appending transcript rows', () => {
    const withUser = reduceSessionEvent(initialSessionViewState, {
      type: 'transcript_message_upsert',
      sessionId,
      info: { id: 'user-1', role: 'user', content: 'clear your todo', status: 'complete' },
    })
    const withTool = reduceSessionEvent(withUser, {
      type: 'tool',
      sessionId,
      tool: { id: 'todo-call', name: 'todo', status: 'complete', summary: 'Cleared 8 todos' },
    })

    expect(withTool.messagesBySessionId[sessionId].map((message) => message.id)).toEqual(['user-1'])
    expect(withTool.toolsBySessionId[sessionId]).toEqual([
      { id: 'todo-call', name: 'todo', status: 'complete', summary: 'Cleared 8 todos' },
    ])
  })

  it('attaches tool call and result rendering data by canonical IDs only', () => {
    const state = reduceSessionEvent(initialSessionViewState, {
      type: 'transcript_snapshot',
      sessionId,
      items: [
        {
          info: { id: 'assistant-1', role: 'assistant', content: 'Plan:', status: 'complete' },
          parts: [
            { id: 'assistant-1:text', messageId: 'assistant-1', type: 'text', text: 'Plan:' },
            {
              id: 'tool-call-1',
              messageId: 'assistant-1',
              type: 'toolCall',
              toolCallId: 'tool-call-1',
              name: 'todo',
              arguments: {},
            },
          ],
        },
        {
          info: {
            id: 'tool-result-1',
            role: 'toolResult',
            content: 'updated',
            status: 'complete',
            toolCallId: 'tool-call-1',
            toolName: 'todo',
          },
          parts: [{ id: 'tool-result-1:text', messageId: 'tool-result-1', type: 'text', text: 'updated' }],
        },
      ],
    })

    expect(selectTranscriptItems(state, sessionId).map((item) => item.info.id)).toEqual([
      'assistant-1',
      'tool-result-1',
    ])
    expect(state.partsByMessageId['assistant-1'][1]).toMatchObject({ type: 'toolCall', toolCallId: 'tool-call-1' })
  })
})

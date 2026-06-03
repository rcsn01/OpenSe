import type {
  AssistantDiff,
  AssistantMetadata,
  AssistantPermissionRequest,
  AssistantQuestionRequest,
  AssistantSession,
  AssistantSessionEvent,
  AssistantToolEvent,
  AssistantTodo,
  AssistantTranscriptMessage,
  ExtensionUiRequest,
} from './assistantBridge'

export type SessionViewState = {
  activeSessionId: string | null
  sessions: AssistantSession[]
  messagesBySessionId: Record<string, AssistantTranscriptMessage[]>
  toolsBySessionId: Record<string, AssistantToolEvent[]>
  todosBySessionId: Record<string, AssistantTodo[]>
  diffsBySessionId: Record<string, AssistantDiff[]>
  permissionsBySessionId: Record<string, AssistantPermissionRequest[]>
  questionsBySessionId: Record<string, AssistantQuestionRequest[]>
  metadataBySessionId: Record<string, AssistantMetadata>
  extensionRequest: ExtensionUiRequest | null
  error: string | null
}

export const initialSessionViewState: SessionViewState = {
  activeSessionId: null,
  sessions: [],
  messagesBySessionId: {},
  toolsBySessionId: {},
  todosBySessionId: {},
  diffsBySessionId: {},
  permissionsBySessionId: {},
  questionsBySessionId: {},
  metadataBySessionId: {},
  extensionRequest: null,
  error: null,
}

const upsertSession = (sessions: AssistantSession[], session: AssistantSession) => {
  const index = sessions.findIndex((item) => item.id === session.id)
  if (index === -1) return [session, ...sessions]
  return sessions.map((item) => (item.id === session.id ? { ...item, ...session } : item))
}

const updateSession = (
  sessions: AssistantSession[],
  sessionId: string,
  updates: Partial<AssistantSession>,
) =>
  sessions.map((session) =>
    session.id === sessionId
      ? { ...session, ...updates, updatedAt: updates.updatedAt ?? new Date().toISOString() }
      : session,
  )

const appendOrReplaceMessage = (
  messages: AssistantTranscriptMessage[],
  message: AssistantTranscriptMessage,
) => {
  const index = messages.findIndex((item) => item.id === message.id)
  if (index === -1) return [...messages, message]
  return messages.map((item) => (item.id === message.id ? { ...item, ...message } : item))
}

export const reduceSessionEvent = (
  state: SessionViewState,
  event: AssistantSessionEvent,
): SessionViewState => {
  if (event.type === 'status') {
    return {
      ...state,
      sessions: updateSession(state.sessions, event.sessionId, {
        status: event.status,
        model: event.model,
        lastError: event.error,
      }),
      error: event.error ?? state.error,
    }
  }

  if (event.type === 'messages') {
    return {
      ...state,
      messagesBySessionId: {
        ...state.messagesBySessionId,
        [event.sessionId]: event.messages,
      },
    }
  }

  if (event.type === 'message') {
    const existing = state.messagesBySessionId[event.sessionId] ?? []
    return {
      ...state,
      messagesBySessionId: {
        ...state.messagesBySessionId,
        [event.sessionId]: appendOrReplaceMessage(existing, event.message),
      },
    }
  }

  if (event.type === 'text_delta') {
    const existing = state.messagesBySessionId[event.sessionId] ?? []
    const lastAssistant = [...existing].reverse().find((message) => message.role === 'assistant')
    const messageId = event.messageId ?? lastAssistant?.id ?? `assistant-${Date.now()}`
    const current =
      existing.find((message) => message.id === messageId) ??
      ({
        id: messageId,
        role: 'assistant',
        content: '',
        status: 'streaming',
        createdAt: new Date().toISOString(),
      } satisfies AssistantTranscriptMessage)

    return {
      ...state,
      messagesBySessionId: {
        ...state.messagesBySessionId,
        [event.sessionId]: appendOrReplaceMessage(existing, {
          ...current,
          content: `${current.content}${event.delta}`,
          status: 'streaming',
        }),
      },
    }
  }

  if (event.type === 'message_part') {
    const existing = state.messagesBySessionId[event.sessionId] ?? []
    const current =
      existing.find((message) => message.id === event.messageId) ??
      ({
        id: event.messageId,
        role: 'assistant',
        content: '',
        status: 'streaming',
        createdAt: new Date().toISOString(),
      } satisfies AssistantTranscriptMessage)

    return {
      ...state,
      messagesBySessionId: {
        ...state.messagesBySessionId,
        [event.sessionId]: appendOrReplaceMessage(existing, {
          ...current,
          content: event.content || current.content,
          status: event.partType === 'reasoning' ? 'streaming' : current.status,
        }),
      },
    }
  }

  if (event.type === 'tool') {
    const existing = state.toolsBySessionId[event.sessionId] ?? []
    return {
      ...state,
      toolsBySessionId: {
        ...state.toolsBySessionId,
        [event.sessionId]: [...existing.filter((tool) => tool.id !== event.tool.id), event.tool],
      },
    }
  }

  if (event.type === 'todos') {
    return {
      ...state,
      todosBySessionId: { ...state.todosBySessionId, [event.sessionId]: event.todos },
    }
  }

  if (event.type === 'diff') {
    return {
      ...state,
      diffsBySessionId: { ...state.diffsBySessionId, [event.sessionId]: event.diff },
    }
  }

  if (event.type === 'permissions') {
    return {
      ...state,
      permissionsBySessionId: { ...state.permissionsBySessionId, [event.sessionId]: event.permissions },
    }
  }

  if (event.type === 'permission') {
    const existing = state.permissionsBySessionId[event.sessionId] ?? []
    return {
      ...state,
      permissionsBySessionId: {
        ...state.permissionsBySessionId,
        [event.sessionId]: [...existing.filter((item) => item.id !== event.permission.id), event.permission],
      },
    }
  }

  if (event.type === 'permission_resolved') {
    const existing = state.permissionsBySessionId[event.sessionId] ?? []
    return {
      ...state,
      permissionsBySessionId: {
        ...state.permissionsBySessionId,
        [event.sessionId]: existing.filter((item) => item.id !== event.requestId),
      },
    }
  }

  if (event.type === 'questions') {
    return {
      ...state,
      questionsBySessionId: { ...state.questionsBySessionId, [event.sessionId]: event.questions },
    }
  }

  if (event.type === 'question') {
    const existing = state.questionsBySessionId[event.sessionId] ?? []
    return {
      ...state,
      questionsBySessionId: {
        ...state.questionsBySessionId,
        [event.sessionId]: [...existing.filter((item) => item.id !== event.question.id), event.question],
      },
    }
  }

  if (event.type === 'question_resolved') {
    const existing = state.questionsBySessionId[event.sessionId] ?? []
    return {
      ...state,
      questionsBySessionId: {
        ...state.questionsBySessionId,
        [event.sessionId]: existing.filter((item) => item.id !== event.requestId),
      },
    }
  }

  if (event.type === 'metadata') {
    const existing = state.metadataBySessionId[event.sessionId] ?? {}
    return {
      ...state,
      metadataBySessionId: {
        ...state.metadataBySessionId,
        [event.sessionId]: {
          ...existing,
          ...event.metadata,
          extensionStatuses: {
            ...((existing.extensionStatuses as Record<string, unknown> | undefined) ?? {}),
            ...((event.metadata.extensionStatuses as Record<string, unknown> | undefined) ?? {}),
          },
          extensionWidgets: {
            ...((existing.extensionWidgets as Record<string, unknown> | undefined) ?? {}),
            ...((event.metadata.extensionWidgets as Record<string, unknown> | undefined) ?? {}),
          },
        },
      },
    }
  }

  if (event.type === 'sdk_event') {
    return state
  }

  if (event.type === 'extension_ui') {
    return { ...state, extensionRequest: event.request }
  }

  return { ...state, error: event.error }
}

export const applySessionList = (
  state: SessionViewState,
  sessions: AssistantSession[],
): SessionViewState => {
  const activeSession = state.activeSessionId
    ? state.sessions.find((session) => session.id === state.activeSessionId)
    : null
  const nextSessions =
    activeSession && !sessions.some((session) => session.id === activeSession.id)
      ? [activeSession, ...sessions]
      : sessions

  return {
    ...state,
    sessions: nextSessions,
    activeSessionId: state.activeSessionId ?? nextSessions[0]?.id ?? null,
  }
}

export const addSession = (
  state: SessionViewState,
  session: AssistantSession,
): SessionViewState => ({
  ...state,
  sessions: upsertSession(state.sessions, session),
  activeSessionId: session.id,
})

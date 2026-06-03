import type {
  AssistantDiff,
  AssistantMessagePart,
  AssistantMetadata,
  AssistantPermissionRequest,
  AssistantQuestionRequest,
  AssistantSession,
  AssistantSessionEvent,
  AssistantTodo,
  AssistantToolEvent,
  AssistantTranscriptItem,
  AssistantTranscriptMessage,
  AssistantTranscriptMessageInfo,
  AssistantTranscriptPage,
  AssistantTranscriptPart,
  ExtensionUiRequest,
} from './assistantBridge'

export type TranscriptHistoryState = {
  cursor?: string
  complete: boolean
}

export type SessionViewState = {
  activeSessionId: string | null
  sessions: AssistantSession[]
  messagesBySessionId: Record<string, AssistantTranscriptMessageInfo[]>
  partsByMessageId: Record<string, AssistantTranscriptPart[]>
  liveUnkeyedBySessionId: Record<string, AssistantTranscriptPart[]>
  optimisticBySessionId: Record<string, AssistantTranscriptItem[]>
  historyBySessionId: Record<string, TranscriptHistoryState>
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
  partsByMessageId: {},
  liveUnkeyedBySessionId: {},
  optimisticBySessionId: {},
  historyBySessionId: {},
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

const stripMessageParts = (message: AssistantTranscriptMessage): AssistantTranscriptMessageInfo => ({
  id: message.id,
  role: message.role,
  content: message.content,
  createdAt: message.createdAt,
  status: message.status,
  parentMessageId: message.parentMessageId,
  optimistic: message.optimistic,
  raw: message.raw,
  toolCallId: message.toolCallId,
  toolName: message.toolName,
  details: message.details,
})

const partIdForIndex = (messageId: string, index: number) => `${messageId}:part:${index}`

const hasCanonicalPartShape = (part: AssistantMessagePart | AssistantTranscriptPart): part is AssistantTranscriptPart =>
  'id' in part && 'messageId' in part && typeof part.id === 'string' && typeof part.messageId === 'string'

const normalizePartForMessage = (
  messageId: string,
  part: AssistantMessagePart | AssistantTranscriptPart,
  index = 0,
): AssistantTranscriptPart => {
  if (hasCanonicalPartShape(part)) return { ...part, messageId }

  const base = { id: partIdForIndex(messageId, index), messageId, raw: part.raw }
  if (part.type === 'text') return { ...base, type: 'text', text: part.text }
  if (part.type === 'thinking') return { ...base, type: 'thinking', text: part.text }
  if (part.type === 'toolCall') {
    return {
      ...base,
      id: part.id,
      type: 'toolCall',
      toolCallId: part.id,
      name: part.name,
      arguments: part.arguments,
      status: part.status,
      raw: part.raw,
    }
  }
  if (part.type === 'image') {
    return {
      ...base,
      type: 'image',
      url: part.url,
      data: part.data,
      mimeType: part.mimeType,
      alt: part.alt,
      raw: part.raw,
    }
  }
  return {
    ...base,
    type: 'unknown',
    label: part.label,
    value: part.value,
    raw: part.raw,
  }
}

const partsFromMessage = (message: AssistantTranscriptMessage) =>
  (message.parts ?? []).map((part, index) => normalizePartForMessage(message.id, part, index))

const withoutOptimisticFlag = (info: AssistantTranscriptMessageInfo): AssistantTranscriptMessageInfo => {
  const next = { ...info }
  delete next.optimistic
  return next
}

const mergeMessageInfo = (
  existing: AssistantTranscriptMessageInfo,
  incoming: AssistantTranscriptMessageInfo,
): AssistantTranscriptMessageInfo => {
  const merged = {
    ...existing,
    ...incoming,
    content: incoming.content || existing.content,
    createdAt: incoming.createdAt ?? existing.createdAt,
    raw: incoming.raw ?? existing.raw,
    details: incoming.details ?? existing.details,
  }
  if (incoming.optimistic === true) return { ...merged, optimistic: true }
  return withoutOptimisticFlag(merged)
}

const sortedInsertIndex = <T>(items: T[], id: string, getId: (item: T) => string) => {
  let low = 0
  let high = items.length
  while (low < high) {
    const mid = Math.floor((low + high) / 2)
    if (getId(items[mid]) < id) low = mid + 1
    else high = mid
  }
  return low
}

const upsertMessageInfo = (
  messages: AssistantTranscriptMessageInfo[],
  incoming: AssistantTranscriptMessageInfo,
  index?: number,
) => {
  const existingIndex = messages.findIndex((message) => message.id === incoming.id)
  if (existingIndex !== -1) {
    return messages.map((message, messageIndex) =>
      messageIndex === existingIndex ? mergeMessageInfo(message, incoming) : message,
    )
  }

  if (typeof index === 'number' && index >= 0 && index < messages.length) {
    return [...messages.slice(0, index), incoming, ...messages.slice(index)]
  }
  const insertIndex = sortedInsertIndex(messages, incoming.id, (message) => message.id)
  return [...messages.slice(0, insertIndex), incoming, ...messages.slice(insertIndex)]
}

const upsertPart = (
  parts: AssistantTranscriptPart[] | undefined,
  incoming: AssistantTranscriptPart,
  index?: number,
) => {
  const current = parts ?? []
  const existingIndex = current.findIndex((part) => part.id === incoming.id)
  if (existingIndex !== -1) {
    return current.map((part, partIndex) => (partIndex === existingIndex ? { ...part, ...incoming } : part))
  }
  if (typeof index === 'number' && index >= 0 && index < current.length) {
    return [...current.slice(0, index), incoming, ...current.slice(index)]
  }
  const insertIndex = sortedInsertIndex(current, incoming.id, (part) => part.id)
  return [...current.slice(0, insertIndex), incoming, ...current.slice(insertIndex)]
}

const appendDeltaPart = (
  parts: AssistantTranscriptPart[] | undefined,
  messageId: string,
  partId: string,
  partType: 'text' | 'thinking',
  delta: string,
  raw?: unknown,
) => {
  const current = parts ?? []
  const existingIndex = current.findIndex((part) => part.id === partId)
  if (existingIndex !== -1) {
    return current.map((part, partIndex) => {
      if (partIndex !== existingIndex) return part
      if (part.type === 'text' && partType === 'text') return { ...part, text: `${part.text}${delta}`, raw: raw ?? part.raw }
      if (part.type === 'thinking' && partType === 'thinking') return { ...part, text: `${part.text}${delta}`, raw: raw ?? part.raw }
      return part
    })
  }
  return [...current, { id: partId, messageId, type: partType, text: delta, raw }]
}

const clearLiveUnkeyed = (state: SessionViewState, sessionId: string): SessionViewState => {
  if (!state.liveUnkeyedBySessionId[sessionId]?.length) return state
  const nextLive = { ...state.liveUnkeyedBySessionId }
  delete nextLive[sessionId]
  return { ...state, liveUnkeyedBySessionId: nextLive }
}

const removePendingOptimisticMessages = (
  optimisticBySessionId: SessionViewState['optimisticBySessionId'],
  sessionId: string,
  messageIds: Set<string>,
) => {
  const existing = optimisticBySessionId[sessionId] ?? []
  if (!existing.length) return optimisticBySessionId
  const nextItems = existing.filter((item) => !messageIds.has(item.info.id))
  if (nextItems.length === existing.length) return optimisticBySessionId
  const nextOptimistic = { ...optimisticBySessionId }
  if (nextItems.length) nextOptimistic[sessionId] = nextItems
  else delete nextOptimistic[sessionId]
  return nextOptimistic
}

const upsertPendingOptimisticItem = (
  optimisticBySessionId: SessionViewState['optimisticBySessionId'],
  sessionId: string,
  item: AssistantTranscriptItem,
) => {
  const existing = optimisticBySessionId[sessionId] ?? []
  const nextItems = existing.some((entry) => entry.info.id === item.info.id)
    ? existing.map((entry) => (entry.info.id === item.info.id ? item : entry))
    : [...existing, item]
  return {
    ...optimisticBySessionId,
    [sessionId]: nextItems,
  }
}

const dedupeMessageInfos = (messages: AssistantTranscriptMessageInfo[]) => {
  const seen = new Set<string>()
  return messages.filter((message) => {
    if (seen.has(message.id)) return false
    seen.add(message.id)
    return true
  })
}

const canonicalTranscriptItem = (item: AssistantTranscriptItem): AssistantTranscriptItem => {
  return {
    info: withoutOptimisticFlag(item.info),
    parts: item.parts.map((part, index) => normalizePartForMessage(item.info.id, part, index)),
  }
}

const hasParts = (current: AssistantTranscriptPart[] | undefined, expected: AssistantTranscriptPart[]) => {
  if (!current) return expected.length === 0
  return expected.every((part) => current.some((candidate) => candidate.id === part.id))
}

const normalizeTranscriptText = (value: string) => value.replace(/\s+/g, ' ').trim()

const textForItem = (item: AssistantTranscriptItem, partsByMessageId: Record<string, AssistantTranscriptPart[]>) => {
  const content = normalizeTranscriptText(item.info.content ?? '')
  if (content) return content
  return normalizeTranscriptText(
    (partsByMessageId[item.info.id] ?? item.parts)
      .filter((part): part is Extract<AssistantTranscriptPart, { type: 'text' }> => part.type === 'text')
      .map((part) => part.text)
      .join(''),
  )
}

const isPlausibleEchoTime = (optimisticCreatedAt?: string, canonicalCreatedAt?: string) => {
  if (!optimisticCreatedAt || !canonicalCreatedAt) return true
  const optimisticTime = Date.parse(optimisticCreatedAt)
  const canonicalTime = Date.parse(canonicalCreatedAt)
  if (!Number.isFinite(optimisticTime) || !Number.isFinite(canonicalTime)) return true
  return canonicalTime >= optimisticTime - 5 * 60 * 1000
}

const matchingCanonicalEchoId = (
  optimistic: AssistantTranscriptItem,
  pageItems: AssistantTranscriptItem[],
  partsByMessageId: Record<string, AssistantTranscriptPart[]>,
  usedEchoIds: Set<string>,
) => {
  if (optimistic.info.role !== 'user') return undefined
  const optimisticText = textForItem(optimistic, partsByMessageId)
  if (!optimisticText) return undefined

  for (let index = pageItems.length - 1; index >= 0; index -= 1) {
    const candidate = pageItems[index]
    if (usedEchoIds.has(candidate.info.id)) continue
    if (candidate.info.id === optimistic.info.id) continue
    if (candidate.info.role !== 'user') continue
    if (!isPlausibleEchoTime(optimistic.info.createdAt, candidate.info.createdAt)) continue
    if (textForItem(candidate, partsByMessageId) === optimisticText) return candidate.info.id
  }
  return undefined
}

const mergeParts = (
  current: AssistantTranscriptPart[] | undefined,
  incoming: AssistantTranscriptPart[],
) => incoming.reduce((parts, part) => upsertPart(parts, part), current ?? [])

const mergePendingOptimisticItems = ({
  sessionId,
  pageItems,
  pageItemIds,
  messages,
  partsByMessageId,
  optimisticBySessionId,
}: {
  sessionId: string
  pageItems: AssistantTranscriptItem[]
  pageItemIds: Set<string>
  messages: AssistantTranscriptMessageInfo[]
  partsByMessageId: Record<string, AssistantTranscriptPart[]>
  optimisticBySessionId: SessionViewState['optimisticBySessionId']
}) => {
  const pending = optimisticBySessionId[sessionId] ?? []
  if (!pending.length) return { messages, partsByMessageId, optimisticBySessionId }

  let nextMessages = messages
  let nextPartsByMessageId = partsByMessageId
  let nextOptimisticBySessionId = optimisticBySessionId
  const usedEchoIds = new Set<string>()

  for (const item of pending) {
    const parts = item.parts.map((part, index) => normalizePartForMessage(item.info.id, part, index))
    const pageHasMessage = pageItemIds.has(item.info.id)
    const existingIndex = nextMessages.findIndex((message) => message.id === item.info.id)

    if (pageHasMessage && hasParts(nextPartsByMessageId[item.info.id], parts)) {
      nextOptimisticBySessionId = removePendingOptimisticMessages(
        nextOptimisticBySessionId,
        sessionId,
        new Set([item.info.id]),
      )
      continue
    }

    const echoId = matchingCanonicalEchoId(item, pageItems, nextPartsByMessageId, usedEchoIds)
    if (echoId) {
      usedEchoIds.add(echoId)
      nextOptimisticBySessionId = removePendingOptimisticMessages(
        nextOptimisticBySessionId,
        sessionId,
        new Set([item.info.id]),
      )
      continue
    }

    if (pageHasMessage) {
      nextPartsByMessageId = {
        ...nextPartsByMessageId,
        [item.info.id]: mergeParts(nextPartsByMessageId[item.info.id], parts),
      }
      continue
    }

    if (existingIndex === -1) {
      const insertIndex = sortedInsertIndex(nextMessages, item.info.id, (message) => message.id)
      nextMessages = [
        ...nextMessages.slice(0, insertIndex),
        { ...item.info, optimistic: true },
        ...nextMessages.slice(insertIndex),
      ]
    } else if (!nextMessages[existingIndex].optimistic) {
      nextMessages = nextMessages.map((message, messageIndex) =>
        messageIndex === existingIndex ? { ...message, optimistic: true } : message,
      )
    }

    nextPartsByMessageId = {
      ...nextPartsByMessageId,
      [item.info.id]: mergeParts(nextPartsByMessageId[item.info.id], parts),
    }
  }

  return { messages: nextMessages, partsByMessageId: nextPartsByMessageId, optimisticBySessionId: nextOptimisticBySessionId }
}

const replaceTranscriptSnapshot = (
  state: SessionViewState,
  sessionId: string,
  page: AssistantTranscriptPage,
): SessionViewState => {
  const { mode } = page
  const items = page.items.map(canonicalTranscriptItem)
  const previousMessageIds = new Set((state.messagesBySessionId[sessionId] ?? []).map((message) => message.id))
  const nextPartsByMessageId = { ...state.partsByMessageId }
  if (mode === 'replace') {
    for (const messageId of previousMessageIds) delete nextPartsByMessageId[messageId]
  }
  for (const item of items) {
    nextPartsByMessageId[item.info.id] = item.parts.map((part, index) =>
      normalizePartForMessage(item.info.id, part, index),
    )
  }

  const currentMessages = state.messagesBySessionId[sessionId] ?? []
  const nextMessages = mode === 'prepend'
    ? dedupeMessageInfos([...items.map((item) => item.info), ...currentMessages])
    : items.map((item) => item.info)
  const nextState = mode === 'replace' ? clearLiveUnkeyed(state, sessionId) : state
  const merged = mergePendingOptimisticItems({
    sessionId,
    pageItems: items,
    pageItemIds: new Set(items.map((item) => item.info.id)),
    messages: nextMessages,
    partsByMessageId: nextPartsByMessageId,
    optimisticBySessionId: nextState.optimisticBySessionId,
  })

  return {
    ...nextState,
    messagesBySessionId: {
      ...nextState.messagesBySessionId,
      [sessionId]: merged.messages,
    },
    partsByMessageId: merged.partsByMessageId,
    optimisticBySessionId: merged.optimisticBySessionId,
    historyBySessionId: {
      ...nextState.historyBySessionId,
      [sessionId]: {
        cursor: page.cursor,
        complete: page.complete,
      },
    },
  }
}

const upsertTranscriptMessage = (
  state: SessionViewState,
  sessionId: string,
  info: AssistantTranscriptMessageInfo,
  parts: AssistantTranscriptPart[] = [],
  index?: number,
): SessionViewState => {
  const existingMessages = state.messagesBySessionId[sessionId] ?? []
  const nextPartsByMessageId = { ...state.partsByMessageId }
  if (parts.length) {
    nextPartsByMessageId[info.id] = parts.reduce(
      (current, part, partIndex) => upsertPart(current, part, partIndex),
      nextPartsByMessageId[info.id] ?? [],
    )
  }

  return {
    ...state,
    messagesBySessionId: {
      ...state.messagesBySessionId,
      [sessionId]: upsertMessageInfo(existingMessages, info, index),
    },
    partsByMessageId: nextPartsByMessageId,
  }
}

const upsertTranscriptPart = (
  state: SessionViewState,
  _sessionId: string,
  part: AssistantTranscriptPart,
  index?: number,
): SessionViewState => {
  return {
    ...state,
    partsByMessageId: {
      ...state.partsByMessageId,
      [part.messageId]: upsertPart(state.partsByMessageId[part.messageId], part, index),
    },
  }
}

const appendTranscriptPartDelta = (
  state: SessionViewState,
  _sessionId: string,
  messageId: string,
  partId: string,
  partType: 'text' | 'thinking',
  delta: string,
  raw?: unknown,
): SessionViewState => {
  return {
    ...state,
    partsByMessageId: {
      ...state.partsByMessageId,
      [messageId]: appendDeltaPart(state.partsByMessageId[messageId], messageId, partId, partType, delta, raw),
    },
  }
}

const appendLiveUnkeyed = (
  state: SessionViewState,
  sessionId: string,
  content: string,
  partType: string | undefined,
  raw?: unknown,
): SessionViewState => {
  const liveMessageId = `live:${sessionId}`
  const type = partType === 'thinking' || partType === 'reasoning' ? 'thinking' : 'text'
  const partId = `${liveMessageId}:${type}`
  return {
    ...state,
    liveUnkeyedBySessionId: {
      ...state.liveUnkeyedBySessionId,
      [sessionId]: appendDeltaPart(state.liveUnkeyedBySessionId[sessionId], liveMessageId, partId, type, content, raw),
    },
  }
}

const legacyTextPartId = (messageId: string, partType: 'text' | 'thinking') => `${messageId}:${partType}`

const legacyPartType = (event: Extract<AssistantSessionEvent, { type: 'message_part' }>) => {
  if (event.part?.type === 'thinking' || event.partType === 'reasoning') return 'thinking'
  if (event.part?.type === 'text') return 'text'
  return undefined
}

const canonicalPartFromLegacyEvent = (
  event: Extract<AssistantSessionEvent, { type: 'message_part' }>,
): AssistantTranscriptPart | null => {
  if (!event.messageId || !event.part) return null
  return normalizePartForMessage(event.messageId, event.part, 0)
}

const transcriptItemFromMessage = (message: AssistantTranscriptMessage): AssistantTranscriptItem => ({
  info: stripMessageParts(message),
  parts: partsFromMessage(message),
})

const upsertOptimisticItem = (
  state: SessionViewState,
  sessionId: string,
  item: AssistantTranscriptItem,
): SessionViewState => {
  const optimisticInfo = { ...item.info, optimistic: true }
  const optimisticItem = {
    info: optimisticInfo,
    parts: item.parts.map((part, index) => normalizePartForMessage(optimisticInfo.id, part, index)),
  }
  const existingMessages = state.messagesBySessionId[sessionId] ?? []
  const existingCanonicalMessage = existingMessages.find((message) => message.id === optimisticInfo.id && !message.optimistic)
  if (existingCanonicalMessage) return state

  return {
    ...state,
    messagesBySessionId: {
      ...state.messagesBySessionId,
      [sessionId]: upsertMessageInfo(existingMessages, optimisticInfo),
    },
    partsByMessageId: {
      ...state.partsByMessageId,
      [optimisticInfo.id]: mergeParts(state.partsByMessageId[optimisticInfo.id], optimisticItem.parts),
    },
    optimisticBySessionId: upsertPendingOptimisticItem(state.optimisticBySessionId, sessionId, optimisticItem),
  }
}

const removeOptimisticItem = (
  state: SessionViewState,
  sessionId: string,
  messageId: string,
): SessionViewState => {
  const existing = state.optimisticBySessionId[sessionId] ?? []
  const nextItems = existing.filter((item) => item.info.id !== messageId)
  const existingMessages = state.messagesBySessionId[sessionId] ?? []
  const message = existingMessages.find((item) => item.id === messageId)
  if (nextItems.length === existing.length && !message?.optimistic) return state

  const nextOptimistic = { ...state.optimisticBySessionId }
  if (nextItems.length) nextOptimistic[sessionId] = nextItems
  else delete nextOptimistic[sessionId]

  if (!message?.optimistic) return { ...state, optimisticBySessionId: nextOptimistic }

  const nextPartsByMessageId = { ...state.partsByMessageId }
  delete nextPartsByMessageId[messageId]
  return {
    ...state,
    messagesBySessionId: {
      ...state.messagesBySessionId,
      [sessionId]: existingMessages.filter((item) => item.id !== messageId),
    },
    partsByMessageId: nextPartsByMessageId,
    optimisticBySessionId: nextOptimistic,
  }
}

const upsertToolEvent = (
  tools: AssistantToolEvent[],
  tool: AssistantToolEvent,
) => [...tools.filter((item) => item.id !== tool.id), tool]

export const selectTranscriptItems = (
  state: SessionViewState,
  sessionId: string,
): AssistantTranscriptItem[] => {
  return (state.messagesBySessionId[sessionId] ?? []).map((info) => ({
    info,
    parts: state.partsByMessageId[info.id] ?? [],
  }))
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

  if (event.type === 'transcript_snapshot') {
    return replaceTranscriptSnapshot(state, event.sessionId, {
      items: event.items,
      cursor: event.cursor,
      complete: event.complete ?? true,
      mode: event.mode ?? 'replace',
    })
  }

  if (event.type === 'transcript_optimistic_add') {
    return upsertOptimisticItem(state, event.sessionId, event.item)
  }

  if (event.type === 'transcript_optimistic_remove') {
    return removeOptimisticItem(state, event.sessionId, event.messageId)
  }

  if (event.type === 'transcript_message_upsert') {
    return upsertTranscriptMessage(state, event.sessionId, event.info, [], event.index)
  }

  if (event.type === 'transcript_message_remove') {
    const messages = state.messagesBySessionId[event.sessionId] ?? []
    const nextPartsByMessageId = { ...state.partsByMessageId }
    delete nextPartsByMessageId[event.messageId]
    return {
      ...clearLiveUnkeyed(state, event.sessionId),
      messagesBySessionId: {
        ...state.messagesBySessionId,
        [event.sessionId]: messages.filter((message) => message.id !== event.messageId),
      },
      partsByMessageId: nextPartsByMessageId,
    }
  }

  if (event.type === 'transcript_part_upsert') {
    return upsertTranscriptPart(state, event.sessionId, event.part, event.index)
  }

  if (event.type === 'transcript_part_delta') {
    return appendTranscriptPartDelta(
      state,
      event.sessionId,
      event.messageId,
      event.partId,
      event.partType,
      event.delta,
      event.raw,
    )
  }

  if (event.type === 'transcript_part_remove') {
    const current = state.partsByMessageId[event.messageId] ?? []
    return {
      ...clearLiveUnkeyed(state, event.sessionId),
      partsByMessageId: {
        ...state.partsByMessageId,
        [event.messageId]: current.filter((part) => part.id !== event.partId),
      },
    }
  }

  if (event.type === 'transcript_unkeyed_delta') {
    return appendLiveUnkeyed(state, event.sessionId, event.content, event.partType, event.raw ?? event.part)
  }

  if (event.type === 'messages') {
    const items = event.messages.map(transcriptItemFromMessage)
    if (event.replace) {
      return replaceTranscriptSnapshot(state, event.sessionId, {
        items,
        complete: true,
        mode: 'replace',
      })
    }
    return items.reduce(
      (nextState, item) => upsertTranscriptMessage(nextState, event.sessionId, item.info, item.parts),
      state,
    )
  }

  if (event.type === 'message') {
    const item = transcriptItemFromMessage(event.message)
    return upsertTranscriptMessage(state, event.sessionId, item.info, item.parts)
  }

  if (event.type === 'text_delta') {
    if (!event.messageId) return appendLiveUnkeyed(state, event.sessionId, event.delta, 'text')
    return appendTranscriptPartDelta(
      state,
      event.sessionId,
      event.messageId,
      legacyTextPartId(event.messageId, 'text'),
      'text',
      event.delta,
    )
  }

  if (event.type === 'message_part') {
    if (!event.messageId) {
      return appendLiveUnkeyed(state, event.sessionId, event.content, event.partType, event.part)
    }

    const canonicalPart = canonicalPartFromLegacyEvent(event)
    if (canonicalPart && canonicalPart.type !== 'text' && canonicalPart.type !== 'thinking') {
      return upsertTranscriptPart(state, event.sessionId, canonicalPart)
    }

    const type = legacyPartType(event)
    if (!type) return state
    return appendTranscriptPartDelta(
      state,
      event.sessionId,
      event.messageId,
      event.partId ?? legacyTextPartId(event.messageId, type),
      type,
      event.content || (canonicalPart?.type === type ? canonicalPart.text : ''),
      event.part,
    )
  }

  if (event.type === 'tool') {
    const existing = state.toolsBySessionId[event.sessionId] ?? []
    return {
      ...state,
      toolsBySessionId: {
        ...state.toolsBySessionId,
        [event.sessionId]: upsertToolEvent(existing, event.tool),
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

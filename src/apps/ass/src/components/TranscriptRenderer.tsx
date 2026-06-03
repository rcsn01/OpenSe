import { Badge, Button, cn } from '@repo/ui'
import {
  CheckCircle2,
  ChevronDown,
  Clock3,
  Code2,
  FileSearch,
  FileText,
  ImageIcon,
  ListTodo,
  Pencil,
  Search,
  Terminal,
  Wrench,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { VList, type VListHandle } from 'virtua'
import type {
  AssistantTranscriptItem,
  AssistantTranscriptMessageInfo,
  AssistantTranscriptPart,
} from '../lib/assistantBridge'

type ToolCallPart = Extract<AssistantTranscriptPart, { type: 'toolCall' }>
type ToolRenderInput = {
  call?: ToolCallPart
  result?: AssistantTranscriptItem
}

type ToolRenderer = (input: ToolRenderInput) => ReactNode

const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}

const stringify = (value: unknown) => {
  if (value == null || value === '') return ''
  if (typeof value === 'string') return value
  try {
    return JSON.stringify(value, null, 2)
  } catch {
    return String(value)
  }
}

const toolTitle = (name?: string) => {
  if (!name) return 'Tool'
  return name
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}

const normalizeParts = (item: AssistantTranscriptItem): AssistantTranscriptPart[] => {
  if (item.parts.length) return item.parts
  if (item.info.content) {
    return [{ id: `${item.info.id}:content`, messageId: item.info.id, type: 'text', text: item.info.content }]
  }
  return []
}

const resultInfo = (result?: AssistantTranscriptItem) => result?.info

const statusForTool = (call?: ToolCallPart, result?: AssistantTranscriptItem) => {
  const info = resultInfo(result)
  if (info?.status === 'error') return 'error'
  if (info) return 'complete'
  return call?.status ?? 'running'
}

const MarkdownText = ({ text, inverse = false }: { text: string; inverse?: boolean }) => {
  const blocks = text.split(/\n{2,}/)
  return (
    <div className={cn('space-y-2 break-words', inverse ? 'text-current' : 'text-[var(--color-foreground)]')}>
      {blocks.map((block, blockIndex) => {
        const lines = block.split('\n')
        const first = lines[0] ?? ''
        if (first.startsWith('```')) {
          const body = lines.slice(1, lines.at(-1)?.startsWith('```') ? -1 : undefined).join('\n')
          return (
            <pre
              key={blockIndex}
              className={cn(
                'm-0 overflow-x-auto rounded-[var(--radius-sm)] border px-2 py-1.5 font-mono text-xs leading-5',
                inverse
                  ? 'border-white/30 bg-black/15 text-current'
                  : 'border-[var(--color-border)] bg-[var(--color-muted)] text-[var(--color-foreground)]',
              )}
            >
              {body}
            </pre>
          )
        }

        const bulletLines = lines.filter((line) => /^[-*]\s+/.test(line))
        if (bulletLines.length === lines.length) {
          return (
            <ul key={blockIndex} className="list-disc space-y-1 pl-5">
              {bulletLines.map((line, lineIndex) => (
                <li key={lineIndex}>{line.replace(/^[-*]\s+/, '')}</li>
              ))}
            </ul>
          )
        }

        return <p key={blockIndex} className="m-0 whitespace-pre-wrap">{block}</p>
      })}
    </div>
  )
}

const JsonDetails = ({ title, value }: { title: string; value: unknown }) => {
  const text = stringify(value)
  if (!text) return null
  return (
    <details className="group mt-2">
      <summary className="flex cursor-pointer list-none items-center gap-1 text-xs font-medium text-[var(--color-muted-foreground)]">
        <ChevronDown className="h-3.5 w-3.5 transition group-open:rotate-180" />
        {title}
      </summary>
      <pre className="mt-1 max-h-64 overflow-auto rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-background)] p-2 font-mono text-[11px] leading-5 text-[var(--color-muted-foreground)]">
        {text}
      </pre>
    </details>
  )
}

const ToolFrame = ({
  icon,
  title,
  status,
  children,
}: {
  icon: ReactNode
  title: string
  status?: string
  children?: ReactNode
}) => (
  <section className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-muted)] px-3 py-2 text-sm">
    <div className="flex min-w-0 flex-wrap items-center gap-2">
      <span className="shrink-0 text-[var(--color-muted-foreground)]">{icon}</span>
      <span className="min-w-0 flex-1 truncate font-medium text-[var(--color-foreground)]">{title}</span>
      {status ? <Badge>{status}</Badge> : null}
    </div>
    {children ? <div className="mt-2">{children}</div> : null}
  </section>
)

const extractTodos = (value: unknown) => {
  const record = asRecord(value)
  const todos = Array.isArray(record.todos) ? record.todos : []
  return todos.flatMap((item, index) => {
    const todo = asRecord(item)
    const content = String(todo.content ?? todo.text ?? todo.title ?? '').trim()
    if (!content) return []
    return [{
      id: String(todo.id ?? index + 1),
      content,
      status: String(todo.status ?? (todo.done === true ? 'completed' : 'pending')),
      explanation: typeof todo.explanation === 'string' ? todo.explanation : undefined,
    }]
  })
}

const TodoToolRenderer: ToolRenderer = ({ call, result }) => {
  const info = resultInfo(result)
  const resultTodos = extractTodos(info?.details)
  const todos = resultTodos.length ? resultTodos : extractTodos(call?.arguments)
  return (
    <ToolFrame icon={<ListTodo className="h-4 w-4" />} title="Todo" status={statusForTool(call, result)}>
      {todos.length ? (
        <div className="space-y-1.5">
          {todos.map((todo) => (
            <div key={todo.id} className="flex items-start gap-2 text-xs">
              {todo.status === 'completed' ? (
                <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--color-success)]" />
              ) : todo.status === 'in_progress' ? (
                <Clock3 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--color-primary)]" />
              ) : (
                <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--color-muted-foreground)]" />
              )}
              <span className="min-w-0 flex-1">
                <span className="block break-words text-[var(--color-foreground)]">{todo.content}</span>
                {todo.explanation ? (
                  <span className="block break-words text-[var(--color-muted-foreground)]">{todo.explanation}</span>
                ) : null}
              </span>
              <Badge>{todo.status}</Badge>
            </div>
          ))}
        </div>
      ) : null}
      {!todos.length && info?.content ? <MarkdownText text={info.content} /> : null}
      {!todos.length ? <JsonDetails title="Arguments" value={call?.arguments} /> : null}
    </ToolFrame>
  )
}

const BashToolRenderer: ToolRenderer = ({ call, result }) => {
  const info = resultInfo(result)
  const args = asRecord(call?.arguments)
  const command = String(args.command ?? args.cmd ?? info?.toolName ?? '').trim()
  const output = info?.content || stringify(asRecord(info?.raw).output)
  return (
    <ToolFrame icon={<Terminal className="h-4 w-4" />} title={command || 'Bash'} status={statusForTool(call, result)}>
      {command ? <pre className="m-0 whitespace-pre-wrap font-mono text-xs text-[var(--color-foreground)]">$ {command}</pre> : null}
      {output ? (
        <pre className="mt-2 max-h-80 overflow-auto whitespace-pre-wrap rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-background)] p-2 font-mono text-xs text-[var(--color-muted-foreground)]">
          {output}
        </pre>
      ) : null}
      <JsonDetails title="Arguments" value={call?.arguments} />
    </ToolFrame>
  )
}

const FileToolRenderer = (icon: ReactNode, label: string): ToolRenderer => ({ call, result }) => {
  const info = resultInfo(result)
  const args = asRecord(call?.arguments)
  const file = String(args.file ?? args.path ?? args.pattern ?? args.query ?? '').trim()
  return (
    <ToolFrame icon={icon} title={file ? `${label}: ${file}` : label} status={statusForTool(call, result)}>
      {info?.content ? <MarkdownText text={info.content} /> : null}
      <JsonDetails title="Arguments" value={call?.arguments} />
    </ToolFrame>
  )
}

const GenericToolRenderer: ToolRenderer = ({ call, result }) => {
  const info = resultInfo(result)
  return (
    <ToolFrame
      icon={<Wrench className="h-4 w-4" />}
      title={toolTitle(call?.name ?? info?.toolName)}
      status={statusForTool(call, result)}
    >
      {info?.content ? <MarkdownText text={info.content} /> : null}
      <JsonDetails title="Arguments" value={call?.arguments} />
      <JsonDetails title="Result" value={info?.details ?? info?.raw} />
    </ToolFrame>
  )
}

const toolRenderers: Record<string, ToolRenderer> = {
  todo: TodoToolRenderer,
  bash: BashToolRenderer,
  read: FileToolRenderer(<FileText className="h-4 w-4" />, 'Read'),
  write: FileToolRenderer(<Pencil className="h-4 w-4" />, 'Write'),
  edit: FileToolRenderer(<Pencil className="h-4 w-4" />, 'Edit'),
  grep: FileToolRenderer(<Search className="h-4 w-4" />, 'Grep'),
  find: FileToolRenderer(<FileSearch className="h-4 w-4" />, 'Find'),
  ls: FileToolRenderer(<FileText className="h-4 w-4" />, 'List'),
}

const renderTool = (input: ToolRenderInput) => {
  const name = String(input.call?.name ?? resultInfo(input.result)?.toolName ?? 'tool').toLowerCase()
  return (toolRenderers[name] ?? GenericToolRenderer)(input)
}

const UnknownPart = ({ part }: { part: Extract<AssistantTranscriptPart, { type: 'unknown' }> }) => {
  const label = part.label?.toLowerCase().includes('skill') ? 'Skill invocation' : toolTitle(part.label ?? 'Unknown part')
  return (
    <ToolFrame icon={<Code2 className="h-4 w-4" />} title={label}>
      <JsonDetails title="Details" value={part.value} />
    </ToolFrame>
  )
}

const ImagePart = ({ part }: { part: Extract<AssistantTranscriptPart, { type: 'image' }> }) => {
  const src = part.url ?? (part.data && part.mimeType ? `data:${part.mimeType};base64,${part.data}` : undefined)
  if (!src) {
    return (
      <ToolFrame icon={<ImageIcon className="h-4 w-4" />} title="Image">
        <JsonDetails title="Details" value={part.raw} />
      </ToolFrame>
    )
  }
  return <img src={src} alt={part.alt ?? 'Message image'} className="max-h-96 rounded-[var(--radius-md)] border border-[var(--color-border)] object-contain" />
}

const RoleCard = ({ info }: { info: AssistantTranscriptMessageInfo }) => {
  const record = asRecord(info.raw)
  const roleLabels: Record<string, string> = {
    bashExecution: 'Bash execution',
    custom: 'Custom message',
    branchSummary: 'Branch summary',
    compactionSummary: 'Compaction summary',
    system: 'System',
  }
  const title = roleLabels[info.role] ?? toolTitle(info.role)
  const command = String(record.command ?? record.cmd ?? '').trim()
  const output = String(record.output ?? info.content ?? '').trim()

  if (info.role === 'bashExecution') {
    return (
      <ToolFrame icon={<Terminal className="h-4 w-4" />} title={command || title} status={info.status}>
        {command ? <pre className="m-0 whitespace-pre-wrap font-mono text-xs text-[var(--color-foreground)]">$ {command}</pre> : null}
        {output ? (
          <pre className="mt-2 max-h-80 overflow-auto whitespace-pre-wrap rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-background)] p-2 font-mono text-xs text-[var(--color-muted-foreground)]">
            {output}
          </pre>
        ) : null}
      </ToolFrame>
    )
  }

  return (
    <ToolFrame icon={<Code2 className="h-4 w-4" />} title={title} status={info.status}>
      {info.content ? <MarkdownText text={info.content} /> : null}
      {!info.content ? <JsonDetails title="Details" value={info.raw} /> : null}
    </ToolFrame>
  )
}

const MessageParts = ({
  item,
  toolResults,
}: {
  item: AssistantTranscriptItem
  toolResults: Map<string, AssistantTranscriptItem>
}) => {
  const inverse = item.info.role === 'user'
  const parts = normalizeParts(item)
  if (!parts.length && item.info.role !== 'assistant' && item.info.role !== 'user') return <RoleCard info={item.info} />
  return (
    <div className="space-y-2">
      {parts.map((part) => {
        if (part.type === 'text') return <MarkdownText key={part.id} text={part.text} inverse={inverse} />
        if (part.type === 'thinking') {
          return (
            <div key={part.id} className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-muted)] px-3 py-2 text-xs text-[var(--color-muted-foreground)]">
              <div className="mb-1 font-medium uppercase">Thinking</div>
              <MarkdownText text={part.text} />
            </div>
          )
        }
        if (part.type === 'toolCall') {
          return <div key={part.id}>{renderTool({ call: part, result: toolResults.get(part.toolCallId ?? part.id) })}</div>
        }
        if (part.type === 'image') return <ImagePart key={part.id} part={part} />
        return <UnknownPart key={part.id} part={part} />
      })}
    </div>
  )
}

const MessageItem = ({
  item,
  toolResults,
}: {
  item: AssistantTranscriptItem
  toolResults: Map<string, AssistantTranscriptItem>
}) => {
  const isUser = item.info.role === 'user'
  const isAssistant = item.info.role === 'assistant'
  const isToolResult = item.info.role === 'toolResult' || item.info.role === 'tool'

  if (isToolResult) {
    return <div key={item.info.id}>{renderTool({ result: item })}</div>
  }

  if (!isUser && !isAssistant) {
    return <RoleCard key={item.info.id} info={item.info} />
  }

  return (
    <div key={item.info.id} className={cn('flex', isUser ? 'justify-end' : 'justify-start')}>
      <article
        className={cn(
          'max-w-[78ch] text-sm leading-6',
          isUser
            ? 'rounded-[var(--radius-md)] border border-[var(--color-primary)] bg-[var(--color-primary)] px-3 py-2 text-[var(--color-primary-foreground)]'
            : 'w-full text-[var(--color-foreground)]',
        )}
      >
        <div className="mb-1 text-[11px] font-medium uppercase text-current opacity-70">
          {item.info.role}
          {item.info.status === 'streaming' ? ' streaming' : ''}
        </div>
        <MessageParts item={item} toolResults={toolResults} />
      </article>
    </div>
  )
}

const LivePreview = ({ parts }: { parts: AssistantTranscriptPart[] }) => {
  if (!parts.length) return null
  const item: AssistantTranscriptItem = {
    info: {
      id: 'live-output',
      role: 'assistant',
      content: '',
      status: 'streaming',
    },
    parts,
  }
  return (
    <div className="flex justify-start">
      <article className="w-full max-w-[78ch] text-sm leading-6 text-[var(--color-foreground)]">
        <div className="mb-1 text-[11px] font-medium uppercase text-current opacity-70">live output</div>
        <MessageParts item={item} toolResults={new Map()} />
      </article>
    </div>
  )
}

type TranscriptRow =
  | { type: 'load-older'; key: 'load-older' }
  | { type: 'item'; key: string; item: AssistantTranscriptItem }
  | { type: 'live'; key: 'live-output'; parts: AssistantTranscriptPart[] }

const VIRTUAL_ROW_THRESHOLD = 120

const buildToolResultIndex = (items: AssistantTranscriptItem[]) => {
  const toolResults = new Map<string, AssistantTranscriptItem>()
  for (const item of items) {
    if ((item.info.role === 'toolResult' || item.info.role === 'tool') && item.info.toolCallId) {
      toolResults.set(item.info.toolCallId, item)
    }
  }
  return toolResults
}

const buildPairedToolResultIds = (
  items: AssistantTranscriptItem[],
  toolResults: Map<string, AssistantTranscriptItem>,
) => {
  const pairedResultIds = new Set<string>()
  for (const item of items) {
    for (const part of normalizeParts(item)) {
      if (part.type !== 'toolCall') continue
      const result = toolResults.get(part.toolCallId ?? part.id)
      if (result) pairedResultIds.add(result.info.id)
    }
  }
  return pairedResultIds
}

const buildTranscriptRows = ({
  items,
  liveParts,
  pairedResultIds,
  canLoadOlder,
}: {
  items: AssistantTranscriptItem[]
  liveParts: AssistantTranscriptPart[]
  pairedResultIds: Set<string>
  canLoadOlder: boolean
}): TranscriptRow[] => {
  const rows: TranscriptRow[] = canLoadOlder ? [{ type: 'load-older', key: 'load-older' }] : []

  for (const item of items) {
    if (pairedResultIds.has(item.info.id)) continue
    rows.push({ type: 'item', key: `item:${item.info.id}`, item })
  }

  if (liveParts.length) rows.push({ type: 'live', key: 'live-output', parts: liveParts })
  return rows
}

const LoadOlderRow = ({
  loading,
  onLoadOlder,
}: {
  loading?: boolean
  onLoadOlder?: () => void
}) => (
  <div className="flex justify-center py-2">
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={loading}
      onClick={onLoadOlder}
    >
      {loading ? 'Loading...' : 'Load older'}
    </Button>
  </div>
)

const TranscriptRowContent = ({
  row,
  loadingOlder,
  onLoadOlder,
  toolResults,
}: {
  row: TranscriptRow
  loadingOlder?: boolean
  onLoadOlder?: () => void
  toolResults: Map<string, AssistantTranscriptItem>
}) => (
  <div className="pb-3">
    {row.type === 'load-older' ? (
      <LoadOlderRow loading={loadingOlder} onLoadOlder={onLoadOlder} />
    ) : row.type === 'live' ? (
      <LivePreview parts={row.parts} />
    ) : (
      <MessageItem item={row.item} toolResults={toolResults} />
    )}
  </div>
)

export const TranscriptRenderer = ({
  items,
  liveParts = [],
  canLoadOlder = false,
  loadingOlder = false,
  onLoadOlder,
}: {
  items: AssistantTranscriptItem[]
  liveParts?: AssistantTranscriptPart[]
  canLoadOlder?: boolean
  loadingOlder?: boolean
  onLoadOlder?: () => void
}) => {
  const listRef = useRef<VListHandle | null>(null)
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const [isPinned, setIsPinned] = useState(true)
  const toolResults = useMemo(() => buildToolResultIndex(items), [items])
  const pairedResultIds = useMemo(() => buildPairedToolResultIds(items, toolResults), [items, toolResults])
  const rows = useMemo(
    () => buildTranscriptRows({ items, liveParts, pairedResultIds, canLoadOlder }),
    [canLoadOlder, items, liveParts, pairedResultIds],
  )
  const shouldVirtualize = rows.length > VIRTUAL_ROW_THRESHOLD
  const keepMounted = useMemo(
    () => (shouldVirtualize && rows.length <= 200 ? rows.map((_, index) => index) : undefined),
    [rows, shouldVirtualize],
  )
  const rowKeySignature = rows.map((row) => row.key).join('|')

  const nearBottom = useCallback(() => {
    if (!shouldVirtualize) {
      const element = scrollRef.current
      if (!element) return true
      return element.scrollHeight - element.clientHeight - element.scrollTop < 80
    }
    const list = listRef.current
    if (!list) return true
    return list.scrollSize - list.viewportSize - list.scrollOffset < 80
  }, [shouldVirtualize])

  const scrollToBottom = useCallback(() => {
    if (!shouldVirtualize) {
      const element = scrollRef.current
      if (!element) return
      element.scrollTop = element.scrollHeight
      return
    }
    const list = listRef.current
    if (!list || rows.length === 0) return
    list.scrollToIndex(rows.length - 1, { align: 'end' })
  }, [rows.length, shouldVirtualize])

  useEffect(() => {
    if (!isPinned) return
    scrollToBottom()
    if (typeof window.requestAnimationFrame === 'function') {
      const frame = window.requestAnimationFrame(scrollToBottom)
      return () => window.cancelAnimationFrame(frame)
    }
  }, [isPinned, rowKeySignature, items, liveParts, scrollToBottom])

  return (
    <div className="relative h-full min-h-0">
      {shouldVirtualize ? (
        <VList
          ref={listRef}
          data={rows}
          className="h-full"
          shift
          bufferSize={640}
          itemSize={96}
          ssrCount={Math.min(rows.length, 50)}
          keepMounted={keepMounted}
          onScroll={() => setIsPinned(nearBottom())}
        >
          {(row) => (
            <TranscriptRowContent
              key={row.key}
              row={row}
              loadingOlder={loadingOlder}
              onLoadOlder={onLoadOlder}
              toolResults={toolResults}
            />
          )}
        </VList>
      ) : (
        <div
          ref={scrollRef}
          className="h-full overflow-y-auto pr-1"
          onScroll={() => setIsPinned(nearBottom())}
        >
          <div className="min-h-full">
            {rows.map((row) => (
              <TranscriptRowContent
                key={row.key}
                row={row}
                loadingOlder={loadingOlder}
                onLoadOlder={onLoadOlder}
                toolResults={toolResults}
              />
            ))}
          </div>
        </div>
      )}
      {!isPinned ? (
        <Button
          type="button"
          size="sm"
          className="absolute bottom-3 right-3 shadow-sm"
          onClick={() => {
            setIsPinned(true)
            scrollToBottom()
          }}
        >
          Jump to latest
        </Button>
      ) : null}
    </div>
  )
}

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { ArrowUpDown, ChevronDown, Circle, ListFilter, Plus, Search, SlidersHorizontal, TableProperties } from 'lucide-react'
import { toast } from 'sonner'
import { useUpdateIssue } from '../../hooks/queries/useIssues'
import type { Issue } from '../../types'
import { formatShortDate } from '../../lib/dateFormatting'
import { getOpenKbItemColor, getOpenKbTextColorForBackground } from '../../lib/openKbColors'
import { getProjectIssuePath } from '../../lib/projectRoutes'
import type { buildBoardColumns } from '../../lib/issueViews'
import {
  applyBoardDrop,
  findIssueInColumns,
  resolveBoardDrop,
  type BoardColumn,
} from '../../lib/boardDragUtils'

const issueLabel = (issue: Issue, index: number) => issue.project?.name || ['Project Management', 'Design Transfer', 'Manufacturing', 'Validation', 'QA/RA'][index % 5]

const CompactAvatar = ({ value, tone = '#58c4d8' }: { value: string; tone?: string }) => (
  <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold" style={{ backgroundColor: tone, color: getOpenKbTextColorForBackground(tone) }}>
    {value
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join('')
      .toUpperCase() || 'U'}
  </span>
)

const ProjectTaskToolbar = ({
  label = 'Add task',
  onCreateIssue,
}: {
  label?: string
  onCreateIssue: () => void
}) => (
  <div className="flex h-14 shrink-0 items-center justify-between border-b border-[var(--color-border)] px-4">
    <div className="flex items-center gap-0">
      <button
        type="button"
        onClick={onCreateIssue}
        className="inline-flex h-8 items-center gap-2 rounded-l-[var(--radius-md)] border border-[var(--color-border)] px-3 text-sm font-medium hover:bg-[var(--color-muted)]"
      >
        <Plus className="h-4 w-4" />
        {label}
      </button>
      <button
        type="button"
        className="inline-flex h-8 w-8 items-center justify-center rounded-r-[var(--radius-md)] border border-l-0 border-[var(--color-border)] hover:bg-[var(--color-muted)]"
        aria-label={`${label} options`}
      >
        <ChevronDown className="h-4 w-4" />
      </button>
    </div>
    <div className="flex items-center gap-5 text-xs font-medium text-[var(--color-muted-foreground)]">
      <button type="button" className="inline-flex items-center gap-1.5 hover:text-[var(--color-foreground)]">
        <ListFilter className="h-3.5 w-3.5" />
        Filter
      </button>
      <button type="button" className="inline-flex items-center gap-1.5 hover:text-[var(--color-foreground)]">
        <ArrowUpDown className="h-3.5 w-3.5" />
        Sort
      </button>
      <button type="button" className="inline-flex items-center gap-1.5 hover:text-[var(--color-foreground)]">
        <TableProperties className="h-3.5 w-3.5" />
        Group
      </button>
      <button type="button" className="inline-flex items-center gap-1.5 hover:text-[var(--color-foreground)]">
        <SlidersHorizontal className="h-3.5 w-3.5" />
        Options
      </button>
      <button type="button" className="inline-flex items-center hover:text-[var(--color-foreground)]" aria-label="Search tasks">
        <Search className="h-4 w-4" />
      </button>
    </div>
  </div>
)

const ProjectBoardCardContent = ({
  issue,
  index,
  dragging = false,
}: {
  issue: Issue
  index: number
  dragging?: boolean
}) => {
  const label = issueLabel(issue, index)
  const labelColor = getOpenKbItemColor(`label:${label}`)
  const avatarColor = getOpenKbItemColor(`profile:${issue.updated_by || issue.created_by || 'user'}`)
  const range = issue.start_date || issue.target_date
    ? `${formatShortDate(issue.start_date ?? issue.created_at.slice(0, 10))}${issue.target_date ? ` - ${formatShortDate(issue.target_date)}` : ''}`
    : formatShortDate(issue.created_at.slice(0, 10))

  return (
    <div
      className={`block rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-background)] p-4 shadow-[0_1px_2px_rgba(15,23,42,0.08)] hover:border-[#7aa7ff] ${dragging ? 'opacity-60' : ''}`}
    >
      <div className="flex items-start gap-2">
        <Circle className="mt-0.5 h-4 w-4 text-[#96a09d]" />
        <h3 className="line-clamp-2 text-sm font-semibold leading-5">{issue.title}</h3>
      </div>
      <div className="mt-4">
        <span className="inline-flex rounded-[4px] px-1.5 py-0.5 text-xs font-medium" style={{ backgroundColor: labelColor, color: getOpenKbTextColorForBackground(labelColor) }}>
          {label}
        </span>
      </div>
      <div className="mt-5 flex items-center gap-3 text-xs text-[var(--color-muted-foreground)]">
        <CompactAvatar value={issue.updated_by || issue.created_by || 'User'} tone={avatarColor} />
        <span className={issue.priority === 'urgent' || issue.priority === 'high' ? 'font-medium text-rose-600' : ''}>{range}</span>
      </div>
    </div>
  )
}

const ProjectBoardCard = ({
  issue,
  index,
  projectId,
  canEdit,
}: {
  issue: Issue
  index: number
  projectId: string
  canEdit: boolean
}) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: issue.id,
    disabled: !canEdit,
  })

  const style = transform ? { transform: CSS.Translate.toString(transform) } : undefined

  return (
    <div ref={setNodeRef} style={style} className={isDragging ? 'opacity-40' : undefined}>
      <Link
        to={getProjectIssuePath(projectId, issue.id)}
        className="block"
        {...(canEdit ? { ...attributes, ...listeners } : {})}
      >
        <ProjectBoardCardContent issue={issue} index={index} dragging={isDragging} />
      </Link>
    </div>
  )
}

const ProjectBoardColumn = ({
  column,
  projectId,
  canEdit,
  onCreateIssue,
}: {
  column: BoardColumn
  projectId: string
  canEdit: boolean
  onCreateIssue: () => void
}) => {
  const { setNodeRef, isOver } = useDroppable({ id: column.id })

  return (
    <section className="flex min-h-[32rem] flex-col rounded-[var(--radius-md)] bg-[#f4f5f6]">
      <div className="flex h-12 shrink-0 items-center gap-3 rounded-t-[var(--radius-md)] bg-[#eef0f2] px-3">
        <h2 className="truncate text-base font-semibold">{column.title}</h2>
        <span className="text-sm font-semibold text-[var(--color-muted-foreground)]">{column.issues.length}</span>
      </div>
      <div
        ref={setNodeRef}
        className={`flex flex-1 flex-col gap-2 overflow-y-auto p-3 transition-colors ${isOver ? 'bg-[#e8edf8]' : ''}`}
      >
        {column.issues.length === 0 ? (
          <button type="button" onClick={onCreateIssue} className="flex h-14 items-center rounded-[var(--radius-md)] bg-[#eef0f2] px-4 text-sm font-medium text-[var(--color-muted-foreground)] hover:bg-[#e7e9ec]">
            <Plus className="mr-2 h-4 w-4" />
            Add task
          </button>
        ) : column.issues.map((issue, index) => (
          <ProjectBoardCard key={issue.id} issue={issue} index={index} projectId={projectId} canEdit={canEdit} />
        ))}
        {column.issues.length > 0 ? (
          <button type="button" onClick={onCreateIssue} className="mt-1 px-4 py-2 text-left text-sm font-medium text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]">
            + Add task
          </button>
        ) : null}
      </div>
    </section>
  )
}

export const ProjectBoardView = ({
  organisationId,
  projectId,
  columns,
  canEdit,
  onCreateIssue,
}: {
  organisationId: string
  projectId: string
  columns: ReturnType<typeof buildBoardColumns>
  canEdit: boolean
  onCreateIssue: () => void
}) => {
  const updateIssue = useUpdateIssue()
  const [boardColumns, setBoardColumns] = useState(columns)
  const [activeIssueId, setActiveIssueId] = useState<string | null>(null)

  useEffect(() => {
    setBoardColumns(columns)
  }, [columns])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 8 } }),
  )

  const activeIssue = useMemo(() => {
    if (!activeIssueId) return null
    return findIssueInColumns(activeIssueId, boardColumns)?.issue ?? null
  }, [activeIssueId, boardColumns])

  const activeIssueIndex = useMemo(() => {
    if (!activeIssueId) return 0
    const source = findIssueInColumns(activeIssueId, boardColumns)
    if (!source) return 0
    return boardColumns.find((column) => column.id === source.columnId)?.issues.findIndex((issue) => issue.id === activeIssueId) ?? 0
  }, [activeIssueId, boardColumns])

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveIssueId(String(event.active.id))
  }, [])

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const activeId = String(event.active.id)
    const overId = event.over ? String(event.over.id) : null
    setActiveIssueId(null)

    const move = resolveBoardDrop({
      activeIssueId: activeId,
      overColumnId: overId,
      columns: boardColumns,
    })
    if (!move) return

    const previousColumns = boardColumns
    setBoardColumns(applyBoardDrop(boardColumns, move.issueId, move.nextStateId))

    try {
      await updateIssue.mutateAsync({
        id: move.issueId,
        organisation_id: organisationId,
        state_id: move.nextStateId,
      })
    } catch (error) {
      setBoardColumns(previousColumns)
      toast.error(error instanceof Error ? error.message : 'Failed to move task')
    }
  }, [boardColumns, organisationId, updateIssue])

  const handleDragCancel = useCallback(() => {
    setActiveIssueId(null)
  }, [])

  return (
    <section className="-mx-2 flex min-h-0 flex-1 flex-col bg-[var(--color-background)]">
      <ProjectTaskToolbar onCreateIssue={onCreateIssue} />
      <div className="min-h-0 flex-1 overflow-auto p-4">
        <DndContext
          sensors={sensors}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragCancel={handleDragCancel}
        >
          <div className="grid min-h-full grid-flow-col auto-cols-[19rem] gap-4">
            {boardColumns.map((column) => (
              <ProjectBoardColumn
                key={column.id}
                column={column}
                projectId={projectId}
                canEdit={canEdit}
                onCreateIssue={onCreateIssue}
              />
            ))}
          </div>
          <DragOverlay>
            {activeIssue ? (
              <div className="rotate-2 cursor-grabbing">
                <ProjectBoardCardContent issue={activeIssue} index={activeIssueIndex} dragging />
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>
    </section>
  )
}

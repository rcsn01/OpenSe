import { useMemo, useState } from 'react'
import { Badge, DataTable, type DataTableColumn } from '@repo/ui'
import { fuzzyRankings, fuzzySearchItems, normalizePageSearchTerm } from '../../lib/pageSearch'
import { formatDateTime } from '../../utils'

type ActivityEvent = {
  id: string
  actor_user_id: string | null
  event_type: string
  message: string | null
  metadata: Record<string, unknown>
  created_at: string
  profiles?: { id: string; full_name: string | null; username: string | null } | null
}

type ActivitySortField = 'timestamp' | 'user' | 'action' | 'details'

export const ActivityLogsTab = ({ logs, searchTerm = '' }: { logs: ActivityEvent[]; searchTerm?: string }) => {
  const [tablePage, setTablePage] = useState(1)
  const [tablePageSize, setTablePageSize] = useState(10)
  const [sortField, setSortField] = useState<ActivitySortField | null>(null)
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const normalizedSearchTerm = normalizePageSearchTerm(searchTerm)
  const filteredLogs = useMemo(
    () => fuzzySearchItems(logs, normalizedSearchTerm, [
      {
        key: (log) => log.event_type,
        maxRanking: fuzzyRankings.STARTS_WITH,
      },
      {
        key: (log) => log.message ?? '',
        maxRanking: fuzzyRankings.CONTAINS,
      },
      {
        key: (log) => [log.profiles?.full_name ?? '', log.profiles?.username ?? ''],
        maxRanking: fuzzyRankings.WORD_STARTS_WITH,
      },
    ]),
    [logs, normalizedSearchTerm],
  )

  const sortedLogs = useMemo(() => {
    if (!sortField) {
      return filteredLogs
    }

    const getSortValue = (log: ActivityEvent) => {
      switch (sortField) {
        case 'timestamp':
          return new Date(log.created_at).getTime()
        case 'user':
          return log.profiles?.full_name ?? log.profiles?.username ?? 'System'
        case 'action':
          return log.event_type
        case 'details':
          return log.message ?? ''
        default:
          return ''
      }
    }

    return [...filteredLogs].sort((a, b) => {
      const first = getSortValue(a)
      const second = getSortValue(b)
      const comparison = typeof first === 'number' && typeof second === 'number'
        ? first - second
        : String(first).localeCompare(String(second), undefined, { numeric: true, sensitivity: 'base' })

      return sortDirection === 'asc' ? comparison : -comparison
    })
  }, [filteredLogs, sortDirection, sortField])

  const totalPages = Math.max(1, Math.ceil(sortedLogs.length / tablePageSize))
  const activeTablePage = Math.min(tablePage, totalPages)
  const paginatedLogs = useMemo(() => {
    const startIndex = (activeTablePage - 1) * tablePageSize
    return sortedLogs.slice(startIndex, startIndex + tablePageSize)
  }, [activeTablePage, sortedLogs, tablePageSize])

  const handleSortChange = (nextSortField: ActivitySortField) => {
    if (sortField === nextSortField) {
      setSortDirection((currentDirection) => (currentDirection === 'asc' ? 'desc' : 'asc'))
      return
    }

    setSortField(nextSortField)
    setSortDirection('asc')
  }

  const activityColumns: DataTableColumn<ActivityEvent, ActivitySortField>[] = [
    {
      id: 'timestamp',
      header: 'Timestamp',
      sortKey: 'timestamp',
      width: '20%',
      renderCell: (log) => (
        <span className="whitespace-nowrap text-sm text-[var(--color-muted-foreground)]">
          {formatDateTime(log.created_at)}
        </span>
      ),
    },
    {
      id: 'user',
      header: 'User',
      sortKey: 'user',
      width: '22%',
      renderCell: (log) => (
        <span className="font-medium text-[var(--color-foreground)]">
          {log.profiles?.full_name ?? log.profiles?.username ?? 'System'}
        </span>
      ),
    },
    {
      id: 'action',
      header: 'Action',
      sortKey: 'action',
      width: '18%',
      renderCell: (log) => (
        <Badge variant="neutral">{log.event_type}</Badge>
      ),
    },
    {
      id: 'details',
      header: 'Details',
      sortKey: 'details',
      width: '40%',
      renderCell: (log) => <span className="text-sm text-[var(--color-foreground)]">{log.message ?? '-'}</span>,
    },
  ]

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <DataTable
        columns={activityColumns}
        rows={paginatedLogs}
        getRowId={(log) => log.id}
        emptyState={normalizedSearchTerm.length > 0 ? `No activity events matched "${normalizedSearchTerm}".` : 'No activity events found.'}
        className="min-h-0 flex-1"
        minTableWidth={920}
        tableLayout="fixed"
        sortField={sortField}
        sortDirection={sortDirection}
        onSortChange={handleSortChange}
        pagination={{
          currentPage: activeTablePage,
          totalPages,
          totalItems: sortedLogs.length,
          itemsPerPage: tablePageSize,
          onPageChange: setTablePage,
          onItemsPerPageChange: (nextPageSize) => {
            setTablePageSize(nextPageSize)
            setTablePage(1)
          },
        }}
      />
    </div>
  )
}

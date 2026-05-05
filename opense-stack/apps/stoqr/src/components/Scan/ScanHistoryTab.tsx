import { useMemo } from 'react'
import { useScanHistory } from '../../hooks/queries/useQuickScan'
import { fuzzyRankings, fuzzySearchItems, normalizePageSearchTerm } from '../../lib/pageSearch'

const formatHistoryTimestamp = (value: string) => {
  const date = new Date(value)
  const now = new Date()
  const sameDay = date.toDateString() === now.toDateString()
  const yesterday = new Date(now)
  yesterday.setDate(now.getDate() - 1)

  const timeLabel = date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
  if (sameDay) return `Today, ${timeLabel}`
  if (date.toDateString() === yesterday.toDateString()) return `Yesterday, ${timeLabel}`
  return `${date.toLocaleDateString()}, ${timeLabel}`
}

const getChangeTone = (change: number) => {
  if (change > 0) return 'positive'
  if (change < 0) return 'negative'
  return 'neutral'
}

const formatSignedChange = (change: number) => {
  if (change > 0) return `+${change}`
  return `${change}`
}

export const ScanHistoryTab = ({ companyId, searchTerm = '' }: { companyId: string; searchTerm?: string }) => {
  const { data = [], isLoading } = useScanHistory(companyId)
  const normalizedSearchTerm = normalizePageSearchTerm(searchTerm)
  const filteredData = useMemo(
    () => fuzzySearchItems(data, normalizedSearchTerm, [
      {
        key: (event) => event.product?.name ?? '',
        maxRanking: fuzzyRankings.WORD_STARTS_WITH,
      },
      {
        key: (event) => event.product?.sku ?? event.barcode ?? '',
        maxRanking: fuzzyRankings.STARTS_WITH,
      },
      {
        key: (event) => [event.reasonLabel, event.scan_type, event.entry_method, event.actorName],
        maxRanking: fuzzyRankings.CONTAINS,
      },
    ]),
    [data, normalizedSearchTerm],
  )

  if (isLoading) {
    return <div className="scan-history-empty">Loading scan history...</div>
  }

  if (!data.length) {
    return <div className="scan-history-empty">No scan history yet.</div>
  }

  return (
    <section className="scan-history-view" aria-label="Scan history">
      {filteredData.length === 0 ? (
        <div className="scan-history-empty">
          {normalizedSearchTerm.length > 0 ? `No scan history matched "${normalizedSearchTerm}".` : 'No scan history yet.'}
        </div>
      ) : (
        <>
          <div className="scan-history-mobile-list">
            {filteredData.map((event) => (
              <article key={event.id} className="scan-history-mobile-item">
                <div className="scan-history-mobile-copy">
                  <p className="scan-history-mobile-sku">{event.product?.sku ?? event.barcode ?? '—'}</p>
                  <h3 className="scan-history-mobile-name">{event.product?.name ?? 'Unknown item'}</h3>
                  <p className="scan-history-mobile-meta">{formatHistoryTimestamp(event.created_at)} • {event.reasonLabel}</p>
                </div>
                <div className={`scan-history-change scan-history-change--${getChangeTone(event.change)}`}>
                  {formatSignedChange(event.change)}
                </div>
              </article>
            ))}
          </div>

          <div className="scan-history-desktop-shell">
            <table className="scan-history-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>SKU</th>
                  <th>Reason</th>
                  <th>Date</th>
                  <th>Change</th>
                  <th>Stock</th>
                </tr>
              </thead>
              <tbody>
                {filteredData.map((event) => (
                  <tr key={event.id}>
                    <td>{event.product?.name ?? 'Unknown item'}</td>
                    <td>{event.product?.sku ?? event.barcode ?? '—'}</td>
                    <td>{event.reasonLabel}</td>
                    <td>{formatHistoryTimestamp(event.created_at)}</td>
                    <td className={`scan-history-change scan-history-change--${getChangeTone(event.change)}`}>
                      {formatSignedChange(event.change)}
                    </td>
                    <td>{event.stockAfter ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  )
}

import { useMemo, useState } from 'react'
import { EmptyState } from '../EmptyState'
import { formatCurrency } from '../../utils'
import { useCreateReportSchedule, useDeleteReportSchedule } from '../../hooks/queries/useReports'

const DAYS = 30

export const ValuationTab = ({
  series,
  schedules,
  companyId,
  onScheduleChange,
}: {
  series: { date: string; value: number }[]
  schedules: any[]
  companyId: string
  onScheduleChange: () => void
}) => {
  const [newSchedule, setNewSchedule] = useState({
    report_type: 'stock_valuation',
    cadence: 'weekly',
    day_of_week: 1,
    day_of_month: 1,
    time_of_day: '09:00',
    recipients: '',
  })
  const [message, setMessage] = useState<string | null>(null)
  const createScheduleMutation = useCreateReportSchedule(companyId)
  const deleteScheduleMutation = useDeleteReportSchedule(companyId)

  const handleCreateSchedule = async () => {
    setMessage(null)
    try {
      await createScheduleMutation.mutateAsync(newSchedule)
      setMessage('Schedule saved.')
      setNewSchedule((prev) => ({ ...prev, recipients: '' }))
      onScheduleChange()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Failed to save schedule')
    }
  }

  const handleDeleteSchedule = async (id: string) => {
    try {
      await deleteScheduleMutation.mutateAsync(id)
      onScheduleChange()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Failed to remove schedule')
    }
  }

  const maxValue = Math.max(...series.map((point) => point.value), 1)
  const chartPath = useMemo(() => {
    if (series.length === 0) return ''
    return series
      .map((point, index) => {
        const x = (index / (series.length - 1)) * 100
        const y = 100 - (point.value / maxValue) * 100
        return `${index === 0 ? 'M' : 'L'} ${x},${y}`
      })
      .join(' ')
  }, [series, maxValue])

  return (
    <div className="stack">
      <div className="card stack">
        <div className="flex-between">
          <div>
            <h3 className="section-title">Stock Valuation History</h3>
            <div className="muted small">Rolling {DAYS}-day inventory value based on cost price.</div>
          </div>
          <div className="pill">Current: {formatCurrency(series.at(-1)?.value ?? 0)}</div>
        </div>
        {series.length === 0 ? (
          <EmptyState title="No data" description="Create transactions to generate valuation history." />
        ) : (
          <div style={{ width: '100%', height: 240, marginTop: 16 }}>
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ width: '100%', height: '100%' }}>
              <path d={chartPath} fill="none" stroke="#2563eb" strokeWidth="2" vectorEffect="non-scaling-stroke" />
              <path d={`M 0,100 L ${chartPath} L 100,100 Z`} fill="#2563eb" fillOpacity="0.05" stroke="none" />
            </svg>
          </div>
        )}
      </div>

      <div className="card stack">
        <div className="flex-between">
          <h3 className="section-title">Report Subscriptions</h3>
          <span className="pill">{schedules.length} active</span>
        </div>
        <div className="grid grid-2">
          <div className="stack">
            <label className="stack">
              Report Type
              <select
                className="select"
                value={newSchedule.report_type}
                onChange={(e) => setNewSchedule({ ...newSchedule, report_type: e.target.value })}
              >
                <option value="stock_valuation">Stock Valuation</option>
                <option value="low_stock">Low Stock</option>
                <option value="item_flow">Item Flow</option>
              </select>
            </label>
            <div className="grid grid-2">
              <label className="stack">
                Cadence
                <select
                  className="select"
                  value={newSchedule.cadence}
                  onChange={(e) => setNewSchedule({ ...newSchedule, cadence: e.target.value })}
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </label>
              {newSchedule.cadence === 'weekly' ? (
                <label className="stack">
                  Day
                  <select
                    className="select"
                    value={newSchedule.day_of_week}
                    onChange={(e) => setNewSchedule({ ...newSchedule, day_of_week: Number(e.target.value) })}
                  >
                    <option value={1}>Monday</option>
                    <option value={5}>Friday</option>
                  </select>
                </label>
              ) : (
                <label className="stack">
                  Time
                  <input
                    className="input"
                    type="time"
                    value={newSchedule.time_of_day}
                    onChange={(e) => setNewSchedule({ ...newSchedule, time_of_day: e.target.value })}
                  />
                </label>
              )}
            </div>
            <label className="stack">
              Recipients
              <input
                className="input"
                placeholder="email@example.com, ..."
                value={newSchedule.recipients}
                onChange={(e) => setNewSchedule({ ...newSchedule, recipients: e.target.value })}
              />
            </label>
            <button className="button" onClick={handleCreateSchedule}>Add Schedule</button>
            {message && <div className="muted small">{message}</div>}
          </div>
          <div className="stack">
            {schedules.length === 0 ? (
              <div className="empty-state small">No active schedules.</div>
            ) : (
              <div className="list">
                {schedules.map((s) => (
                  <div key={s.id} className="card" style={{ boxShadow: 'none', padding: 12 }}>
                    <div className="flex-between">
                      <div style={{ fontWeight: 600 }}>{s.report_type.replace('_', ' ')}</div>
                      <button className="button ghost small" onClick={() => handleDeleteSchedule(s.id)}>Remove</button>
                    </div>
                    <div className="small muted">{s.cadence} at {s.time_of_day}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

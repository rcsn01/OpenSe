import { useState, useEffect } from 'react'
import { supabase } from '@repo/shared/supabase'

const STATUS_LABELS: Record<string, string> = {
  success: 'Success',
  failed: 'Failed',
  running: 'Running',
  idle: 'Idle',
  scheduled: 'Scheduled',
}

const STATUS_STYLES: Record<string, string> = {
  success: 'bg-green-500/10 border border-green-500/40 text-green-400',
  failed: 'bg-red-500/10 border border-red-500/40 text-red-400',
  running: 'bg-orange-500/10 border border-orange-500/40 text-orange-400',
  idle: 'bg-slate-500/10 border border-slate-500/40 text-slate-400',
  scheduled: 'bg-purple-500/10 border border-purple-500/40 text-purple-400',
}

export const LogsPage = () => {
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [workflowFilter, setWorkflowFilter] = useState('')

  useEffect(() => {
    const fetchLogs = async () => {
      const { data, error } = await supabase
        .schema('etl')
        .from('workflow_executions')
        .select(`
          id, status, started_at, completed_at, error_message,
          workflow:workflows(name),
          profile:profiles(full_name)
        `)
        .order('started_at', { ascending: false })
        .limit(100)

      if (!error && data) setLogs(data)
      setLoading(false)
    }
    fetchLogs()
  }, [])

  const workflows = [...new Set(logs.map((l) => l.workflow?.name).filter(Boolean))]

  const filtered = logs.filter((l) => {
    if (statusFilter && l.status !== statusFilter) return false
    if (workflowFilter && l.workflow?.name !== workflowFilter) return false
    if (search) {
      const hay = [l.workflow?.name, l.profile?.full_name, l.error_message].join(' ').toLowerCase()
      if (!hay.includes(search.toLowerCase())) return false
    }
    return true
  })

  const getDuration = (started: string, completed: string | null) => {
    if (!completed) return '—'
    const diff = new Date(completed).getTime() - new Date(started).getTime()
    const mins = Math.floor(diff / 60000)
    const secs = Math.floor((diff % 60000) / 1000)
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
  }

  return (
    <div className="p-8">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-medium text-white mb-1">Logs</h1>
          <p className="text-sm text-slate-500">Workflow execution history. Search, filter, and export.</p>
        </div>
      </div>

      <div className="flex gap-3 mb-6 flex-wrap">
        <input
          className="flex-1 min-w-48 bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-sm text-slate-300 placeholder-slate-600 outline-none focus:border-slate-500"
          placeholder="Search by workflow, user, or message..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-sm text-slate-300 outline-none"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">All statuses</option>
          {Object.keys(STATUS_LABELS).map((s) => (
            <option key={s} value={s}>{STATUS_LABELS[s]}</option>
          ))}
        </select>
        <select
          className="bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-sm text-slate-300 outline-none"
          value={workflowFilter}
          onChange={(e) => setWorkflowFilter(e.target.value)}
        >
          <option value="">All workflows</option>
          {workflows.map((w) => (
            <option key={w} value={w}>{w}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <p className="text-slate-500 text-sm">Loading logs...</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-800">
              <th className="text-left py-3 px-4 text-xs text-slate-600 font-normal">Status</th>
              <th className="text-left py-3 px-4 text-xs text-slate-600 font-normal">Workflow</th>
              <th className="text-left py-3 px-4 text-xs text-slate-600 font-normal">Started</th>
              <th className="text-left py-3 px-4 text-xs text-slate-600 font-normal">Duration</th>
              <th className="text-left py-3 px-4 text-xs text-slate-600 font-normal">User</th>
              <th className="text-left py-3 px-4 text-xs text-slate-600 font-normal">Message</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-12 text-slate-600">No logs found</td></tr>
            ) : (
              filtered.map((log) => (
                <tr key={log.id} className="border-b border-slate-900 hover:bg-slate-900/50">
                  <td className="py-3 px-4">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_STYLES[log.status] ?? ''}`}>
                      <span className="w-1.5 h-1.5 rounded-full bg-current" />
                      {STATUS_LABELS[log.status] ?? log.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-200 font-medium">{log.workflow?.name ?? '—'}</td>
                  <td className="py-3 px-4 text-slate-400">{new Date(log.started_at).toLocaleString()}</td>
                  <td className="py-3 px-4 text-slate-400 font-mono">{getDuration(log.started_at, log.completed_at)}</td>
                  <td className="py-3 px-4 text-slate-400">{log.profile?.full_name ?? 'system'}</td>
                  <td className="py-3 px-4 text-red-400 text-xs">{log.error_message ?? <span className="text-slate-700">—</span>}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      )}
    </div>
  )
}
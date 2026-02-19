import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockFrom = vi.fn()

vi.mock('../lib/supabase', () => ({
  db: {
    from: (...args: unknown[]) => mockFrom(...args),
  },
}))

import { logExecutionRun } from '../api/execution'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('logExecutionRun', () => {
  it('inserts workflow execution payload into workflow_executions', async () => {
    const insert = vi.fn().mockResolvedValue({ error: null })
    mockFrom.mockReturnValue({ insert })

    await logExecutionRun({
      workflowId: 'wf-1',
      userId: 'user-1',
      orgId: 'org-1',
      status: 'success',
      startedAt: '2026-02-19T10:00:00.000Z',
      completedAt: '2026-02-19T10:00:05.000Z',
      errorMessage: null,
    })

    expect(mockFrom).toHaveBeenCalledWith('workflow_executions')
    expect(insert).toHaveBeenCalledWith({
      workflow_id: 'wf-1',
      user_id: 'user-1',
      org_id: 'org-1',
      status: 'success',
      started_at: '2026-02-19T10:00:00.000Z',
      completed_at: '2026-02-19T10:00:05.000Z',
      error_message: null,
    })
  })

  it('throws when insert returns an error', async () => {
    const insert = vi.fn().mockResolvedValue({ error: { message: 'insert failed' } })
    mockFrom.mockReturnValue({ insert })

    await expect(
      logExecutionRun({
        workflowId: 'wf-2',
        userId: 'user-2',
        orgId: null,
        status: 'failed',
        startedAt: '2026-02-19T11:00:00.000Z',
        completedAt: '2026-02-19T11:00:05.000Z',
        errorMessage: 'boom',
      }),
    ).rejects.toMatchObject({ message: 'insert failed' })
  })
})

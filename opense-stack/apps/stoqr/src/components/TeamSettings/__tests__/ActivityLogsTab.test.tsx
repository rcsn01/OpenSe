import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { ActivityLogsTab } from '../ActivityLogsTab'

const logs = [
  {
    id: 'log-1',
    actor_user_id: 'user-1',
    event_type: 'inventory_transactions.insert',
    message: 'inventory_transactions INSERT',
    metadata: {},
    created_at: '2026-05-26T00:09:27.000Z',
    profiles: {
      id: 'user-1',
      full_name: 'Ivan Earth',
      username: 'ivan.earth',
    },
  },
]

describe('ActivityLogsTab', () => {
  it('renders activity rows without the removed summary and export controls', () => {
    render(<ActivityLogsTab logs={logs} />)

    expect(screen.getByText('Ivan Earth')).toBeInTheDocument()
    expect(screen.getByText('inventory_transactions.insert')).toBeInTheDocument()
    expect(screen.getByText('inventory_transactions INSERT')).toBeInTheDocument()
    expect(screen.queryByText('Showing 1 of 1 events.')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Export Logs' })).not.toBeInTheDocument()
  })
})
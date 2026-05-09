import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { type ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { DataTable, type DataTableColumn } from '../DataTable'

type TestRow = {
  id: string
  name: string
  status: string
}

const columns: Array<DataTableColumn<TestRow>> = [
  {
    id: 'name',
    header: 'Name',
    renderCell: (row) => row.name,
  },
  {
    id: 'status',
    header: 'Status',
    renderCell: (row) => row.status,
  },
]

const rows: TestRow[] = [
  { id: 'row-1', name: 'Alpha', status: 'Ready' },
  { id: 'row-2', name: 'Beta', status: 'Blocked' },
]

type DataTableTestProps = {
  rows?: TestRow[]
  topRow?: ReactNode
  emptyState?: ReactNode
}

const renderTable = (props: DataTableTestProps = {}) =>
  render(
    <DataTable
      columns={columns}
      rows={rows}
      getRowId={(row) => row.id}
      {...props}
    />,
  )

describe('DataTable', () => {
  it('renders current rows normally when no top row is provided', () => {
    renderTable()

    const bodyRows = within(screen.getAllByRole('rowgroup')[1]).getAllByRole('row')

    expect(bodyRows).toHaveLength(2)
    expect(bodyRows[0]).toHaveTextContent('Alpha')
    expect(screen.queryByText('Template controls')).not.toBeInTheDocument()
  })

  it('renders the optional top row above column headers', () => {
    renderTable({ topRow: <div>Template controls</div> })

    const headerRows = within(screen.getAllByRole('rowgroup')[0]).getAllByRole('row')
    const bodyRows = within(screen.getAllByRole('rowgroup')[1]).getAllByRole('row')

    expect(headerRows).toHaveLength(2)
    expect(headerRows[0]).toHaveTextContent('Template controls')
    expect(headerRows[1]).toHaveTextContent('Name')
    expect(bodyRows[0]).toHaveTextContent('Alpha')
  })

  it('spans the optional top row across all columns', () => {
    renderTable({ topRow: <div>Template controls</div> })

    const topRowCell = screen.getByText('Template controls').closest('td')

    expect(topRowCell).toHaveAttribute('colspan', String(columns.length))
  })

  it('keeps the empty state below column headers when a top row is present', () => {
    renderTable({
      rows: [],
      topRow: <div>Template controls</div>,
      emptyState: 'Nothing here yet.',
    })

    const headerRows = within(screen.getAllByRole('rowgroup')[0]).getAllByRole('row')
    const bodyRows = within(screen.getAllByRole('rowgroup')[1]).getAllByRole('row')

    expect(headerRows[0]).toHaveTextContent('Template controls')
    expect(headerRows[1]).toHaveTextContent('Name')
    expect(bodyRows).toHaveLength(1)
    expect(bodyRows[0]).toHaveTextContent('Nothing here yet.')
  })

  it('renders an optional bottom row inside the table body', () => {
    renderTable({ bottomRow: <button type="button">Add row</button> })

    const bodyRows = within(screen.getAllByRole('rowgroup')[1]).getAllByRole('row')
    const bottomRowCell = screen.getByRole('button', { name: 'Add row' }).closest('td')

    expect(bodyRows).toHaveLength(3)
    expect(bodyRows[2]).toHaveTextContent('Add row')
    expect(bottomRowCell).toHaveAttribute('colspan', String(columns.length))
  })

  it('renders optional row selection and select-all controls', async () => {
    const user = userEvent.setup()
    const onToggleRow = vi.fn()
    const onToggleAll = vi.fn()

    render(
      <DataTable
        columns={columns}
        rows={rows}
        getRowId={(row) => row.id}
        selection={{
          selectedRowIds: new Set(['row-1']),
          onToggleRow,
          onToggleAll,
          selectAllLabel: 'Select all test rows',
          getRowLabel: (row) => row.name,
        }}
      />,
    )

    const selectAll = screen.getByRole('checkbox', { name: 'Select all test rows' })
    const alpha = screen.getByRole('checkbox', { name: 'Select Alpha' })
    const beta = screen.getByRole('checkbox', { name: 'Select Beta' })

    expect(selectAll).not.toBeChecked()
    expect(selectAll).toBePartiallyChecked()
    expect(alpha).toBeChecked()
    expect(beta).not.toBeChecked()

    await user.click(beta)
    expect(onToggleRow).toHaveBeenCalledWith(rows[1], 'row-2', 1)

    await user.click(selectAll)
    expect(onToggleAll).toHaveBeenCalledTimes(1)
  })

  it('spans top, bottom, and empty rows across the selection column too', () => {
    render(
      <DataTable
        columns={columns}
        rows={[]}
        getRowId={(row) => row.id}
        topRow={<div>Top controls</div>}
        bottomRow={<div>Bottom controls</div>}
        emptyState="Nothing here yet."
        selection={{
          selectedRowIds: new Set(),
          onToggleRow: vi.fn(),
          onToggleAll: vi.fn(),
        }}
      />,
    )

    expect(screen.getByText('Top controls').closest('td')).toHaveAttribute('colspan', String(columns.length + 1))
    expect(screen.getByText('Nothing here yet.')).toHaveAttribute('colspan', String(columns.length + 1))
    expect(screen.getByText('Bottom controls').closest('td')).toHaveAttribute('colspan', String(columns.length + 1))
  })
})

import { render, screen, within } from '@testing-library/react'
import { type ReactNode } from 'react'
import { describe, expect, it } from 'vitest'
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
})

import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { FolderSelectionTree } from '../FolderSelectionTree'
import type { Folder } from '../../../types'

const folders: Folder[] = [
  { id: 'f-1', name: 'Electronics', parent_id: null, sort_order: 0 },
  { id: 'f-2', name: 'Clothing', parent_id: null, sort_order: 1 },
  { id: 'f-3', name: 'Phones', parent_id: 'f-1', sort_order: 0 },
]

const renderTree = (overrides: Partial<Parameters<typeof FolderSelectionTree>[0]> = {}) => {
  const props = {
    folders,
    selectedFolderId: null,
    onSelectFolder: vi.fn(),
    ariaLabel: 'Folders',
    emptyMessage: 'No folders.',
    ...overrides,
  }

  render(<FolderSelectionTree {...props} />)
  return props
}

describe('FolderSelectionTree', () => {
  it('marks the selected folder active', () => {
    renderTree({ selectedFolderId: 'f-2' })

    expect(screen.getByRole('treeitem', { name: 'Clothing' })).toHaveClass('active')
  })

  it('renders disabled folders and does not call the select callback for them', async () => {
    const user = userEvent.setup()
    const props = renderTree({
      disabledFolderIds: ['f-2'],
      getFolderMetaLabel: (folderId) => (folderId === 'f-2' ? '0 available' : null),
    })

    const disabledRow = screen.getByRole('treeitem', { name: /Clothing 0 available/ })
    expect(disabledRow).toHaveAttribute('aria-disabled', 'true')

    await user.click(disabledRow)

    expect(props.onSelectFolder).not.toHaveBeenCalled()
  })

  it('omits hidden rows while keeping their children visible', () => {
    renderTree({ hiddenFolderIds: ['f-1'] })

    expect(screen.queryByText('Electronics')).not.toBeInTheDocument()
    expect(screen.getByText('Phones')).toBeInTheDocument()
  })

  it('expands and collapses child folders', async () => {
    const user = userEvent.setup()
    renderTree()

    const tree = screen.getByRole('tree', { name: 'Folders' })
    expect(within(tree).queryByText('Phones')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Expand Electronics' }))
    expect(within(tree).getByText('Phones')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Collapse Electronics' }))
    expect(within(tree).queryByText('Phones')).not.toBeInTheDocument()
  })

  it('calls onSelectFolder when an enabled folder is clicked', async () => {
    const user = userEvent.setup()
    const props = renderTree()

    await user.click(screen.getByRole('treeitem', { name: 'Clothing' }))

    expect(props.onSelectFolder).toHaveBeenCalledWith('f-2')
  })
})

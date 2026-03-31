import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { FolderNavigationPanel } from '../FolderNavigationPanel'
import type { Folder } from '../../../types'
import type { FolderView } from '../all-products/types'

// Mock @dnd-kit to avoid DnD complexity in unit tests
vi.mock('@dnd-kit/core', () => ({
  DndContext: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  closestCenter: vi.fn(),
  PointerSensor: vi.fn(),
  TouchSensor: vi.fn(),
  useSensor: vi.fn(() => ({})),
  useSensors: vi.fn(() => []),
}))

vi.mock('@dnd-kit/sortable', () => ({
  SortableContext: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  verticalListSortingStrategy: {},
  useSortable: () => ({
    attributes: {},
    listeners: {},
    setNodeRef: vi.fn(),
    transform: null,
    transition: null,
    isDragging: false,
  }),
}))

vi.mock('@dnd-kit/utilities', () => ({
  CSS: {
    Transform: {
      toString: () => undefined,
    },
  },
}))

const createProps = (overrides: Partial<Parameters<typeof FolderNavigationPanel>[0]> = {}) => ({
  folders: [
    { id: 'f-1', name: 'Electronics', parent_id: null, sort_order: 0 },
    { id: 'f-2', name: 'Clothing', parent_id: null, sort_order: 1 },
    { id: 'f-3', name: 'Phones', parent_id: 'f-1', sort_order: 0 },
  ] as Folder[],
  activeFolderId: null,
  folderView: 'all' as FolderView,
  onSelectFolder: vi.fn(),
  onSelectView: vi.fn(),
  onCreateFolder: vi.fn(),
  onRenameFolder: vi.fn(),
  onDeleteFolder: vi.fn(),
  onMoveFolder: vi.fn(),
  deletingFolderId: null,
  deleteStep: null as 'choose' | 'confirm' | null,
  deleteAction: null as 'move-uncategorised' | 'delete-products' | null,
  onDeleteStepChoose: vi.fn(),
  onDeleteActionSelect: vi.fn(),
  onDeleteConfirm: vi.fn(),
  onDeleteCancel: vi.fn(),
  ...overrides,
})

describe('FolderNavigationPanel', () => {
  it('renders All Products and Uncategorised top-level entries', () => {
    render(<FolderNavigationPanel {...createProps()} />)

    expect(screen.getByText('All Products')).toBeInTheDocument()
    expect(screen.getByText('Uncategorised')).toBeInTheDocument()
  })

  it('renders the Folders section header', () => {
    render(<FolderNavigationPanel {...createProps()} />)

    expect(screen.getByText('Folders')).toBeInTheDocument()
  })

  it('renders root-level folders in the tree', () => {
    render(<FolderNavigationPanel {...createProps()} />)

    expect(screen.getByText('Electronics')).toBeInTheDocument()
    expect(screen.getByText('Clothing')).toBeInTheDocument()
  })

  it('shows folders when sort_order is undefined (backwards compatibility)', () => {
    const foldersWithoutSortOrder = [
      { id: 'f-1', name: 'Alpha', parent_id: null },
      { id: 'f-2', name: 'Beta', parent_id: null },
    ] as Folder[]

    render(<FolderNavigationPanel {...createProps({ folders: foldersWithoutSortOrder })} />)

    expect(screen.getByText('Alpha')).toBeInTheDocument()
    expect(screen.getByText('Beta')).toBeInTheDocument()
  })

  it('correctly renders folders even with empty folders array', () => {
    render(<FolderNavigationPanel {...createProps({ folders: [] })} />)

    expect(screen.getByText('All Products')).toBeInTheDocument()
    expect(screen.getByText('Uncategorised')).toBeInTheDocument()
    expect(screen.getByText('Folders')).toBeInTheDocument()
  })

  it('calls onSelectView with "all" when All Products is clicked', () => {
    const props = createProps()
    render(<FolderNavigationPanel {...props} />)

    fireEvent.click(screen.getByText('All Products'))

    expect(props.onSelectView).toHaveBeenCalledWith('all')
  })

  it('calls onSelectView with "uncategorised" when Uncategorised is clicked', () => {
    const props = createProps()
    render(<FolderNavigationPanel {...props} />)

    fireEvent.click(screen.getByText('Uncategorised'))

    expect(props.onSelectView).toHaveBeenCalledWith('uncategorised')
  })

  it('highlights All Products when folderView is "all"', () => {
    render(<FolderNavigationPanel {...createProps({ folderView: 'all' })} />)

    const allProductsItem = screen.getByText('All Products').closest('.tree-item')
    expect(allProductsItem).toHaveClass('active')
  })

  it('highlights Uncategorised when folderView is "uncategorised"', () => {
    render(<FolderNavigationPanel {...createProps({ folderView: 'uncategorised' })} />)

    const uncategorisedItem = screen.getByText('Uncategorised').closest('.tree-item')
    expect(uncategorisedItem).toHaveClass('active')
  })

  it('calls onCreateFolder when + button is clicked', () => {
    const props = createProps()
    render(<FolderNavigationPanel {...props} />)

    const addButton = screen.getByTitle('New folder')
    fireEvent.click(addButton)

    expect(props.onCreateFolder).toHaveBeenCalled()
  })

  it('calls onSelectFolder when a folder in the tree is clicked', () => {
    const props = createProps()
    render(<FolderNavigationPanel {...props} />)

    fireEvent.click(screen.getByText('Clothing'))

    expect(props.onSelectView).toHaveBeenCalledWith('folder')
    expect(props.onSelectFolder).toHaveBeenCalledWith('f-2')
  })

  it('shows delete dialog step "choose" when deletingFolderId and deleteStep are set', () => {
    render(
      <FolderNavigationPanel
        {...createProps({
          deletingFolderId: 'f-1',
          deleteStep: 'choose',
        })}
      />,
    )

    expect(screen.getByText(/Delete "Electronics"/)).toBeInTheDocument()
    expect(screen.getByText('Move products to Uncategorised')).toBeInTheDocument()
    expect(screen.getByText('Delete all products inside')).toBeInTheDocument()
  })

  it('calls onDeleteActionSelect when delete option is chosen', () => {
    const props = createProps({
      deletingFolderId: 'f-1',
      deleteStep: 'choose',
    })
    render(<FolderNavigationPanel {...props} />)

    fireEvent.click(screen.getByText('Move products to Uncategorised'))

    expect(props.onDeleteActionSelect).toHaveBeenCalledWith('move-uncategorised')
  })

  it('shows confirm dialog with correct text for move-uncategorised action', () => {
    render(
      <FolderNavigationPanel
        {...createProps({
          deletingFolderId: 'f-1',
          deleteStep: 'confirm',
          deleteAction: 'move-uncategorised',
        })}
      />,
    )

    expect(screen.getByText('Are you sure?')).toBeInTheDocument()
    expect(screen.getByText(/will be moved to Uncategorised/)).toBeInTheDocument()
    expect(screen.getByText('Move & Delete Folder')).toBeInTheDocument()
  })

  it('shows confirm dialog with correct text for delete-products action', () => {
    render(
      <FolderNavigationPanel
        {...createProps({
          deletingFolderId: 'f-1',
          deleteStep: 'confirm',
          deleteAction: 'delete-products',
        })}
      />,
    )

    expect(screen.getByText('Are you sure?')).toBeInTheDocument()
    expect(screen.getByText(/will be permanently deleted/)).toBeInTheDocument()
    expect(screen.getByText('Delete Everything')).toBeInTheDocument()
  })

  it('calls onDeleteConfirm when confirm button is clicked', () => {
    const props = createProps({
      deletingFolderId: 'f-1',
      deleteStep: 'confirm',
      deleteAction: 'move-uncategorised',
    })
    render(<FolderNavigationPanel {...props} />)

    fireEvent.click(screen.getByText('Move & Delete Folder'))

    expect(props.onDeleteConfirm).toHaveBeenCalled()
  })

  it('calls onDeleteCancel when Cancel is clicked in confirm step', () => {
    const props = createProps({
      deletingFolderId: 'f-1',
      deleteStep: 'confirm',
      deleteAction: 'move-uncategorised',
    })
    render(<FolderNavigationPanel {...props} />)

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(props.onDeleteCancel).toHaveBeenCalled()
  })

  it('sorts folders by sort_order then name', () => {
    const folders = [
      { id: 'f-a', name: 'Zebra', parent_id: null, sort_order: 0 },
      { id: 'f-b', name: 'Alpha', parent_id: null, sort_order: 1 },
      { id: 'f-c', name: 'Middle', parent_id: null, sort_order: 0 },
    ] as Folder[]

    render(<FolderNavigationPanel {...createProps({ folders })} />)

    const folderElements = screen.getAllByText(/Zebra|Alpha|Middle/)
    const names = folderElements.map((el) => el.textContent)
    // sort_order 0: Middle, Zebra (alphabetical), then sort_order 1: Alpha
    expect(names).toEqual(['Middle', 'Zebra', 'Alpha'])
  })
})

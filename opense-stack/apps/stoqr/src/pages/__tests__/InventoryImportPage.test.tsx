import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Outlet, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { TopBarSearchContent, TopBarSearchProvider } from '../../components/Search/TopBarSearch'
import { InventoryImportPage } from '../InventoryImportPage'

const mocks = vi.hoisted(() => ({
  mutateAsync: vi.fn(),
}))

vi.mock('../../contexts/CompanyContext', () => ({
  useCompany: () => ({ companyId: 'company-1' }),
}))

vi.mock('../../hooks/queries/useInventory', () => ({
  useInventoryFilters: () => ({
    data: {
      folders: [{ id: 'folder-1', name: 'Main Warehouse', parent_id: null }],
    },
    isLoading: false,
  }),
  useImportInventoryProducts: () => ({
    mutateAsync: mocks.mutateAsync,
    isPending: false,
  }),
}))

describe('InventoryImportPage', () => {
  const SearchShell = () => (
    <TopBarSearchProvider>
      <TopBarSearchContent />
      <Outlet />
    </TopBarSearchProvider>
  )

  beforeEach(() => {
    vi.clearAllMocks()
    mocks.mutateAsync.mockResolvedValue({
      importedCount: 1,
      duplicateCount: 0,
      invalidCount: 0,
      duplicateSkus: [],
    })
  })

  it('shows the shared top-bar search and filters visible import columns', async () => {
    const user = userEvent.setup()

    render(
      <MemoryRouter initialEntries={[
        {
          pathname: '/inventory/import',
          state: {
            csvUpload: {
              fileName: 'products.csv',
              headers: ['Product Name', 'SKU', 'Description', 'Color'],
              rows: [
                {
                  'Product Name': 'Widget',
                  SKU: 'SKU-1',
                  Description: 'Main widget',
                  Color: 'Blue',
                },
              ],
              initialFolderId: 'folder-1',
            },
          },
        },
      ]}>
        <Routes>
          <Route element={<SearchShell />}>
            <Route path="/inventory/import" element={<InventoryImportPage />} />
          </Route>
        </Routes>
      </MemoryRouter>,
    )

    await screen.findByText('Map Columns')
    await user.type(screen.getByRole('combobox', { name: 'Search import data...' }), 'Color')

    expect(screen.getByLabelText('Map Color column')).toBeInTheDocument()
    expect(screen.queryByLabelText('Map Product Name column')).not.toBeInTheDocument()
  })

  it('renders uploaded draft data in the mapping table and submits mapped import payload', async () => {
    render(
      <MemoryRouter initialEntries={[
        {
          pathname: '/inventory/import',
          state: {
            csvUpload: {
              fileName: 'products.csv',
              headers: ['Product Name', 'SKU', 'Description', 'Color'],
              rows: [
                {
                  'Product Name': 'Widget',
                  SKU: 'SKU-1',
                  Description: 'Main widget',
                  Color: 'Blue',
                },
              ],
              initialFolderId: 'folder-1',
            },
          },
        },
      ]}>
        <Routes>
          <Route path="/inventory/import" element={<InventoryImportPage />} />
        </Routes>
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(screen.getByText('Map Columns')).toBeInTheDocument()
      expect(screen.getByText('products.csv')).toBeInTheDocument()
      expect(screen.getByText('1 rows')).toBeInTheDocument()
      expect(screen.getByText('Widget')).toBeInTheDocument()
    })

    fireEvent.change(screen.getByLabelText('Destination Folder'), {
      target: { value: 'folder-1' },
    })

    fireEvent.change(screen.getByLabelText('Map Color column'), {
      target: { value: 'attribute' },
    })

    fireEvent.click(screen.getByRole('button', { name: 'Import Products' }))

    await waitFor(() => {
      expect(mocks.mutateAsync).toHaveBeenCalledWith({
        rows: [
          {
            'Product Name': 'Widget',
            SKU: 'SKU-1',
            Description: 'Main widget',
            Color: 'Blue',
          },
        ],
        folderId: 'folder-1',
        columnMappings: {
          name: 'Product Name',
          sku: 'SKU',
          description: 'Description',
          cost_price: null,
          selling_price: null,
          quantity_on_hand: null,
          reorder_point: null,
        },
        attributeColumns: ['Color'],
      })
    })
  })

  it('disables import until Product Name is mapped and prevents duplicate core-field assignment', async () => {
    render(
      <MemoryRouter initialEntries={[
        {
          pathname: '/inventory/import',
          state: {
            csvUpload: {
              fileName: 'columns.csv',
              headers: ['Column A', 'Column B'],
              rows: [{ 'Column A': 'Widget', 'Column B': 'SKU-1' }],
              initialFolderId: null,
            },
          },
        },
      ]}>
        <Routes>
          <Route path="/inventory/import" element={<InventoryImportPage />} />
        </Routes>
      </MemoryRouter>,
    )

    const importButton = await screen.findByRole('button', { name: 'Import Products' })
    expect(importButton).toBeDisabled()
    expect(screen.getByText('Product Name is required before products can be imported.')).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Map Column A column'), {
      target: { value: 'name' },
    })

    await waitFor(() => {
      expect(importButton).toBeEnabled()
    })

    const secondSelect = screen.getByLabelText('Map Column B column')
    const nameOption = within(secondSelect).getByRole('option', { name: 'Product Name *' })
    expect(nameOption).toBeDisabled()
  })

  it('allows importing when only Product Name is mapped', async () => {
    render(
      <MemoryRouter initialEntries={[
        {
          pathname: '/inventory/import',
          state: {
            csvUpload: {
              fileName: 'no-sku.csv',
              headers: ['Product Name', 'Description'],
              rows: [{ 'Product Name': 'Widget', Description: 'No sku needed' }],
              initialFolderId: null,
            },
          },
        },
      ]}>
        <Routes>
          <Route path="/inventory/import" element={<InventoryImportPage />} />
        </Routes>
      </MemoryRouter>,
    )

    const importButton = await screen.findByRole('button', { name: 'Import Products' })
    expect(importButton).toBeEnabled()

    fireEvent.click(importButton)

    await waitFor(() => {
      expect(mocks.mutateAsync).toHaveBeenCalledWith(expect.objectContaining({
        columnMappings: {
          name: 'Product Name',
          sku: null,
          description: 'Description',
          cost_price: null,
          selling_price: null,
          quantity_on_hand: null,
          reorder_point: null,
        },
      }))
    })
  })
})

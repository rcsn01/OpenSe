import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

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
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.mutateAsync.mockResolvedValue({
      importedCount: 1,
      duplicateCount: 0,
      invalidCount: 0,
      duplicateSkus: [],
    })
  })

  it('uploads a csv, previews it, and submits mapped import payload', async () => {
    render(
      <MemoryRouter>
        <InventoryImportPage />
      </MemoryRouter>,
    )

    const file = new File([
      'Product Name,SKU,Description,Color\nWidget,SKU-1,Main widget,Blue',
    ], 'products.csv', { type: 'text/csv' })
    Object.defineProperty(file, 'text', {
      value: vi.fn().mockResolvedValue('Product Name,SKU,Description,Color\nWidget,SKU-1,Main widget,Blue'),
    })

    fireEvent.change(screen.getByLabelText('Upload product CSV'), {
      target: { files: [file] },
    })

    await waitFor(() => {
      expect(screen.getByText('1 rows detected')).toBeInTheDocument()
    })

    fireEvent.change(screen.getByLabelText('Destination Folder'), {
      target: { value: 'folder-1' },
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
})
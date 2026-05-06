import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Outlet, Route, Routes, useLocation } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { TopBarSearchContent, TopBarSearchProvider } from '../../components/Search/TopBarSearch'
import { LabelDesignerPage } from '../LabelDesignerPage'

vi.mock('../../contexts/CompanyContext', () => ({
  useCompany: () => ({ companyId: 'company-1' }),
}))

vi.mock('../../components/BasePage', () => ({
  BasePage: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

vi.mock('../../components/LabelStudio/LabelDesignerTab', () => ({
  LabelDesignerTab: ({
    selectedTemplateId,
    onClose,
    onSavedTemplateChange,
  }: {
    selectedTemplateId?: string
    onClose?: () => void
    onSavedTemplateChange?: (templateId: string) => void
  }) => (
    <div>
      <div>Designer template: {selectedTemplateId || 'none'}</div>
      <button type="button" onClick={() => onClose?.()}>Back to templates</button>
      <button type="button" onClick={() => onSavedTemplateChange?.('template-2')}>Save as new template</button>
    </div>
  ),
}))

vi.mock('../../hooks/queries/useLabelStudio', () => ({
  useLabelTemplates: () => ({
    data: [
      {
        id: 'template-1',
        company_id: 'company-1',
        name: 'Shipping Label',
        is_system: false,
        layout: {},
        variable_fields: ['barcode', 'sku'],
        created_at: '2026-05-01T00:00:00.000Z',
        updated_at: '2026-05-03T00:00:00.000Z',
      },
      {
        id: 'template-2',
        company_id: 'company-1',
        name: 'Returns Label',
        is_system: false,
        layout: {},
        variable_fields: ['barcode', 'qr'],
        created_at: '2026-05-01T00:00:00.000Z',
        updated_at: '2026-05-04T00:00:00.000Z',
      },
    ],
  }),
}))

const LocationProbe = () => {
  const location = useLocation()
  return <div data-testid="location-path">{`${location.pathname}${location.search}`}</div>
}

const SearchShell = () => (
  <TopBarSearchProvider>
    <TopBarSearchContent />
    <Outlet />
  </TopBarSearchProvider>
)

const renderDesignerRoute = (initialEntry: string) =>
  render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route element={<SearchShell />}>
          <Route path="/tools/labels/:tab/:templateId" element={<><LabelDesignerPage /><LocationProbe /></>} />
          <Route path="/tools/labels/:tab" element={<LocationProbe />} />
        </Route>
      </Routes>
    </MemoryRouter>,
  )

describe('LabelDesignerPage', () => {
  it('registers the template search suggestions for the dedicated editor page', async () => {
    const user = userEvent.setup()
    renderDesignerRoute('/tools/labels/templates/template-1?template=template-1')

    await user.click(screen.getByRole('combobox', { name: 'Search templates...' }))

    expect(screen.getByText('Shipping Label')).toBeInTheDocument()
    expect(screen.getByText('Returns Label')).toBeInTheDocument()
  })

  it('canonicalizes the designer route to the dedicated templates editor path', () => {
    renderDesignerRoute('/tools/labels/design/template-1')

    expect(screen.getByTestId('location-path')).toHaveTextContent('/tools/labels/templates/template-1?template=template-1')
  })

  it('returns to templates while preserving the selected template', async () => {
    const user = userEvent.setup()
    renderDesignerRoute('/tools/labels/templates/template-1?template=template-1')

    await user.click(screen.getByRole('button', { name: 'Back to templates' }))

    expect(screen.getByTestId('location-path')).toHaveTextContent('/tools/labels/templates?template=template-1')
  })

  it('updates the route when a save changes the template id', async () => {
    const user = userEvent.setup()
    renderDesignerRoute('/tools/labels/templates/template-1?template=template-1')

    await user.click(screen.getByRole('button', { name: 'Save as new template' }))

    expect(screen.getByTestId('location-path')).toHaveTextContent('/tools/labels/templates/template-2?template=template-2')
  })
})

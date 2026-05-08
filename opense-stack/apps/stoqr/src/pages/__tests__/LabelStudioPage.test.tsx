import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { LabelDesignerPage } from '../LabelDesignerPage'
import { LabelStudioPage } from '../LabelStudioPage'

vi.mock('../../contexts/CompanyContext', () => ({
  useCompany: () => ({ companyId: 'company-1' }),
}))

vi.mock('../../components/BasePage', () => ({
  BasePage: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

vi.mock('../../components/Tabs', () => ({
  Tabs: ({
    tabs,
    activeTab,
    onTabChange,
  }: {
    tabs: Array<{ id: string; label: string; content: React.ReactNode }>
    activeTab?: string
    onTabChange?: (tabId: string) => void
  }) => (
    <div>
      {tabs.map((tab) => (
        <button key={tab.id} type="button" onClick={() => onTabChange?.(tab.id)}>
          {tab.label}
        </button>
      ))}
      <div>{tabs.find((tab) => tab.id === activeTab)?.content ?? null}</div>
    </div>
  ),
}))

vi.mock('../../components/LabelStudio/TemplateLibraryTab', () => ({
  TemplateLibraryTab: ({
    selectedTemplateId,
    onSelectTemplate,
  }: {
    selectedTemplateId?: string
    onSelectTemplate?: (templateId: string) => void
  }) => (
    <div>
      <div>Selected template: {selectedTemplateId || 'none'}</div>
      <button type="button" onClick={() => onSelectTemplate?.('template-1')}>
        Edit Product Label template
      </button>
    </div>
  ),
}))

vi.mock('../../components/LabelStudio/LabelDesignerTab', () => ({
  LabelDesignerTab: ({ selectedTemplateId, onClose }: { selectedTemplateId?: string; onClose?: () => void }) => (
    <div>
      <div>Designer template: {selectedTemplateId || 'none'}</div>
      <button type="button" onClick={() => onClose?.()}>Back to templates</button>
    </div>
  ),
}))

vi.mock('../../components/LabelStudio/LabelPreviewBatchTab', () => ({
  LabelPreviewBatchTab: ({ selectedTemplateId }: { selectedTemplateId?: string }) => (
    <div>Preview template: {selectedTemplateId || 'none'}</div>
  ),
}))

vi.mock('../../hooks/queries/useLabelStudio', () => ({
  useLabelTemplates: () => ({
    data: [],
  }),
}))

const LocationProbe = () => {
  const location = useLocation()
  return <div data-testid="location-path">{`${location.pathname}${location.search}`}</div>
}

const renderLabelStudioRoute = (initialEntry: string) =>
  render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path="/tools/labels/:tab/:templateId" element={<><LabelDesignerPage /><LocationProbe /></>} />
        <Route
          path="/tools/labels/:tab"
          element={
            <>
              <LabelStudioPage />
              <LocationProbe />
            </>
          }
        />
      </Routes>
    </MemoryRouter>,
  )

describe('LabelStudioPage', () => {
  it('keeps only the combined workflows and opens the template editor on its own route', async () => {
    const user = userEvent.setup()

    render(
      <MemoryRouter initialEntries={['/tools/labels/templates']}>
        <Routes>
          <Route path="/tools/labels/:tab/:templateId" element={<><LabelDesignerPage /><LocationProbe /></>} />
          <Route path="/tools/labels/:tab" element={<LabelStudioPage />} />
        </Routes>
      </MemoryRouter>,
    )

    expect(screen.getByRole('button', { name: 'Templates' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Preview & Batch' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Design' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Downloads' })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Edit Product Label template' }))

    expect(screen.getByText('Designer template: template-1')).toBeInTheDocument()
    expect(screen.getByTestId('location-path')).toHaveTextContent('/tools/labels/templates/template-1?template=template-1')
  })

  it('shares the selected template with the preview workflow', async () => {
    const user = userEvent.setup()

    render(
      <MemoryRouter initialEntries={['/tools/labels/templates?template=template-1']}>
        <Routes>
          <Route path="/tools/labels/:tab" element={<LabelStudioPage />} />
        </Routes>
      </MemoryRouter>,
    )

    await user.click(screen.getByRole('button', { name: 'Preview & Batch' }))

    expect(screen.getByText('Preview template: template-1')).toBeInTheDocument()
  })

  it('canonicalizes legacy design and downloads routes to the combined tabs', async () => {
    renderLabelStudioRoute('/tools/labels/design?template=template-1')

    expect(screen.getByTestId('location-path')).toHaveTextContent('/tools/labels/templates?template=template-1')

    renderLabelStudioRoute('/tools/labels/downloads?template=template-1')

    expect(screen.getAllByTestId('location-path')[1]).toHaveTextContent('/tools/labels/preview-batch?template=template-1')
  })
})

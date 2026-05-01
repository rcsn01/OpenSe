import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { CSSProperties } from 'react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { LabelStudioPage } from '../LabelStudioPage'

vi.mock('../../contexts/CompanyContext', () => ({
  useCompany: () => ({ companyId: 'company-1' }),
}))

vi.mock('../../components/BasePage', () => ({
  BasePage: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

vi.mock('@repo/ui', () => ({
  SideSheet: ({
    open,
    children,
    panelStyle,
  }: {
    open: boolean
    children: React.ReactNode
    panelStyle?: CSSProperties
  }) =>
    open ? <div data-testid="designer-sheet" data-panel-width={panelStyle?.width}>{children}</div> : null,
  SideSheetContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SideSheetHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SideSheetTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
  SideSheetDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
  SideSheetBody: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
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
        Open template designer
      </button>
    </div>
  ),
}))

vi.mock('../../components/LabelStudio/LabelDesignerTab', () => ({
  LabelDesignerTab: ({ selectedTemplateId }: { selectedTemplateId?: string }) => (
    <div>Designer template: {selectedTemplateId || 'none'}</div>
  ),
}))

vi.mock('../../components/LabelStudio/LabelPreviewBatchTab', () => ({
  LabelPreviewBatchTab: ({ selectedTemplateId }: { selectedTemplateId?: string }) => (
    <div>Preview template: {selectedTemplateId || 'none'}</div>
  ),
}))

const LocationProbe = () => {
  const location = useLocation()
  return <div data-testid="location-path">{location.pathname}</div>
}

const renderLabelStudioRoute = (initialEntry: string) =>
  render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
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
  it('keeps only the combined workflows and opens the designer sheet from the template library', async () => {
    const user = userEvent.setup()

    render(
      <MemoryRouter initialEntries={['/tools/labels/templates']}>
        <Routes>
          <Route path="/tools/labels/:tab" element={<LabelStudioPage />} />
        </Routes>
      </MemoryRouter>,
    )

    expect(screen.getByRole('button', { name: 'Templates' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Preview & Batch' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Design' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Downloads' })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Open template designer' }))

    expect(screen.getByTestId('designer-sheet')).toBeInTheDocument()
    expect(screen.getByTestId('designer-sheet')).toHaveAttribute(
      'data-panel-width',
      'min(100vw, clamp(64rem, 84vw, 110rem))',
    )
    expect(screen.getByText('Designer template: template-1')).toBeInTheDocument()
  })

  it('shares the selected template with the preview workflow', async () => {
    const user = userEvent.setup()

    render(
      <MemoryRouter initialEntries={['/tools/labels/templates']}>
        <Routes>
          <Route path="/tools/labels/:tab" element={<LabelStudioPage />} />
        </Routes>
      </MemoryRouter>,
    )

    await user.click(screen.getByRole('button', { name: 'Open template designer' }))
    await user.click(screen.getByRole('button', { name: 'Preview & Batch' }))

    expect(screen.getByText('Preview template: template-1')).toBeInTheDocument()
  })

  it('canonicalizes legacy design and downloads routes to the combined tabs', async () => {
    renderLabelStudioRoute('/tools/labels/design')

    expect(screen.getByTestId('location-path')).toHaveTextContent('/tools/labels/templates')

    renderLabelStudioRoute('/tools/labels/downloads')

    expect(screen.getAllByTestId('location-path')[1]).toHaveTextContent('/tools/labels/preview-batch')
  })
})

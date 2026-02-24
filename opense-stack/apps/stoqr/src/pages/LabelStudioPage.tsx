import { useCompany } from '../contexts/CompanyContext'
import { BasePage } from '../components/BasePage'
import { Tabs } from '../components/Tabs'
import { TemplateLibraryTab } from '../components/LabelStudio/TemplateLibraryTab'
import { LabelDesignerTab } from '../components/LabelStudio/LabelDesignerTab'
import { LabelPreviewBatchTab } from '../components/LabelStudio/LabelPreviewBatchTab'

export const LabelStudioPage = () => {
  const { companyId } = useCompany()

  return (
    <BasePage
      companyId={companyId}
      isLoading={false}
      emptyStateTitle="No company selected"
      emptyStateDescription="Choose a company to access label tools."
    >
      <div className="card" style={{ marginBottom: 16 }}>
        <h1 style={{ margin: 0 }}>Label Studio</h1>
      </div>
      <Tabs
        tabs={[
          { id: 'templates', label: 'Templates', content: <TemplateLibraryTab companyId={companyId || ''} /> },
          { id: 'design', label: 'Design', content: <LabelDesignerTab companyId={companyId || ''} /> },
          { id: 'preview-batch', label: 'Preview & Batch', content: <LabelPreviewBatchTab companyId={companyId || ''} /> },
        ]}
      />
    </BasePage>
  )
}
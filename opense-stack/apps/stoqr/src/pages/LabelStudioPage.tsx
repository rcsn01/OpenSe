import { useCompany } from '../contexts/CompanyContext'
import { useNavigate, useParams } from 'react-router-dom'
import { BasePage } from '../components/BasePage'
import { Tabs } from '../components/Tabs'
import { TemplateLibraryTab } from '../components/LabelStudio/TemplateLibraryTab'
import { LabelDesignerTab } from '../components/LabelStudio/LabelDesignerTab'
import { LabelPreviewBatchTab } from '../components/LabelStudio/LabelPreviewBatchTab'
import { LabelDownloadsTab } from '../components/LabelStudio/LabelDownloadsTab'

export const LabelStudioPage = () => {
  const { companyId } = useCompany()
  const navigate = useNavigate()
  const { tab } = useParams<{ tab?: string }>()
  const validTabs = ['templates', 'design', 'preview-batch', 'downloads'] as const
  const activeTab = validTabs.includes((tab ?? '') as (typeof validTabs)[number]) ? tab! : 'templates'

  return (
    <BasePage
      companyId={companyId}
      isLoading={false}
      emptyStateTitle="No company selected"
      emptyStateDescription="Choose a company to access label tools."
    >
      <Tabs
        activeTab={activeTab}
        onTabChange={(nextTab) => navigate(`/tools/labels/${nextTab}`)}
        tabs={[
          { id: 'templates', label: 'Templates', content: <TemplateLibraryTab companyId={companyId || ''} /> },
          { id: 'design', label: 'Design', content: <LabelDesignerTab companyId={companyId || ''} /> },
          { id: 'preview-batch', label: 'Preview & Batch', content: <LabelPreviewBatchTab companyId={companyId || ''} /> },
          { id: 'downloads', label: 'Downloads', content: <LabelDownloadsTab companyId={companyId || ''} /> },
        ]}
      />
    </BasePage>
  )
}
import { useEffect, useState } from 'react'
import { SideSheet, SideSheetBody, SideSheetContent } from '@repo/ui'
import { useCompany } from '../contexts/CompanyContext'
import { useNavigate, useOutletContext, useParams } from 'react-router-dom'
import { BasePage } from '../components/BasePage'
import { Tabs } from '../components/Tabs'
import { TemplateLibraryTab } from '../components/LabelStudio/TemplateLibraryTab'
import { LabelDesignerTab } from '../components/LabelStudio/LabelDesignerTab'
import { LabelPreviewBatchTab } from '../components/LabelStudio/LabelPreviewBatchTab'
import type { AppLayoutOutletContext } from '../layouts/AppLayout'

const labelStudioTabAliases = {
  design: 'templates',
  downloads: 'preview-batch',
} as const

const validTabs = ['templates', 'preview-batch'] as const

type LabelStudioTab = (typeof validTabs)[number]

const resolveTab = (tab: string | undefined): LabelStudioTab => {
  if (tab && tab in labelStudioTabAliases) {
    return labelStudioTabAliases[tab as keyof typeof labelStudioTabAliases]
  }

  return validTabs.includes((tab ?? '') as LabelStudioTab) ? (tab as LabelStudioTab) : 'templates'
}

export const LabelStudioPage = () => {
  const { companyId } = useCompany()
  const navigate = useNavigate()
  const layoutContext = useOutletContext<AppLayoutOutletContext | null>()
  const { tab } = useParams<{ tab?: string }>()
  const activeTab = resolveTab(tab)
  const topBarSearchValue = layoutContext?.topBarSearchValue ?? ''
  const [selectedTemplateId, setSelectedTemplateId] = useState('')
  const [isDesignerOpen, setIsDesignerOpen] = useState(false)

  useEffect(() => {
    if (tab !== activeTab) {
      navigate(`/tools/labels/${activeTab}`, { replace: true })
    }
  }, [activeTab, navigate, tab])

  const openDesigner = (templateId: string) => {
    setSelectedTemplateId(templateId)
    setIsDesignerOpen(true)
  }

  return (
    <BasePage
      companyId={companyId}
      isLoading={false}
      emptyStateTitle="No company selected"
      emptyStateDescription="Choose a company to access label tools."
    >
      <>
        <Tabs
          activeTab={activeTab}
          onTabChange={(nextTab) => navigate(`/tools/labels/${nextTab}`)}
          bottomSpacing
          tabs={[
            {
              id: 'templates',
              label: 'Templates',
              content: (
                <TemplateLibraryTab
                  companyId={companyId || ''}
                  selectedTemplateId={selectedTemplateId}
                  onSelectTemplate={openDesigner}
                  searchTerm={activeTab === 'templates' ? topBarSearchValue : ''}
                />
              ),
            },
            {
              id: 'preview-batch',
              label: 'Preview & Batch',
              content: (
                <LabelPreviewBatchTab
                  companyId={companyId || ''}
                  selectedTemplateId={selectedTemplateId}
                  onSelectedTemplateChange={setSelectedTemplateId}
                  searchTerm={activeTab === 'preview-batch' ? topBarSearchValue : ''}
                />
              ),
            },
          ]}
        />

        <SideSheet open={isDesignerOpen} onClose={() => setIsDesignerOpen(false)} size="page">
          <SideSheetContent className="label-studio-sheet">
            <SideSheetBody className="label-studio-sheet-body">
              <LabelDesignerTab
                companyId={companyId || ''}
                selectedTemplateId={selectedTemplateId}
                onSelectedTemplateChange={setSelectedTemplateId}
                onClose={() => setIsDesignerOpen(false)}
              />
            </SideSheetBody>
          </SideSheetContent>
        </SideSheet>
      </>
    </BasePage>
  )
}

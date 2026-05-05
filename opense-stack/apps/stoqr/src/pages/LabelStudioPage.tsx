import { useEffect } from 'react'
import { useCompany } from '../contexts/CompanyContext'
import { useLocation, useNavigate, useOutletContext, useParams, useSearchParams } from 'react-router-dom'
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
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const layoutContext = useOutletContext<AppLayoutOutletContext | null>()
  const { tab, templateId } = useParams<{ tab?: string; templateId?: string }>()
  const activeTab = resolveTab(tab)
  const topBarSearchValue = layoutContext?.topBarSearchValue ?? ''
  const rememberedTemplateId = searchParams.get('template') ?? ''
  const selectedTemplateId = templateId ?? rememberedTemplateId
  const isDesignerPage = activeTab === 'templates' && Boolean(templateId)

  const buildLabelStudioPath = (
    nextTab: LabelStudioTab,
    nextTemplateId = selectedTemplateId,
    openDesigner = false,
  ) => {
    const nextSearchParams = new URLSearchParams(searchParams)

    if (nextTemplateId) {
      nextSearchParams.set('template', nextTemplateId)
    } else {
      nextSearchParams.delete('template')
    }

    const search = nextSearchParams.toString()
    const pathname = openDesigner && nextTemplateId
      ? `/tools/labels/templates/${nextTemplateId}`
      : `/tools/labels/${nextTab}`

    return `${pathname}${search ? `?${search}` : ''}`
  }

  const canonicalPath = isDesignerPage
    ? buildLabelStudioPath('templates', templateId, true)
    : buildLabelStudioPath(activeTab, selectedTemplateId, false)

  useEffect(() => {
    const currentPath = `${location.pathname}${location.search}`
    if (currentPath !== canonicalPath) {
      navigate(canonicalPath, { replace: true })
    }
  }, [canonicalPath, location.pathname, location.search, navigate])

  const openDesigner = (templateId: string) => {
    navigate(buildLabelStudioPath('templates', templateId, true))
  }

  const handleTabChange = (nextTab: LabelStudioTab) => {
    navigate(buildLabelStudioPath(nextTab, selectedTemplateId, false))
  }

  const handleSelectedTemplateChange = (nextTemplateId: string) => {
    navigate(buildLabelStudioPath(activeTab, nextTemplateId, false), { replace: true })
  }

  const closeDesigner = () => {
    navigate(buildLabelStudioPath('templates', selectedTemplateId, false))
  }

  return (
    <BasePage
      companyId={companyId}
      isLoading={false}
      emptyStateTitle="No company selected"
      emptyStateDescription="Choose a company to access label tools."
    >
      {isDesignerPage ? (
        <LabelDesignerTab
          companyId={companyId || ''}
          selectedTemplateId={selectedTemplateId}
          onClose={closeDesigner}
          onSavedTemplateChange={(nextTemplateId) => {
            navigate(buildLabelStudioPath('templates', nextTemplateId, true), { replace: true })
          }}
        />
      ) : (
        <Tabs
          activeTab={activeTab}
          onTabChange={(nextTab) => handleTabChange(nextTab as LabelStudioTab)}
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
                  onSelectedTemplateChange={handleSelectedTemplateChange}
                  searchTerm={activeTab === 'preview-batch' ? topBarSearchValue : ''}
                />
              ),
            },
          ]}
        />
      )}
    </BasePage>
  )
}

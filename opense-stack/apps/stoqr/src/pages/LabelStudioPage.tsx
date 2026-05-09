import { useCallback, useEffect } from 'react'
import { useCompany } from '../contexts/CompanyContext'
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ContentTabs } from '@repo/ui'
import { StoqrPageShell } from '../components/StoqrPageShell'
import { TemplateLibraryTab } from '../components/LabelStudio/TemplateLibraryTab'
import { LabelPreviewBatchTab } from '../components/LabelStudio/LabelPreviewBatchTab'
import '../components/LabelStudio/LabelStudioSurface.css'

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
  const { tab } = useParams<{ tab?: string }>()
  const activeTab = resolveTab(tab)
  const rememberedTemplateId = searchParams.get('template') ?? ''
  const selectedTemplateId = rememberedTemplateId

  const buildLabelStudioPath = useCallback((
    nextTab: LabelStudioTab,
    nextTemplateId = selectedTemplateId,
  ) => {
    const nextSearchParams = new URLSearchParams(searchParams)

    if (nextTemplateId) {
      nextSearchParams.set('template', nextTemplateId)
    } else {
      nextSearchParams.delete('template')
    }

    const search = nextSearchParams.toString()
    const pathname = `/tools/labels/${nextTab}`

    return `${pathname}${search ? `?${search}` : ''}`
  }, [searchParams, selectedTemplateId])

  const canonicalPath = buildLabelStudioPath(activeTab, selectedTemplateId)

  useEffect(() => {
    const currentPath = `${location.pathname}${location.search}`
    if (currentPath !== canonicalPath) {
      navigate(canonicalPath, { replace: true })
    }
  }, [canonicalPath, location.pathname, location.search, navigate])

  const openDesigner = useCallback((templateId: string) => {
    const nextSearchParams = new URLSearchParams(searchParams)
    nextSearchParams.set('template', templateId)

    const search = nextSearchParams.toString()
    navigate(`/tools/labels/templates/${templateId}${search ? `?${search}` : ''}`)
  }, [navigate, searchParams])

  const handleTabChange = useCallback((nextTab: LabelStudioTab) => {
    navigate(buildLabelStudioPath(nextTab, selectedTemplateId))
  }, [buildLabelStudioPath, navigate, selectedTemplateId])

  const handleSelectedTemplateChange = useCallback((nextTemplateId: string) => {
    navigate(buildLabelStudioPath(activeTab, nextTemplateId), { replace: true })
  }, [activeTab, buildLabelStudioPath, navigate])

  return (
    <StoqrPageShell
      companyId={companyId}
      isLoading={false}
      emptyStateTitle="No company selected"
      emptyStateDescription="Choose a company to access label tools."
    >
      <ContentTabs
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
              />
            ),
          },
        ]}
      />
    </StoqrPageShell>
  )
}

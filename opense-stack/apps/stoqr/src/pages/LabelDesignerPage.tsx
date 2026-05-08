import { useCallback, useEffect, useMemo } from 'react'
import { useCompany } from '../contexts/CompanyContext'
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { BasePage } from '../components/BasePage'
import { LabelDesignerTab } from '../components/LabelStudio/LabelDesignerTab'
import { usePageTopBarSearch, useTopBarSearchValue } from '../components/Search/TopBarSearch'
import {
  buildLabelTemplateSearchSuggestions,
  filterLabelTemplates,
  getLabelTemplateIdFromSuggestion,
} from '../components/LabelStudio/templateSearch'
import { useLabelTemplates } from '../hooks/queries/useLabelStudio'
import '../components/LabelStudio/LabelStudioSurface.css'

export const LabelDesignerPage = () => {
  const { companyId } = useCompany()
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const { templateId } = useParams<{ templateId?: string }>()
  const { data: templates = [] } = useLabelTemplates(companyId)
  const { searchValue } = useTopBarSearchValue()
  const filteredTemplates = useMemo(
    () => filterLabelTemplates(templates, searchValue),
    [searchValue, templates],
  )

  const buildDesignerPath = useCallback((nextTemplateId = templateId ?? '') => {
    if (!nextTemplateId) {
      return '/tools/labels/templates'
    }

    const nextSearchParams = new URLSearchParams(searchParams)
    nextSearchParams.set('template', nextTemplateId)

    const search = nextSearchParams.toString()
    const pathname = `/tools/labels/templates/${nextTemplateId}`

    return `${pathname}${search ? `?${search}` : ''}`
  }, [searchParams, templateId])

  const buildTemplatesPath = useCallback((nextTemplateId = templateId ?? '') => {
    const nextSearchParams = new URLSearchParams(searchParams)

    if (nextTemplateId) {
      nextSearchParams.set('template', nextTemplateId)
    } else {
      nextSearchParams.delete('template')
    }

    const search = nextSearchParams.toString()

    return `/tools/labels/templates${search ? `?${search}` : ''}`
  }, [searchParams, templateId])

  const canonicalPath = buildDesignerPath()
  const handleSearchSuggestionSelect = useCallback((suggestion: { id: string }) => {
    navigate(buildDesignerPath(getLabelTemplateIdFromSuggestion(suggestion)))
  }, [buildDesignerPath, navigate])

  useEffect(() => {
    const currentPath = `${location.pathname}${location.search}`
    if (currentPath !== canonicalPath) {
      navigate(canonicalPath, { replace: true })
    }
  }, [canonicalPath, location.pathname, location.search, navigate])

  usePageTopBarSearch(useMemo(() => ({
    searchKey: 'label-studio-designer',
    placeholder: 'Search templates...',
    defaultSuggestions: [
      { id: 'labels-templates', title: 'Label Templates', subtitle: 'Open and manage saved label templates', value: 'template', badge: 'Labels' },
    ],
    suggestions: buildLabelTemplateSearchSuggestions(filteredTemplates),
    onSuggestionSelect: handleSearchSuggestionSelect,
  }), [filteredTemplates, handleSearchSuggestionSelect]))

  return (
    <BasePage
      companyId={companyId}
      isLoading={false}
      emptyStateTitle="No company selected"
      emptyStateDescription="Choose a company to access label tools."
    >
      <LabelDesignerTab
        companyId={companyId || ''}
        selectedTemplateId={templateId}
        onClose={() => {
          navigate(buildTemplatesPath())
        }}
        onSavedTemplateChange={(nextTemplateId) => {
          navigate(buildDesignerPath(nextTemplateId), { replace: true })
        }}
      />
    </BasePage>
  )
}

import type { LabelTemplate } from '../../api/labelStudio'
import {
  fuzzyRankings,
  fuzzySearchItems,
  normalizePageSearchTerm,
  type SearchSuggestion,
} from '../../lib/pageSearch'
import { getLabelLayoutSummary } from './labelLayout'

const labelTemplateSuggestionPrefix = 'label-template-'

export const filterLabelTemplates = (templates: LabelTemplate[], searchTerm: string) => (
  fuzzySearchItems(templates, normalizePageSearchTerm(searchTerm), [
    {
      key: (template) => template.name,
      maxRanking: fuzzyRankings.WORD_STARTS_WITH,
    },
    {
      key: (template) => {
        const summary = getLabelLayoutSummary(template.layout)
        return [summary.size, summary.type, summary.fields]
      },
      maxRanking: fuzzyRankings.CONTAINS,
    },
  ])
)

export const buildLabelTemplateSearchSuggestions = (templates: LabelTemplate[]): SearchSuggestion[] => (
  templates.slice(0, 8).map((template) => {
    const summary = getLabelLayoutSummary(template.layout)
    return {
      id: `${labelTemplateSuggestionPrefix}${template.id}`,
      title: template.name,
      subtitle: `${summary.size} · ${summary.type}`,
      value: template.name,
      badge: 'Template',
    }
  })
)

export const getLabelTemplateIdFromSuggestion = (suggestion: Pick<SearchSuggestion, 'id'>) => (
  suggestion.id.replace(/^label-template-/, '')
)

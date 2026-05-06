import { describe, expect, it } from 'vitest'
import type { LabelTemplate } from '../../../api/labelStudio'
import {
  buildLabelTemplateSearchSuggestions,
  filterLabelTemplates,
  getLabelTemplateIdFromSuggestion,
} from '../templateSearch'

const templates: LabelTemplate[] = [
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
]

describe('templateSearch helpers', () => {
  it('filters templates using the shared template search logic', () => {
    expect(filterLabelTemplates([...templates], 'ship')).toEqual([templates[0]])
  })

  it('builds top-bar search suggestions for label templates', () => {
    expect(buildLabelTemplateSearchSuggestions([...templates])).toEqual([
      {
        id: 'label-template-template-1',
        title: 'Shipping Label',
        subtitle: '100mm x 50mm · 12pt / left',
        value: 'Shipping Label',
        badge: 'Template',
      },
      {
        id: 'label-template-template-2',
        title: 'Returns Label',
        subtitle: '100mm x 50mm · 12pt / left',
        value: 'Returns Label',
        badge: 'Template',
      },
    ])
  })

  it('extracts the template id from a top-bar suggestion', () => {
    expect(getLabelTemplateIdFromSuggestion({ id: 'label-template-template-2' })).toBe('template-2')
  })
})

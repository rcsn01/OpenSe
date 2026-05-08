import { describe, expect, it } from 'vitest'
import { buildProductSearchSuggestions, getProductSearchDestination } from '../useProductPageSearch'

describe('useProductPageSearch helpers', () => {
  it('builds product suggestions for the shared top-bar search', () => {
    expect(buildProductSearchSuggestions([
      {
        id: 'prod-1',
        name: 'Existing Widget',
        sku: 'EX-001',
        quantity_on_hand: 4,
      },
      {
        id: 'prod-2',
        name: 'Other Widget',
        sku: 'OT-002',
        quantity_on_hand: 12,
      },
    ])).toEqual([
      {
        id: 'product-search-prod-1',
        title: 'Existing Widget',
        subtitle: 'EX-001 · 4 on hand',
        value: 'Existing Widget',
        keywords: ['Existing Widget', 'EX-001'],
        badge: 'Product',
      },
      {
        id: 'product-search-prod-2',
        title: 'Other Widget',
        subtitle: 'OT-002 · 12 on hand',
        value: 'Other Widget',
        keywords: ['Other Widget', 'OT-002'],
        badge: 'Product',
      },
    ])
  })

  it('maps a search suggestion back to the product overview route', () => {
    expect(getProductSearchDestination({ id: 'product-search-prod-2' })).toBe('/inventory/prod-2/overview')
  })
})

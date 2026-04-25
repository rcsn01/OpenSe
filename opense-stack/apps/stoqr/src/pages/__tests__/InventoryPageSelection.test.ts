import { describe, expect, it } from 'vitest'
import { getNextSelectedRowIdsForVisibleToggle } from '../InventoryPage'

describe('InventoryPage selection helpers', () => {
  it('selects all visible products while preserving existing hidden selections', () => {
    const next = getNextSelectedRowIdsForVisibleToggle(new Set(['hidden-product']), ['visible-1', 'visible-2'])

    expect(Array.from(next).sort()).toEqual(['hidden-product', 'visible-1', 'visible-2'])
  })

  it('clears visible products when every visible product is already selected', () => {
    const next = getNextSelectedRowIdsForVisibleToggle(
      new Set(['hidden-product', 'visible-1', 'visible-2']),
      ['visible-1', 'visible-2'],
    )

    expect(Array.from(next)).toEqual(['hidden-product'])
  })

  it('does not clear current selections when there are no visible products', () => {
    const next = getNextSelectedRowIdsForVisibleToggle(new Set(['hidden-product']), [])

    expect(Array.from(next)).toEqual(['hidden-product'])
  })
})

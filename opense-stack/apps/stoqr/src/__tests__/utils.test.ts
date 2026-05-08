import { describe, expect, it } from 'vitest'

import { parseCsv } from '../utils'

describe('parseCsv', () => {
  it('preserves commas inside quoted cells', () => {
    const result = parseCsv('Name,Description\nWidget,"Large, blue widget"')

    expect(result.headers).toEqual(['Name', 'Description'])
    expect(result.rows).toEqual([
      { Name: 'Widget', Description: 'Large, blue widget' },
    ])
  })

  it('keeps blank cells as empty strings', () => {
    const result = parseCsv('Name,SKU,Description\nWidget,ABC,\nGadget,,Second item')

    expect(result.rows).toEqual([
      { Name: 'Widget', SKU: 'ABC', Description: '' },
      { Name: 'Gadget', SKU: '', Description: 'Second item' },
    ])
  })

  it('trims header names and cell values', () => {
    const result = parseCsv(' Name , SKU \n Widget , ABC-1 ')

    expect(result.headers).toEqual(['Name', 'SKU'])
    expect(result.rows).toEqual([
      { Name: 'Widget', SKU: 'ABC-1' },
    ])
  })
})
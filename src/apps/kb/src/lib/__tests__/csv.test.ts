import { describe, expect, it } from 'vitest'
import { escapeCsv, parseCsv } from '../csv'

describe('csv helpers', () => {
  it('escapes quoted and multiline values', () => {
    expect(escapeCsv('hello, "Open-KB"\nnext')).toBe('"hello, ""Open-KB""\nnext"')
  })

  it('parses quoted csv fields', () => {
    expect(parseCsv('title,description\n"One, two","Line ""quoted"""')).toEqual([
      ['title', 'description'],
      ['One, two', 'Line "quoted"'],
    ])
  })
})

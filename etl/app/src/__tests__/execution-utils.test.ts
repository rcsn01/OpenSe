/**
 * Test suite for lib/execution/utils.ts
 *
 * Covers the refactored toCsv function (Audit P4: RFC 4180 compliance)
 * and related utility functions.
 *
 * Note: loadRows and persistRows depend on IndexedDB (Dexie) which
 * requires a real or fake IDB implementation. Those are tested
 * separately via integration tests. Here we focus on pure functions.
 */
import { describe, it, expect } from 'vitest'
import { toCsv } from '../lib/execution/utils'

describe('toCsv', () => {
  describe('happy path', () => {
    it('converts simple rows to CSV', () => {
      const rows = [
        { name: 'Alice', age: 30 },
        { name: 'Bob', age: 25 },
      ]
      const csv = toCsv(rows)
      expect(csv).toBe('name,age\nAlice,30\nBob,25')
    })

    it('handles single row', () => {
      const rows = [{ id: 1, value: 'test' }]
      const csv = toCsv(rows)
      expect(csv).toBe('id,value\n1,test')
    })

    it('handles many columns', () => {
      const rows = [{ a: 1, b: 2, c: 3, d: 4, e: 5 }]
      const csv = toCsv(rows)
      expect(csv).toBe('a,b,c,d,e\n1,2,3,4,5')
    })
  })

  describe('RFC 4180 compliance (Audit P4)', () => {
    it('quotes fields containing commas', () => {
      const rows = [{ name: 'Smith, John', age: 30 }]
      const csv = toCsv(rows)
      expect(csv).toBe('name,age\n"Smith, John",30')
    })

    it('quotes fields containing double quotes and escapes them', () => {
      const rows = [{ quote: 'He said "hello"', val: 1 }]
      const csv = toCsv(rows)
      expect(csv).toBe('quote,val\n"He said ""hello""",1')
    })

    it('quotes fields containing newlines', () => {
      const rows = [{ text: 'line1\nline2', id: 1 }]
      const csv = toCsv(rows)
      expect(csv).toBe('text,id\n"line1\nline2",1')
    })

    it('quotes fields containing carriage returns', () => {
      const rows = [{ text: 'line1\rline2', id: 1 }]
      const csv = toCsv(rows)
      expect(csv).toBe('text,id\n"line1\rline2",1')
    })

    it('handles field with comma AND double quote', () => {
      const rows = [{ val: 'a "b", c' }]
      const csv = toCsv(rows)
      expect(csv).toBe('val\n"a ""b"", c"')
    })

    it('does not quote fields that do not need quoting', () => {
      const rows = [{ name: 'Alice', age: 30 }]
      const csv = toCsv(rows)
      // No quotes around simple values
      expect(csv).not.toContain('"Alice"')
      expect(csv).not.toContain('"30"')
    })
  })

  describe('edge cases', () => {
    it('returns empty string for empty array', () => {
      expect(toCsv([])).toBe('')
    })

    it('handles null values as empty strings', () => {
      const rows = [{ name: null, age: 25 }]
      const csv = toCsv(rows)
      expect(csv).toBe('name,age\n,25')
    })

    it('handles undefined values as empty strings', () => {
      const rows = [{ name: undefined, age: 25 }]
      const csv = toCsv(rows)
      expect(csv).toBe('name,age\n,25')
    })

    it('handles boolean values', () => {
      const rows = [{ active: true, deleted: false }]
      const csv = toCsv(rows)
      expect(csv).toBe('active,deleted\ntrue,false')
    })

    it('handles numeric zero', () => {
      const rows = [{ count: 0 }]
      const csv = toCsv(rows)
      expect(csv).toBe('count\n0')
    })

    it('handles empty string values', () => {
      const rows = [{ name: '', age: 25 }]
      const csv = toCsv(rows)
      expect(csv).toBe('name,age\n,25')
    })

    it('handles header names that need quoting', () => {
      const rows = [{ 'first,name': 'Alice' }]
      const csv = toCsv(rows)
      // Header should be quoted since it contains a comma
      expect(csv).toContain('"first,name"')
    })
  })
})

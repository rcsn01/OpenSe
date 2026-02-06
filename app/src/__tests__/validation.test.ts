/**
 * Test suite for lib/validation.ts
 *
 * Covers all validators created in the refactoring:
 * - Password strength (Audit S2)
 * - UUID validation
 * - Text sanitisation
 * - Email validation
 * - Workflow import schema validation (Audit S5)
 */
import { describe, it, expect } from 'vitest'
import {
  validatePassword,
  isValidUUID,
  sanitizeText,
  isValidEmail,
  validateWorkflowImport,
} from '../lib/validation'

// ─────────────────────────────────────────────
// Password Validation
// ─────────────────────────────────────────────
describe('validatePassword', () => {
  describe('happy path', () => {
    it('accepts a strong password', () => {
      const result = validatePassword('MyP@ssw0rd!')
      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('accepts password at exact minimum length', () => {
      const result = validatePassword('Aa1!xxxx') // 8 chars
      expect(result.valid).toBe(true)
    })

    it('accepts password with many special characters', () => {
      const result = validatePassword('T3st!@#$%^&*()')
      expect(result.valid).toBe(true)
    })
  })

  describe('edge cases', () => {
    it('rejects empty string', () => {
      const result = validatePassword('')
      expect(result.valid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
    })

    it('rejects null/undefined coerced to empty', () => {
      const result = validatePassword(null as any)
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Password is required.')
    })

    it('rejects exactly 7 characters even if complex', () => {
      const result = validatePassword('Aa1!xxx') // 7 chars
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Password must be at least 8 characters.')
    })

    it('rejects password exceeding 128 characters', () => {
      const longPwd = 'Aa1!' + 'x'.repeat(126)
      expect(longPwd.length).toBeGreaterThan(128)
      const result = validatePassword(longPwd)
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Password must be at most 128 characters.')
    })
  })

  describe('error handling - missing character classes', () => {
    it('rejects password without uppercase', () => {
      const result = validatePassword('myp@ssw0rd')
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Password must contain at least one uppercase letter.')
    })

    it('rejects password without lowercase', () => {
      const result = validatePassword('MYP@SSW0RD')
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Password must contain at least one lowercase letter.')
    })

    it('rejects password without digit', () => {
      const result = validatePassword('MyP@ssword!')
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Password must contain at least one digit.')
    })

    it('rejects password without special character', () => {
      const result = validatePassword('MyPassw0rd')
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Password must contain at least one special character.')
    })

    it('collects multiple errors at once', () => {
      const result = validatePassword('short')
      expect(result.valid).toBe(false)
      // Should report: too short, no uppercase, no digit, no special char
      expect(result.errors.length).toBeGreaterThanOrEqual(3)
    })
  })
})

// ─────────────────────────────────────────────
// UUID Validation
// ─────────────────────────────────────────────
describe('isValidUUID', () => {
  describe('happy path', () => {
    it('accepts a valid v4 UUID', () => {
      expect(isValidUUID('550e8400-e29b-41d4-a716-446655440000')).toBe(true)
    })

    it('accepts uppercase UUID', () => {
      expect(isValidUUID('550E8400-E29B-41D4-A716-446655440000')).toBe(true)
    })
  })

  describe('edge cases', () => {
    it('rejects empty string', () => {
      expect(isValidUUID('')).toBe(false)
    })

    it('rejects non-string input', () => {
      expect(isValidUUID(123)).toBe(false)
      expect(isValidUUID(null)).toBe(false)
      expect(isValidUUID(undefined)).toBe(false)
    })

    it('rejects UUID without dashes', () => {
      expect(isValidUUID('550e8400e29b41d4a716446655440000')).toBe(false)
    })

    it('rejects random string', () => {
      expect(isValidUUID('not-a-uuid')).toBe(false)
    })

    it('rejects UUID with invalid version', () => {
      // Version 0 is not valid (position 15 must be 1-5)
      expect(isValidUUID('550e8400-e29b-01d4-a716-446655440000')).toBe(false)
    })
  })
})

// ─────────────────────────────────────────────
// Text Sanitisation
// ─────────────────────────────────────────────
describe('sanitizeText', () => {
  describe('happy path', () => {
    it('returns trimmed text unchanged', () => {
      expect(sanitizeText('Hello World')).toBe('Hello World')
    })

    it('trims leading and trailing whitespace', () => {
      expect(sanitizeText('  hello  ')).toBe('hello')
    })
  })

  describe('XSS prevention', () => {
    it('strips HTML tags', () => {
      expect(sanitizeText('<script>alert("xss")</script>Hello')).toBe('alert("xss")Hello')
    })

    it('strips nested HTML', () => {
      expect(sanitizeText('<div><b>bold</b></div>')).toBe('bold')
    })

    it('handles HTML entities in text', () => {
      expect(sanitizeText('a < b > c')).toBe('a c')
    })
  })

  describe('edge cases', () => {
    it('handles empty string', () => {
      expect(sanitizeText('')).toBe('')
    })

    it('handles non-string input', () => {
      expect(sanitizeText(123 as any)).toBe('')
    })

    it('collapses multiple whitespace', () => {
      expect(sanitizeText('hello   \t\n  world')).toBe('hello world')
    })

    it('truncates to maxLength', () => {
      const long = 'a'.repeat(300)
      expect(sanitizeText(long, 10)).toBe('aaaaaaaaaa')
      expect(sanitizeText(long, 10).length).toBe(10)
    })

    it('uses default maxLength of 255', () => {
      const long = 'b'.repeat(500)
      expect(sanitizeText(long).length).toBe(255)
    })
  })
})

// ─────────────────────────────────────────────
// Email Validation
// ─────────────────────────────────────────────
describe('isValidEmail', () => {
  describe('happy path', () => {
    it('accepts standard email', () => {
      expect(isValidEmail('user@example.com')).toBe(true)
    })

    it('accepts email with subdomain', () => {
      expect(isValidEmail('user@mail.example.com')).toBe(true)
    })

    it('accepts email with plus addressing', () => {
      expect(isValidEmail('user+tag@example.com')).toBe(true)
    })
  })

  describe('edge cases', () => {
    it('rejects empty string', () => {
      expect(isValidEmail('')).toBe(false)
    })

    it('rejects non-string', () => {
      expect(isValidEmail(null)).toBe(false)
    })

    it('rejects missing @', () => {
      expect(isValidEmail('userexample.com')).toBe(false)
    })

    it('rejects missing domain', () => {
      expect(isValidEmail('user@')).toBe(false)
    })

    it('rejects email with spaces', () => {
      expect(isValidEmail('user @example.com')).toBe(false)
    })
  })
})

// ─────────────────────────────────────────────
// Workflow Import Validation
// ─────────────────────────────────────────────
describe('validateWorkflowImport', () => {
  describe('happy path', () => {
    it('accepts valid workflow with graph_data', () => {
      const input = {
        name: 'My Workflow',
        graph_data: {
          nodes: [
            { id: 'n1', type: 'file', position: { x: 0, y: 0 }, data: {} },
          ],
          edges: [
            { id: 'e1', source: 'n1', target: 'n2' },
          ],
        },
      }
      const result = validateWorkflowImport(input)
      expect(result.valid).toBe(true)
      if (result.valid) {
        expect(result.data.name).toBe('My Workflow')
      }
    })

    it('accepts valid workflow with nodes/edges at root level', () => {
      const input = {
        nodes: [
          { id: 'n1', type: 'file', position: { x: 100, y: 200 }, data: {} },
        ],
        edges: [],
      }
      const result = validateWorkflowImport(input)
      expect(result.valid).toBe(true)
    })

    it('accepts workflow with empty nodes and edges', () => {
      const result = validateWorkflowImport({ nodes: [], edges: [] })
      expect(result.valid).toBe(true)
    })

    it('sanitises the name field', () => {
      const result = validateWorkflowImport({
        name: '<script>alert("xss")</script>Workflow',
        nodes: [],
        edges: [],
      })
      expect(result.valid).toBe(true)
      if (result.valid) {
        expect(result.data.name).toBe('alert("xss")Workflow')
      }
    })
  })

  describe('error handling', () => {
    it('rejects null', () => {
      const result = validateWorkflowImport(null)
      expect(result.valid).toBe(false)
      if (!result.valid) {
        expect(result.error).toContain('JSON object')
      }
    })

    it('rejects non-object', () => {
      const result = validateWorkflowImport('string')
      expect(result.valid).toBe(false)
    })

    it('rejects nodes that are not an array', () => {
      const result = validateWorkflowImport({ nodes: 'not-an-array' })
      expect(result.valid).toBe(false)
      if (!result.valid) {
        expect(result.error).toContain('"nodes" must be an array')
      }
    })

    it('rejects edges that are not an array', () => {
      const result = validateWorkflowImport({ edges: 42 })
      expect(result.valid).toBe(false)
    })

    it('rejects node without id', () => {
      const result = validateWorkflowImport({
        nodes: [{ type: 'file', position: { x: 0, y: 0 } }],
      })
      expect(result.valid).toBe(false)
      if (!result.valid) {
        expect(result.error).toContain('missing a valid "id"')
      }
    })

    it('rejects node without type', () => {
      const result = validateWorkflowImport({
        nodes: [{ id: 'n1', position: { x: 0, y: 0 } }],
      })
      expect(result.valid).toBe(false)
      if (!result.valid) {
        expect(result.error).toContain('missing a valid "type"')
      }
    })

    it('rejects node without position', () => {
      const result = validateWorkflowImport({
        nodes: [{ id: 'n1', type: 'file' }],
      })
      expect(result.valid).toBe(false)
      if (!result.valid) {
        expect(result.error).toContain('missing a valid "position"')
      }
    })

    it('rejects edge without source', () => {
      const result = validateWorkflowImport({
        nodes: [],
        edges: [{ target: 'n2' }],
      })
      expect(result.valid).toBe(false)
      if (!result.valid) {
        expect(result.error).toContain('missing a valid "source"')
      }
    })

    it('rejects edge without target', () => {
      const result = validateWorkflowImport({
        nodes: [],
        edges: [{ source: 'n1' }],
      })
      expect(result.valid).toBe(false)
      if (!result.valid) {
        expect(result.error).toContain('missing a valid "target"')
      }
    })
  })
})

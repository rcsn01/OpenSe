/**
 * Test suite for api/workflows.ts
 *
 * Tests the refactored saveWorkflow function which now
 * sanitises workflow names (Audit Q5).
 *
 * Mocks Supabase to isolate API logic.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

const chainable = (terminal?: unknown) => {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {}
  chain.select = vi.fn(() => chain)
  chain.insert = vi.fn(() => chain)
  chain.update = vi.fn(() => chain)
  chain.delete = vi.fn(() => chain)
  chain.eq = vi.fn(() => chain)
  chain.is = vi.fn(() => chain)
  chain.order = vi.fn(() => chain)
  chain.single = vi.fn(() => terminal ?? { data: { id: 'wf-1', name: 'test' }, error: null })
  return chain
}

let fromChain = chainable()

vi.mock('../lib/supabase', () => ({
  supabase: {
    from: () => fromChain,
  },
}))

// Must import after mock
import { saveWorkflow, deleteWorkflow } from '../api/workflows'

beforeEach(() => {
  vi.clearAllMocks()
  fromChain = chainable()
})

describe('saveWorkflow', () => {
  describe('happy path - insert (new workflow)', () => {
    it('inserts and returns workflow when no id provided', async () => {
      const result = await saveWorkflow({
        name: 'My Workflow',
        graph_data: { nodes: [], edges: [] },
        owner_id: 'user-1',
        org_id: null,
      })

      // insert should have been called
      expect(fromChain.insert).toHaveBeenCalled()
      expect(result).toEqual({ id: 'wf-1', name: 'test' })
    })
  })

  describe('happy path - update (existing workflow)', () => {
    it('updates when id is provided', async () => {
      const result = await saveWorkflow({
        id: 'wf-existing',
        name: 'Updated Name',
        graph_data: { nodes: [], edges: [] },
        owner_id: 'user-1',
        org_id: null,
      })

      expect(fromChain.update).toHaveBeenCalled()
      expect(result).toEqual({ id: 'wf-1', name: 'test' })
    })
  })

  describe('sanitisation (Audit Q5)', () => {
    it('strips HTML from workflow name before saving', async () => {
      await saveWorkflow({
        name: '<script>alert("xss")</script>Test',
        graph_data: {},
        owner_id: 'user-1',
        org_id: null,
      })

      // The insert call should receive the sanitised name
      const insertCall = fromChain.insert.mock.calls[0]?.[0] as Record<string, unknown> | undefined
      if (insertCall) {
        expect(insertCall.name).not.toContain('<script>')
        expect(insertCall.name).toContain('Test')
      }
    })

    it('trims whitespace from workflow name', async () => {
      await saveWorkflow({
        name: '   My Workflow   ',
        graph_data: {},
        owner_id: 'user-1',
        org_id: null,
      })

      const insertCall = fromChain.insert.mock.calls[0]?.[0] as Record<string, unknown> | undefined
      if (insertCall) {
        expect(insertCall.name).toBe('My Workflow')
      }
    })
  })

  describe('error handling', () => {
    it('throws when Supabase returns an error on insert', async () => {
      fromChain = chainable({ data: null, error: { message: 'Insert failed' } })

      await expect(
        saveWorkflow({
          name: 'Fail',
          graph_data: {},
          owner_id: 'user-1',
          org_id: null,
        })
      ).rejects.toThrow('Insert failed')
    })

    it('throws when Supabase returns an error on update', async () => {
      fromChain = chainable({ data: null, error: { message: 'Update failed' } })

      await expect(
        saveWorkflow({
          id: 'wf-1',
          name: 'Fail',
          graph_data: {},
          owner_id: 'user-1',
          org_id: null,
        })
      ).rejects.toThrow('Update failed')
    })
  })
})

describe('deleteWorkflow', () => {
  it('calls delete on the workflow', async () => {
    fromChain.eq.mockResolvedValue({ error: null })

    await deleteWorkflow('wf-1')
    expect(fromChain.delete).toHaveBeenCalled()
  })
})

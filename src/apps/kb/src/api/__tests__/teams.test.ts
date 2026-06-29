import { describe, expect, it, vi } from 'vitest'

vi.mock('../../supabaseClient', () => ({
  db: {
    from: vi.fn(),
  },
}))

import { buildTeamInsertPayload } from '../teams'
import { openKbLightPalette } from '../../lib/openKbColors'

describe('teams API helpers', () => {
  it('builds team creation payloads with a light metadata color', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)

    expect(buildTeamInsertPayload({
      organisation_id: 'org',
      name: ' Product Team ',
      description_text: ' Owns product ',
    })).toMatchObject({
      organisation_id: 'org',
      name: 'Product Team',
      slug: 'product-team',
      description_text: 'Owns product',
      status: 'active',
      metadata: { color: openKbLightPalette[0] },
    })

    vi.restoreAllMocks()
  })

  it('preserves supplied metadata and normalizes supplied colors', () => {
    expect(buildTeamInsertPayload({
      organisation_id: 'org',
      name: 'Design',
      metadata: { color: 'ABC', icon: 'paint' },
    }).metadata).toEqual({ color: '#aabbcc', icon: 'paint' })
  })
})

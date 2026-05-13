import { describe, expect, it, vi } from 'vitest'
import { dispatchMattermost, dispatchTelegram, formatChatMessage, type DispatchPayload } from './adapters.js'

const payload: DispatchPayload = {
  deliveryId: 'delivery-1',
  companyId: 'company-1',
  channel: 'telegram',
  connectorId: 'connector-1',
  targetId: 'target-1',
  targetName: 'Ops',
  targetType: 'channel',
  providerTargetId: 'chat-1',
  alert: {
    id: 'event-1',
    type: 'low_stock',
    severity: 'high',
    message: 'PCR Tips is low.',
    triggeredAt: '2026-05-13T00:00:00Z',
    productName: 'PCR Tips',
    productSku: 'TIP-001',
    organisationName: 'Open StoQR',
    text: 'PCR Tips is low.',
  },
}

describe('alert connector adapters', () => {
  it('formats a compact alert message', () => {
    expect(formatChatMessage(payload)).toContain('StoQR low stock alert')
    expect(formatChatMessage(payload)).toContain('PCR Tips is low.')
    expect(formatChatMessage(payload)).toContain('Product: PCR Tips (TIP-001)')
  })

  it('dispatches Telegram messages through the Bot API', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true, result: { message_id: 42 } }),
    })

    await expect(dispatchTelegram(payload, 'token', fetchImpl as unknown as typeof fetch)).resolves.toEqual({ messageId: '42' })
    expect(fetchImpl).toHaveBeenCalledWith(
      'https://api.telegram.org/bottoken/sendMessage',
      expect.objectContaining({ method: 'POST' }),
    )
  })

  it('dispatches Mattermost messages through a configured webhook', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => 'ok',
    })

    await expect(dispatchMattermost(
      { ...payload, channel: 'mattermost', providerTargetId: 'ops' },
      { webhookMapJson: JSON.stringify({ ops: 'https://mattermost.example/hooks/ops' }) },
      fetchImpl as unknown as typeof fetch,
    )).resolves.toEqual({ messageId: 'delivery-1' })

    expect(fetchImpl).toHaveBeenCalledWith(
      'https://mattermost.example/hooks/ops',
      expect.objectContaining({ method: 'POST' }),
    )
  })

  it('dispatches Mattermost messages through a direct webhook URL', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => 'ok',
    })

    await expect(dispatchMattermost(
      { ...payload, channel: 'mattermost', providerTargetId: 'https://mattermost.example/hooks/direct' },
      {},
      fetchImpl as unknown as typeof fetch,
    )).resolves.toEqual({ messageId: 'delivery-1' })

    expect(fetchImpl).toHaveBeenCalledWith(
      'https://mattermost.example/hooks/direct',
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('PCR Tips is low.'),
      }),
    )
  })

  it('dispatches Mattermost messages through the bot posts API for channel targets', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: 'post-1' }),
    })

    await expect(dispatchMattermost(
      { ...payload, channel: 'mattermost', providerTargetId: 'channel:channel-1' },
      { baseUrl: 'https://mattermost.example/', botToken: 'mm-token' },
      fetchImpl as unknown as typeof fetch,
    )).resolves.toEqual({ messageId: 'post-1' })

    expect(fetchImpl).toHaveBeenCalledWith(
      'https://mattermost.example/api/v4/posts',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ Authorization: 'Bearer mm-token' }),
        body: expect.stringContaining('"channel_id":"channel-1"'),
      }),
    )
  })

  it('requires bot API config for Mattermost channel targets', async () => {
    await expect(dispatchMattermost(
      { ...payload, channel: 'mattermost', providerTargetId: 'channel:channel-1' },
      {},
    )).rejects.toThrow('Mattermost bot API is not configured for channel targets')
  })
})

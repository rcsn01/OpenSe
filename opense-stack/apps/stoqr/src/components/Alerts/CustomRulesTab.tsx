import { useState } from 'react'
import { useAlertRules, useCreateAlertRule, useUpdateAlertRuleEnabled } from '../../hooks/queries/useAlerts'

export const CustomRulesTab = ({ companyId }: { companyId: string }) => {
  const { data: rules = [], isLoading } = useAlertRules(companyId)
  const createRuleMutation = useCreateAlertRule(companyId)
  const toggleRuleMutation = useUpdateAlertRuleEnabled(companyId)

  const [name, setName] = useState('')
  const [alertType, setAlertType] = useState<'low_stock' | 'reorder_point' | 'expiration' | 'custom'>('custom')
  const [conditionText, setConditionText] = useState('{"threshold": 1}')
  const [channelsText, setChannelsText] = useState('in_app,email')
  const [recipientsText, setRecipientsText] = useState('')
  const [message, setMessage] = useState<string | null>(null)

  const createRule = async () => {
    setMessage(null)
    try {
      const condition = JSON.parse(conditionText)
      const channels = channelsText
        .split(',')
        .map((entry) => entry.trim())
        .filter(Boolean) as Array<'in_app' | 'email' | 'push'>

      await createRuleMutation.mutateAsync({
        name,
        alertType,
        condition,
        deliveryChannels: channels.length > 0 ? channels : ['in_app'],
        recipients: recipientsText.split(',').map((entry) => entry.trim()).filter(Boolean),
      })

      setName('')
      setRecipientsText('')
      setMessage('Rule created.')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Failed to create rule.')
    }
  }

  return (
    <div className="grid" style={{ gridTemplateColumns: '360px 1fr', gap: 24 }}>
      <div className="card stack">
        <h3 className="section-title">Create Custom Rule</h3>
        <label className="stack">
          Rule Name
          <input className="input" value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. High-value loss alert" />
        </label>
        <label className="stack">
          Alert Type
          <select className="select" value={alertType} onChange={(event) => setAlertType(event.target.value as 'low_stock' | 'reorder_point' | 'expiration' | 'custom')}>
            <option value="low_stock">Low Stock</option>
            <option value="reorder_point">Reorder Point</option>
            <option value="expiration">Expiration</option>
            <option value="custom">Custom</option>
          </select>
        </label>
        <label className="stack">
          Condition JSON
          <textarea className="input" style={{ minHeight: 90 }} value={conditionText} onChange={(event) => setConditionText(event.target.value)} />
        </label>
        <label className="stack">
          Delivery Channels
          <input className="input" value={channelsText} onChange={(event) => setChannelsText(event.target.value)} placeholder="in_app,email,push" />
        </label>
        <label className="stack">
          Recipients
          <input className="input" value={recipientsText} onChange={(event) => setRecipientsText(event.target.value)} placeholder="ops@example.com, owner@example.com" />
        </label>
        <button className="button" onClick={createRule} disabled={createRuleMutation.isPending || !name.trim()}>Create Rule</button>
        {message && <div className="small muted">{message}</div>}
      </div>

      <div className="card stack">
        <h3 className="section-title">Custom Alert Rules</h3>
        {isLoading ? (
          <div className="empty-state">Loading rules...</div>
        ) : rules.length === 0 ? (
          <div className="empty-state">No rules configured.</div>
        ) : (
          <div className="list">
            {rules.map((rule) => (
              <div key={rule.id} className="flex-between" style={{ padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                <div>
                  <div style={{ fontWeight: 700 }}>{rule.name}</div>
                  <div className="small muted">{rule.alert_type} · {rule.delivery_channels.join(', ')}</div>
                </div>
                <button
                  className="button ghost small"
                  onClick={() => toggleRuleMutation.mutate({ ruleId: rule.id, enabled: !rule.enabled })}
                  disabled={toggleRuleMutation.isPending}
                >
                  {rule.enabled ? 'Disable' : 'Enable'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

import { listNotificationSettings, NotificationSetting } from '../api/notifications'

type AlertPayload = {
  workflowName: string
  status: 'failed' | 'success'
  errorMessage?: string
  timestamp: string
}

/**
 * Fires all configured notifications for a workflow after execution failure.
 *
 * Channel handlers:
 * - Email: Logs to console (production would use Supabase Edge Function or SMTP).
 * - Slack: POSTs a formatted message to the configured Slack webhook URL.
 * - Webhook: POSTs a JSON payload to the configured URL with optional custom headers.
 */
export const fireNotifications = async (workflowId: string, payload: AlertPayload): Promise<void> => {
  let settings: NotificationSetting[]
  try {
    settings = await listNotificationSettings(workflowId)
  } catch {
    return // Silently skip if we can't fetch settings
  }

  const enabledSettings = settings.filter((s) => s.enabled)
  if (enabledSettings.length === 0) return

  const promises = enabledSettings.map((setting) => {
    switch (setting.channel) {
      case 'email':
        return fireEmailAlert(setting, payload)
      case 'slack':
        return fireSlackAlert(setting, payload)
      case 'webhook':
        return fireWebhookAlert(setting, payload)
      default:
        return Promise.resolve()
    }
  })

  await Promise.allSettled(promises)
}

/**
 * Email alert — in production, this would call a Supabase Edge Function
 * or server-side email API. For now, logs to console as a placeholder.
 */
const fireEmailAlert = async (setting: NotificationSetting, payload: AlertPayload): Promise<void> => {
  const recipients = setting.config?.recipients as string[] | undefined
  if (!recipients?.length) return

  // Placeholder: In production, invoke a Supabase Edge Function:
  // await supabase.functions.invoke('send-alert-email', { body: { recipients, ...payload } })
  console.info(
    `[Notification:Email] Would send to ${recipients.join(', ')}:`,
    `Workflow "${payload.workflowName}" ${payload.status} at ${payload.timestamp}`,
    payload.errorMessage ? `Error: ${payload.errorMessage}` : ''
  )
}

/**
 * Slack alert — POSTs a formatted block message to a Slack incoming webhook.
 */
const fireSlackAlert = async (setting: NotificationSetting, payload: AlertPayload): Promise<void> => {
  const webhookUrl = setting.config?.webhook_url as string | undefined
  if (!webhookUrl) return

  const statusEmoji = payload.status === 'failed' ? ':x:' : ':white_check_mark:'
  const text = `${statusEmoji} *Workflow "${payload.workflowName}"* ${payload.status}${
    payload.errorMessage ? `\n> ${payload.errorMessage}` : ''
  }\n_${new Date(payload.timestamp).toLocaleString()}_`

  try {
    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    })
  } catch (err) {
    console.warn('[Notification:Slack] Failed to send:', err)
  }
}

/**
 * Generic webhook — POSTs the full payload as JSON to a user-configured URL.
 */
const fireWebhookAlert = async (setting: NotificationSetting, payload: AlertPayload): Promise<void> => {
  const url = setting.config?.url as string | undefined
  if (!url) return

  const method = (setting.config?.method as string) || 'POST'
  const customHeaders = (setting.config?.headers as Record<string, string>) || {}

  try {
    await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json', ...customHeaders },
      body: JSON.stringify({
        event: 'workflow_execution',
        workflow_name: payload.workflowName,
        status: payload.status,
        error_message: payload.errorMessage || null,
        timestamp: payload.timestamp,
      }),
    })
  } catch (err) {
    console.warn('[Notification:Webhook] Failed to send:', err)
  }
}

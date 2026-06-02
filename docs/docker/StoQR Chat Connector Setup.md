# StoQR Chat Connector Setup

StoQR alert notifications can be sent to Telegram and Mattermost in addition to in-app and email delivery.

## Architecture

```text
Low-stock alert rule
  -> alert_delivery_logs row
  -> send-stoqr-alert-notifications Edge Function
  -> Telegram Bot API or Mattermost API/webhook
```

Provider secrets live in Supabase Edge Function secrets, not in the browser or Supabase tables.

Email recipients are selected by organisation role on each alert rule. Telegram and Mattermost targets are organisation-wide destinations, but each alert rule chooses the exact targets it sends to. A rule sends one message to each selected connector target.

## Edge Function Secrets

Set the chat provider secrets on the linked Supabase project:

```bash
pnpm --dir src exec supabase --workdir .. secrets set --project-ref YOUR_PROJECT_REF \
  TELEGRAM_BOT_TOKEN='123456:bot-token' \
  MATTERMOST_WEBHOOKS_JSON='{}' \
  MATTERMOST_BASE_URL='https://mattermost.example.com' \
  MATTERMOST_BOT_TOKEN='mattermost-token' \
  STOQR_ALERT_DISPATCH_TOKEN='change-me-too'
```

Only set the Mattermost values you use. Incoming webhook targets need `MATTERMOST_WEBHOOKS_JSON` only when StoQR stores a webhook key instead of a direct webhook URL. Bot channel targets need `MATTERMOST_BASE_URL` and `MATTERMOST_BOT_TOKEN`.

Remove any obsolete gateway URL/token secrets if they exist; chat alerts no longer call a gateway service.

## Automatic Dispatch

Low-stock alert triggers enqueue an asynchronous call to `send-stoqr-alert-notifications` using `pg_net`. Configure the dispatch endpoint after reset/deploy:

```sql
INSERT INTO stoqr.alert_dispatch_config (singleton, function_url, dispatch_token)
VALUES (
  true,
  'https://YOUR_PROJECT_REF.functions.supabase.co/send-stoqr-alert-notifications',
  'change-me-too'
)
ON CONFLICT (singleton) DO UPDATE
SET function_url = EXCLUDED.function_url,
    dispatch_token = EXCLUDED.dispatch_token,
    updated_at = timezone('utc'::text, now());
```

The token must match the `STOQR_ALERT_DISPATCH_TOKEN` Edge Function secret. `ALERT_EMAIL_DISPATCH_TOKEN` is still accepted as a legacy fallback.

`send-stoqr-alert-notifications` must allow non-JWT requests because the database trigger authenticates with `x-alert-dispatch-token`; this is configured in `supabase/config.toml`.

## Providers

### Telegram

Create a Telegram bot with BotFather and set `TELEGRAM_BOT_TOKEN`.

Create a connector target in the StoQR Alerts page with the Telegram chat ID as the provider target ID. Enabled Telegram targets are organisation-wide and receive every alert rule that has Telegram enabled.

### Mattermost Incoming Webhook

Use this when each StoQR target maps to one Mattermost incoming webhook.

Fields needed:

- StoQR target name: a friendly label such as `Warehouse alerts`.
- Provider target ID: either the full incoming webhook URL or a key from `MATTERMOST_WEBHOOKS_JSON`.
- Edge Function secret: `MATTERMOST_WEBHOOKS_JSON` when using keys instead of direct webhook URLs.

Store webhook URLs in `MATTERMOST_WEBHOOKS_JSON`:

```json
{
  "warehouse": "https://mattermost.example/hooks/..."
}
```

Create a StoQR connector target with provider target ID `warehouse`. Direct webhook URLs are also accepted for local/self-hosted testing, but secret keys are preferred for production.

### Mattermost Bot Token Channel

Use this when one Mattermost bot account should post to multiple channel targets.

Fields needed:

- `MATTERMOST_BASE_URL`: your Mattermost server URL, for example `https://mattermost.example.com`.
- `MATTERMOST_BOT_TOKEN`: a bot account token or personal access token with permission to post.
- StoQR target name: a friendly label such as `Warehouse alerts`.
- Provider target ID: the Mattermost Channel ID. StoQR stores this as `channel:<channel-id>` automatically when you choose Bot token channel in the editor.

Bot-token targets are dispatched to:

```text
POST MATTERMOST_BASE_URL/api/v4/posts
Authorization: Bearer MATTERMOST_BOT_TOKEN
```

## Deploy

Deploy the generic dispatcher and connector management functions:

```bash
pnpm --dir src exec supabase --workdir .. functions deploy send-stoqr-alert-notifications --project-ref YOUR_PROJECT_REF --use-api
pnpm --dir src exec supabase --workdir .. functions deploy manage-stoqr-alert-connectors --project-ref YOUR_PROJECT_REF --use-api
```

The older `send-stoqr-alert-emails` function remains for email-only compatibility. New UI actions call `send-stoqr-alert-notifications`.

## Troubleshooting

`TELEGRAM_BOT_TOKEN is not configured`

Set `TELEGRAM_BOT_TOKEN` as a Supabase Edge Function secret.

`Mattermost webhook is not configured for target`

Add the target key to `MATTERMOST_WEBHOOKS_JSON`, or use a direct webhook URL as the provider target ID for local testing.

`Mattermost bot API is not configured for channel targets`

Set `MATTERMOST_BASE_URL` and `MATTERMOST_BOT_TOKEN` as Supabase Edge Function secrets, then redeploy or restart the function locally.

Mattermost returns `403 Forbidden`

Check that the token is valid and that the bot or personal-access-token user is a member of the target channel.

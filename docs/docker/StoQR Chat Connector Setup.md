# StoQR Chat Connector Setup

StoQR alert notifications can be sent to Telegram, Mattermost, and WhatsApp in addition to in-app and email delivery.

## Architecture

```text
Low-stock alert rule
  -> alert_delivery_logs row
  -> send-stoqr-alert-notifications Edge Function
  -> alert connector gateway
  -> Telegram, Mattermost, or WhatsApp
```

Provider secrets and WhatsApp session files live in the connector gateway, not the browser or Supabase tables.

Email recipients are selected by organisation role on each alert rule. Telegram, Mattermost, and WhatsApp targets are organisation-wide destinations, but each alert rule chooses the exact targets it sends to. A rule sends one message to each selected connector target.

## Gateway

The gateway is the `@repo/alert-connectors` workspace app.

Development:

```bash
cd opense-stack
pnpm --filter @repo/alert-connectors dev
```

Docker development:

```bash
cd opense-stack
docker compose -f docker-compose.dev.yml up alert-connectors
```

Production compose includes an `alert-connectors` service on port `6075` and a persistent `alert-connector-sessions` volume for WhatsApp linked-device sessions.

## Environment

Set these values in the gateway environment and as Supabase Edge Function secrets where noted.

```env
CONNECTOR_GATEWAY_URL=http://localhost:6075
CONNECTOR_GATEWAY_TOKEN=change-me
CONNECTOR_SESSION_DIR=./apps/alert-connectors/sessions
TELEGRAM_BOT_TOKEN=
STOQR_ALERT_DISPATCH_TOKEN=change-me-too
MATTERMOST_WEBHOOKS_JSON={}
MATTERMOST_BASE_URL=
MATTERMOST_BOT_TOKEN=
```

Supabase Edge Functions need:

```bash
npx supabase secrets set --project-ref YOUR_PROJECT_REF \
  CONNECTOR_GATEWAY_URL=https://your-public-gateway.example.com \
  CONNECTOR_GATEWAY_TOKEN='change-me' \
  STOQR_ALERT_DISPATCH_TOKEN='change-me-too' \
  ALERT_EMAIL_DISPATCH_TOKEN='change-me-too'
```

If Supabase is hosted, `CONNECTOR_GATEWAY_URL` must be publicly reachable by Supabase.

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

The repo root `./setup.sh` helper re-applies this row after a full reset so automatic low-stock dispatch keeps working after database resets.

`send-stoqr-alert-notifications` must allow non-JWT requests because the database trigger authenticates with `x-alert-dispatch-token`; this is configured in `supabase/config.toml`.

## Providers

### Telegram

Create a Telegram bot with BotFather and set `TELEGRAM_BOT_TOKEN`.

Create a connector target in the StoQR Alerts page with the Telegram chat ID as the provider target ID. Enabled Telegram targets are organisation-wide and receive every alert rule that has Telegram enabled.

### Mattermost

StoQR supports two Mattermost delivery modes.

#### Option A: Incoming webhook

Use this when you want the quickest setup and each StoQR target maps to one Mattermost incoming webhook.

Fields needed:

- StoQR target name: a friendly label such as `Warehouse alerts`.
- Provider target ID: either the full incoming webhook URL or a key from `MATTERMOST_WEBHOOKS_JSON`.
- Gateway env: `MATTERMOST_WEBHOOKS_JSON` when using keys instead of direct webhook URLs.

How to get the webhook URL:

1. In Mattermost, open Product menu > Integrations > Incoming Webhooks.
2. If Incoming Webhooks is missing, ask a System Admin to enable incoming webhooks in System Console > Integrations > Integration Management.
3. Select Add Incoming Webhook.
4. Enter a name and description, choose the channel, and optionally lock the webhook to that channel.
5. Save and copy the generated webhook URL. Treat it like a secret.

Store webhook URLs in `MATTERMOST_WEBHOOKS_JSON`:

```json
{
  "warehouse": "https://mattermost.example/hooks/..."
}
```

Create a StoQR connector target with provider target ID `warehouse`. Direct webhook URLs are also accepted for local/self-hosted testing, but env keys are preferred. Enabled Mattermost targets are organisation-wide and receive every alert rule that has Mattermost enabled.

#### Option B: Bot token channel

Use this when you want a Hermes-style Mattermost bot account that posts via the Mattermost REST API. This is better when you want one bot identity and multiple StoQR channel targets.

Fields needed:

- `MATTERMOST_BASE_URL`: your Mattermost server URL, for example `https://mattermost.example.com`.
- `MATTERMOST_BOT_TOKEN`: a bot account token or personal access token with permission to post.
- StoQR target name: a friendly label such as `Warehouse alerts`.
- Provider target ID: the Mattermost Channel ID. StoQR stores this as `channel:<channel-id>` automatically when you choose Bot token channel in the editor.

How to get the bot token:

1. Log in as a Mattermost System Admin.
2. Go to System Console > Integrations > Bot Accounts and enable bot account creation if it is disabled.
3. Open Product menu > Integrations > Bot Accounts.
4. Add a bot account such as `stoqr-alerts`.
5. Copy the generated bot token immediately; Mattermost only shows it once.
6. Add the bot account to every channel that should receive StoQR alerts.

If bot accounts are not available, a personal access token can also work. A System Admin must enable personal access tokens, then the user creates one from Profile > Security > Personal Access Tokens. The token posts as that user, so a dedicated bot account is usually cleaner.

How to get the Channel ID:

1. Open the Mattermost channel.
2. Click the channel name.
3. Choose View Info and copy the Channel ID.
4. In StoQR, select Mattermost > Bot token channel and paste the Channel ID.

Bot-token targets are dispatched to:

```text
POST MATTERMOST_BASE_URL/api/v4/posts
Authorization: Bearer MATTERMOST_BOT_TOKEN
```

### WhatsApp

Create or open a WhatsApp connector in the StoQR Alerts page and click Pair. The UI calls `manage-stoqr-alert-connectors`, which asks the gateway to start a Baileys WhatsApp Web session.

Scan the QR text with WhatsApp Linked Devices. Session files are stored in `CONNECTOR_SESSION_DIR`.

Once connected, add a WhatsApp target using the chat or group JID returned by the gateway or known from gateway logs.

Enabled WhatsApp targets are organisation-wide and receive every alert rule that has WhatsApp enabled.

## Dispatch

Deploy the generic dispatcher and connector management functions:

```bash
npx supabase functions deploy send-stoqr-alert-notifications --project-ref YOUR_PROJECT_REF
npx supabase functions deploy manage-stoqr-alert-connectors --project-ref YOUR_PROJECT_REF
```

The older `send-stoqr-alert-emails` function remains for email-only compatibility. New UI actions call `send-stoqr-alert-notifications`.

## Troubleshooting

`Connector gateway environment is not configured`

Set `CONNECTOR_GATEWAY_URL` and `CONNECTOR_GATEWAY_TOKEN` as Supabase secrets.

`Unauthorized`

The gateway bearer token does not match `CONNECTOR_GATEWAY_TOKEN`.

`WhatsApp connector is not connected`

Pair WhatsApp again from the Alerts page. Sessions can expire or be logged out from the WhatsApp mobile app.

`Mattermost webhook is not configured for target`

Add the target key to `MATTERMOST_WEBHOOKS_JSON`, or use a direct webhook URL as the provider target ID for local testing.

`Mattermost bot API is not configured for channel targets`

Set `MATTERMOST_BASE_URL` and `MATTERMOST_BOT_TOKEN` on the connector gateway, restart it, and make sure the StoQR provider target ID is a Mattermost Channel ID created with Bot token channel mode.

Mattermost returns `403 Forbidden`

Check that the token is valid and that the bot or personal-access-token user is a member of the target channel.

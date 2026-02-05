# Organization Creation Stack - FIXED ✅

The organization creation flow with Stripe & Supabase has been re-implemented with robust error handling, idempotency, and a solution for the race condition.

## ✅ What Was Fixed

### 1. Edge Function: `create-checkout/index.ts`
- **Environment-based Price IDs**: Now reads from `STRIPE_PRICE_ID_TIER_1`, `STRIPE_PRICE_ID_TIER_2`, `STRIPE_PRICE_ID_TIER_3` instead of hardcoded placeholders
- **Robust Error Handling**: All errors return proper JSON with status codes and details
- **Detailed Logging**: Console logs for debugging in Supabase dashboard
- **Input Validation**: Validates all required fields before calling Stripe
- **Subscription Metadata**: Adds metadata to both session and subscription for durability

### 2. Edge Function: `stripe-webhook/index.ts`
- **Idempotency**: Checks both by `stripe_subscription_id` and by `owner_id + name` to prevent duplicates
- **Timestamp Validation**: Prevents replay attacks with 5-minute tolerance
- **Rollback on Failure**: If member insertion fails, the organisation is rolled back
- **Subscription Status Updates**: Handles `subscription.updated` and `subscription.deleted` events
- **Detailed Logging**: Full audit trail in Supabase logs

### 3. Frontend: `OrganisationPage.tsx`
- **Provisioning State**: Shows "Setting up your organisation..." when returning from Stripe
- **Polling Mechanism**: Polls every 2 seconds for up to 30 seconds until org appears
- **Canceled Handling**: Shows friendly message when user cancels checkout
- **Auto-redirect**: Cleans URL params and redirects after success

### 4. New Component: `OrganisationProvisioning.tsx`
- Visual progress indicator during provisioning
- Retry mechanism if provisioning times out
- Success/error states with appropriate actions

### 5. API: `organisations.ts`
- Added `pollForOrganisation()` function with configurable polling
- Proper type annotations for `findProfileByEmail()`

---

## 🔧 Environment Variables to Set

Set these in your **Supabase Dashboard** → **Project Settings** → **Edge Functions** → **Secrets**:

| Variable | Description | Example |
|----------|-------------|---------|
| `STRIPE_SECRET_KEY` | Your Stripe secret key (starts with `sk_`) | `sk_live_abc123...` or `sk_test_abc123...` |
| `STRIPE_WEBHOOK_SECRET` | Webhook signing secret (starts with `whsec_`) | `whsec_abc123...` |
| `STRIPE_PRICE_ID_TIER_1` | Price ID for Starter tier | `price_1234abcd` |
| `STRIPE_PRICE_ID_TIER_2` | Price ID for Pro tier | `price_5678efgh` |
| `STRIPE_PRICE_ID_TIER_3` | Price ID for Enterprise tier | `price_9012ijkl` |

### How to Get These Values:

1. **Stripe Secret Key**: Stripe Dashboard → Developers → API Keys
2. **Webhook Secret**: Created when you add a webhook endpoint (see below)
3. **Price IDs**: Stripe Dashboard → Products → Click your product → Copy Price ID

---

## 🧪 Testing Locally with Stripe CLI

### 1. Install Stripe CLI
```bash
brew install stripe/stripe-cli/stripe
```

### 2. Login to Stripe
```bash
stripe login
```

### 3. Forward Webhooks to Local Supabase
```bash
# Forward to your local Supabase (if running locally)
stripe listen --forward-to http://localhost:54321/functions/v1/stripe-webhook

# OR forward to production Supabase
stripe listen --forward-to https://olpzobhscfrksdufivle.supabase.co/functions/v1/stripe-webhook
```

The CLI will output a webhook signing secret like `whsec_abc123...` — use this for local testing.

### 4. Trigger Test Events
```bash
# Trigger a checkout completion event
stripe trigger checkout.session.completed

# Trigger with custom metadata
stripe trigger checkout.session.completed --add checkout_session:metadata.org_name="Test Org" --add checkout_session:metadata.tier="tier-1" --add checkout_session:metadata.user_id="your-user-uuid"
```

---

## 🔗 Production Webhook Setup

1. Go to **Stripe Dashboard** → **Developers** → **Webhooks**
2. Click **Add endpoint**
3. Enter URL: `https://olpzobhscfrksdufivle.supabase.co/functions/v1/stripe-webhook`
4. Select events to listen for:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_failed`
5. Click **Add endpoint**
6. Copy the **Signing secret** and add it as `STRIPE_WEBHOOK_SECRET` in Supabase

---

## 🚀 Testing the Full Flow

1. **Start the dev server**:
   ```bash
   cd app && npm run dev
   ```

2. **Navigate to** `/organisation` (logged in, no org)

3. **Click "Create Organisation"** tab

4. **Select a tier** and enter an org name

5. **Click "Create Organisation"** — should redirect to Stripe

6. **Complete checkout** with test card `4242 4242 4242 4242`

7. **After redirect**, you should see:
   - "Setting up your organisation..." progress indicator
   - After a few seconds, your new org dashboard

8. **Check Supabase logs** for webhook processing details

---

## 📋 Debugging Checklist

If something isn't working:

- [ ] Check Supabase Edge Function logs: Dashboard → Edge Functions → Logs
- [ ] Verify all env vars are set in Supabase Secrets
- [ ] Ensure Price IDs start with `price_` and exist in Stripe
- [ ] Check webhook is registered in Stripe Dashboard
- [ ] Run `stripe listen` locally to see webhook payloads
- [ ] Verify user exists in `profiles` table (webhook needs valid `user_id`)
- [ ] Check RLS policies allow service role to insert into `organisations` and `organisation_members`
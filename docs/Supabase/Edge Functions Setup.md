# Deploy All Functions
To deploy every function in your `supabase/functions` folder at once:
```bash
npx supabase functions deploy
```
# Deploy Specific Functions
You can also deploy them individually. This is often safer if you need to apply specific flags (like skipping JWT verification for webhooks).

**For the Checkout Function:**
```Bash
npx supabase functions deploy create-checkout
```

**For the Stripe Webhook:**

Since webhooks are triggered by Stripe (not a logged-in user), you usually need to bypass the default JWT verification.
```Bash
npx supabase functions deploy stripe-webhook --no-verify-jwt
```
### Important: Setting Secrets

Your `create-checkout` and `stripe-webhook` functions rely on environment variables (like `STRIPE_SECRET_KEY`) that are likely in your local `.env`. These are **not** automatically uploaded.

You must set these secrets in your production Supabase project:
```Bash
npx supabase secrets set STRIPE_SECRET_KEY=sk_live_... STRIPE_WEBHOOK_SECRET=whsec_...
```

_(You can verify which secrets your functions need by checking `Deno.env.get()` calls in your function code.)_

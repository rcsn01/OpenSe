To implement the "Switch Plan" feature, the industry standard is to update the existing subscription rather than canceling and creating a new one. This preserves the billing cycle, payment method, and history. Stripe handles the proration (calculating the cost difference) automatically.

Here is the implementation plan for your Supabase + Stripe stack:
1. The Strategy

    Frontend: Call a new Edge Function update-subscription with the orgId and new tier.

    Edge Function:

        Fetch the organization's stripe_subscription_id.

        Find the current "Subscription Item" (the line item for the plan).

        Call Stripe to update that item to the new Price ID.

        Update the subscription's metadata with the new tier name.

    Webhook: Listen for customer.subscription.updated (which triggers immediately after the Edge Function runs) and update the tier column in your database.

2. Create the Edge Function

Create a new folder and file: supabase/functions/update-subscription/index.ts.
TypeScript

// supabase/functions/update-subscription/index.ts
import { createClient } from "jsr:@supabase/supabase-js@2";
import Stripe from "npm:stripe@14.14.0"; // Use a consistent Stripe version

const serve = Deno.serve;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Helper to map tier names to Price IDs (reused from create-checkout)
function getPriceIdForTier(tier: string): string | null {
  const tierMap: Record<string, string> = {
    "tier-1": Deno.env.get("STRIPE_PRICE_ID_TIER_1") ?? "",
    "tier-2": Deno.env.get("STRIPE_PRICE_ID_TIER_2") ?? "",
    "tier-3": Deno.env.get("STRIPE_PRICE_ID_TIER_3") ?? "",
  };
  return tierMap[tier] || null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    // 1. Auth Check
    const authHeader = req.headers.get("authorization");
    if (!authHeader) throw new Error("Missing Authorization header");
    
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) throw new Error("Unauthorized");

    // 2. Parse Body
    const { orgId, tier } = await req.json();
    if (!orgId || !tier) throw new Error("Missing orgId or tier");

    // 3. Get Org Details & Verify Ownership/Permissions
    // We use the service role here to securely fetch Stripe IDs which might not be exposed to the frontend
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { data: org } = await supabaseAdmin
      .from("organisations")
      .select("stripe_subscription_id, owner_id")
      .eq("id", orgId)
      .single();

    if (!org) throw new Error("Organisation not found");
    
    // Strict check: Only owner or super admin can change billing
    // You can also check the 'admin' role in organisation_members if preferred
    const isOwner = org.owner_id === user.id;
    // (Optional: add super admin check here if needed)
    
    if (!isOwner) throw new Error("Only the organization owner can change plans");
    if (!org.stripe_subscription_id) throw new Error("No active subscription found to update");

    // 4. Initialize Stripe
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") ?? "", {
      apiVersion: "2023-10-16",
    });

    const newPriceId = getPriceIdForTier(tier);
    if (!newPriceId) throw new Error("Invalid tier configuration");

    // 5. Get current subscription items to find which one to update
    const subscription = await stripe.subscriptions.retrieve(org.stripe_subscription_id);
    const itemId = subscription.items.data[0].id; // Assuming 1 plan item per sub

    // 6. Update Subscription
    // This calculates proration and charges/credits the customer immediately or next cycle
    const updatedSub = await stripe.subscriptions.update(org.stripe_subscription_id, {
      items: [{
        id: itemId,
        price: newPriceId,
      }],
      metadata: {
        tier: tier, // Important: Update metadata so webhook knows the new tier name
      },
    });

    return new Response(JSON.stringify({ success: true, tier }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

3. Update the Webhook

Modify supabase/functions/stripe-webhook/index.ts to update the tier column when the subscription is updated.

Find the handleSubscriptionUpdate function and modify it:
TypeScript

// supabase/functions/stripe-webhook/index.ts

async function handleSubscriptionUpdate(subscription: Record<string, unknown>) {
  const subscriptionId = subscription.id as string;
  const status = subscription.status as string;
  const metadata = (subscription.metadata as Record<string, string>) || {};

  console.log(`[stripe-webhook] Subscription ${subscriptionId} status: ${status}`);

  // Map Stripe status
  const statusMap: Record<string, string> = {
    active: "active",
    past_due: "past_due",
    canceled: "canceled",
    unpaid: "unpaid",
    incomplete: "incomplete",
    incomplete_expired: "expired",
    trialing: "trialing",
  };

  const mappedStatus = statusMap[status] ?? status;

  // Prepare update object
  const updates: Record<string, any> = { 
    subscription_status: mappedStatus 
  };

  // If metadata contains tier info (from our update-subscription call), sync it to DB
  if (metadata.tier) {
    updates.tier = metadata.tier;
  }

  const { error } = await supabase
    .from("organisations")
    .update(updates)
    .eq("stripe_subscription_id", subscriptionId);

  if (error) {
    console.error("[stripe-webhook] Failed to update subscription:", error);
    throw error;
  }

  console.log(`[stripe-webhook] Updated org subscription: ${JSON.stringify(updates)}`);
  return { success: true };
}

4. Update Frontend API

Update app/src/api/organisations.ts to call your new function instead of the mock.
TypeScript

// app/src/api/organisations.ts

export const updateOrganisationTier = async (orgId: string, tier: 'tier-1' | 'tier-2' | 'tier-3') => {
  const { data, error } = await supabase.functions.invoke('update-subscription', {
    body: { orgId, tier }
  });

  if (error) throw error;
  return data;
}

5. Deployment

Deploy your functions:
Bash

npx supabase functions deploy update-subscription
npx supabase functions deploy stripe-webhook

How it works from the user's perspective:

    User clicks "Switch Plan" in the UI.

    UI calls Supabase Edge Function.

    Edge Function tells Stripe: "Change the price ID on this subscription to the Pro Plan".

    Stripe calculates the difference. If upgrading mid-cycle, it charges the card immediately for the pro-rated amount.

    Stripe sends a customer.subscription.updated webhook.

    Your Webhook picks up the change and updates the tier column in the organisations table.

    The UI (via React Query) sees the data change and updates the badge to "Pro".
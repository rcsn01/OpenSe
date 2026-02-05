import { createClient } from "jsr:@supabase/supabase-js@2";

const serve = Deno.serve;

// Initialize Supabase client with Service Role (for bypassing RLS)
const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: { persistSession: false },
});

const textEncoder = new TextEncoder();

const toHex = (buffer: ArrayBuffer) => {
  const bytes = new Uint8Array(buffer);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
};

const computeHmacSha256 = async (secret: string, payload: string) => {
  const key = await crypto.subtle.importKey(
    "raw",
    textEncoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, textEncoder.encode(payload));
  return toHex(signature);
};

const timingSafeEqual = (a: string, b: string) => {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i += 1) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
};

const parseStripeSignature = (signatureHeader: string) => {
  const parts = signatureHeader.split(",");
  const result: Record<string, string> = {};
  for (const part of parts) {
    const [key, value] = part.split("=");
    if (key && value) {
      result[key] = value;
    }
  }
  return result;
};

/**
 * Helper to log and return an error
 */
function errorResponse(message: string, status: number) {
  console.error(`[stripe-webhook] Error (${status}): ${message}`);
  return new Response(message, { status });
}

/**
 * Handle checkout.session.completed event
 * Creates the organisation and adds the user as admin
 */
async function handleCheckoutCompleted(session: Record<string, unknown>) {
  const metadata = (session.metadata ?? {}) as Record<string, string>;
  const orgName = metadata.org_name;
  const tier = metadata.tier;
  const userId = metadata.user_id;

  console.log(`[stripe-webhook] Processing checkout for user: ${userId}, org: ${orgName}, tier: ${tier}`);

  // Validate required metadata
  if (!orgName || !tier || !userId) {
    throw new Error(`Missing required metadata: org_name=${orgName}, tier=${tier}, user_id=${userId}`);
  }

  const stripeCustomerId = typeof session.customer === "string" ? session.customer : null;
  const stripeSubscriptionId = typeof session.subscription === "string" ? session.subscription : null;

  // IDEMPOTENCY CHECK 1: Check if org already exists for this subscription
  if (stripeSubscriptionId) {
    const { data: existingBySubscription } = await supabase
      .from("organisations")
      .select("id")
      .eq("stripe_subscription_id", stripeSubscriptionId)
      .limit(1)
      .maybeSingle();

    if (existingBySubscription?.id) {
      console.log(`[stripe-webhook] Organisation already exists for subscription ${stripeSubscriptionId}, skipping`);
      return { success: true, orgId: existingBySubscription.id, status: "already_exists" };
    }
  }

  // IDEMPOTENCY CHECK 2: Check if user already owns an org with same name
  // This prevents duplicate orgs if webhook fires multiple times
  const { data: existingByOwner } = await supabase
    .from("organisations")
    .select("id")
    .eq("owner_id", userId)
    .eq("name", orgName)
    .limit(1)
    .maybeSingle();

  if (existingByOwner?.id) {
    console.log(`[stripe-webhook] User ${userId} already owns org "${orgName}", updating Stripe IDs`);
    
    // Update with Stripe IDs if they weren't set
    await supabase
      .from("organisations")
      .update({
        stripe_customer_id: stripeCustomerId,
        stripe_subscription_id: stripeSubscriptionId,
        subscription_status: "active",
      })
      .eq("id", existingByOwner.id);

    return { success: true, orgId: existingByOwner.id, status: "updated" };
  }

  // Create new organisation
  const { data: org, error: orgError } = await supabase
    .from("organisations")
    .insert({
      name: orgName,
      owner_id: userId,
      tier,
      subscription_status: "active",
      stripe_customer_id: stripeCustomerId,
      stripe_subscription_id: stripeSubscriptionId,
    })
    .select("id")
    .single();

  if (orgError) {
    console.error("[stripe-webhook] Failed to create organisation:", orgError);
    throw new Error(`Failed to create organisation: ${orgError.message}`);
  }

  console.log(`[stripe-webhook] Created organisation: ${org.id}`);

  // Check if user is already a member (shouldn't happen, but be safe)
  const { data: existingMember } = await supabase
    .from("organisation_members")
    .select("id")
    .eq("org_id", org.id)
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();

  if (!existingMember) {
    // Add user as admin of the new organisation
    const { error: memberError } = await supabase
      .from("organisation_members")
      .insert({ 
        org_id: org.id, 
        user_id: userId, 
        role: "admin" 
      });

    if (memberError) {
      console.error("[stripe-webhook] Failed to add member, rolling back org:", memberError);
      // Attempt to rollback the org creation
      await supabase.from("organisations").delete().eq("id", org.id);
      throw new Error(`Failed to add organisation member: ${memberError.message}`);
    }

    console.log(`[stripe-webhook] Added user ${userId} as admin to org ${org.id}`);
  }

  return { success: true, orgId: org.id, status: "created" };
}

/**
 * Handle subscription status changes (cancel, payment_failed, etc.)
 * Also syncs tier changes from metadata when subscription is updated
 */
async function handleSubscriptionUpdate(subscription: Record<string, unknown>) {
  const subscriptionId = subscription.id as string;
  const status = subscription.status as string;
  const metadata = (subscription.metadata as Record<string, string>) || {};

  console.log(`[stripe-webhook] Subscription ${subscriptionId} status: ${status}, metadata:`, metadata);

  // Map Stripe status to our status
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
  const updates: Record<string, unknown> = { 
    subscription_status: mappedStatus 
  };

  // If metadata contains tier info (from update-subscription call), sync it to DB
  if (metadata.tier && ["tier-1", "tier-2", "tier-3"].includes(metadata.tier)) {
    updates.tier = metadata.tier;
    console.log(`[stripe-webhook] Syncing tier change to: ${metadata.tier}`);
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

serve(async (req) => {
  const signature = req.headers.get("stripe-signature");
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET") ?? "";

  if (!signature) {
    return errorResponse("Missing stripe-signature header", 400);
  }
  if (!webhookSecret) {
    console.error("[stripe-webhook] STRIPE_WEBHOOK_SECRET not configured!");
    return errorResponse("Webhook secret not configured", 500);
  }

  const body = await req.text();

  // Verify Stripe signature
  const signatureParams = parseStripeSignature(signature);
  const timestamp = signatureParams.t;
  const v1Signature = signatureParams.v1;

  if (!timestamp || !v1Signature) {
    return errorResponse("Invalid signature header format", 400);
  }

  // Check timestamp to prevent replay attacks (5 minute tolerance)
  const eventTime = parseInt(timestamp, 10) * 1000;
  const now = Date.now();
  const tolerance = 5 * 60 * 1000; // 5 minutes
  if (Math.abs(now - eventTime) > tolerance) {
    return errorResponse("Webhook timestamp outside tolerance window", 400);
  }

  const signedPayload = `${timestamp}.${body}`;
  const expectedSignature = await computeHmacSha256(webhookSecret, signedPayload);

  if (!timingSafeEqual(expectedSignature, v1Signature)) {
    return errorResponse("Invalid signature", 400);
  }

  // Parse and handle the event
  let event: { type: string; data: { object: Record<string, unknown> } };
  try {
    event = JSON.parse(body);
  } catch {
    return errorResponse("Invalid JSON body", 400);
  }

  console.log(`[stripe-webhook] Received event: ${event.type}`);

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const result = await handleCheckoutCompleted(event.data.object);
        console.log(`[stripe-webhook] Checkout completed result:`, result);
        break;
      }

      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        await handleSubscriptionUpdate(event.data.object);
        break;
      }

      case "invoice.payment_failed": {
        // Could add email notification here
        console.log("[stripe-webhook] Payment failed:", event.data.object);
        break;
      }

      default:
        console.log(`[stripe-webhook] Unhandled event type: ${event.type}`);
    }

    return new Response(JSON.stringify({ received: true }), { 
      status: 200,
      headers: { "Content-Type": "application/json" }
    });

  } catch (error) {
    console.error(`[stripe-webhook] Error handling ${event.type}:`, error);
    return errorResponse(
      `Error processing ${event.type}: ${error instanceof Error ? error.message : String(error)}`,
      500
    );
  }
});

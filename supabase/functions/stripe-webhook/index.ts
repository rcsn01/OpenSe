/**
 * Edge Function: stripe-webhook
 *
 * Refactored (Audit Q1): Uses shared response helpers from _shared/.
 * Note: This function does NOT use CORS or JWT auth - it validates
 * Stripe webhook signatures directly.
 */
import { createClient } from "jsr:@supabase/supabase-js@2";
import { isValidTier } from "../_shared/stripe.ts";

// Initialize Supabase client with Service Role (for bypassing RLS)
const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: { persistSession: false },
});

const LABEL = "stripe-webhook";
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
    ["sign"]
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
 * Helper to log and return an error (no CORS on webhooks - only Stripe calls these)
 */
function webhookError(message: string, status: number) {
  console.error(`[${LABEL}] Error (${status}): ${message}`);
  return new Response(message, { status });
}

/**
 * Handle checkout.session.completed event.
 * Creates the organisation and adds the user as admin.
 */
async function handleCheckoutCompleted(session: Record<string, unknown>) {
  const metadata = (session.metadata ?? {}) as Record<string, string>;
  const orgName = metadata.org_name;
  const tier = metadata.tier;
  const userId = metadata.user_id;
  const orgId = metadata.org_id;

  console.log(`[${LABEL}] Processing checkout for user: ${userId}, org: ${orgName}, tier: ${tier}`);

  if (!orgName || !tier || !userId) {
    throw new Error(`Missing required metadata: org_name=${orgName}, tier=${tier}, user_id=${userId}`);
  }

  const stripeCustomerId = typeof session.customer === "string" ? session.customer : null;
  const stripeSubscriptionId = typeof session.subscription === "string" ? session.subscription : null;

  // If org_id provided, attach subscription directly to that org
  if (orgId) {
    const { data: existingOrg, error: existingOrgError } = await supabase
      .from("organisations")
      .select("id")
      .eq("id", orgId)
      .limit(1)
      .maybeSingle();

    if (existingOrgError) {
      console.error(`[${LABEL}] Failed to fetch org by org_id:`, existingOrgError);
    } else if (existingOrg?.id) {
      await supabase
        .from("organisations")
        .update({
          stripe_customer_id: stripeCustomerId,
          stripe_subscription_id: stripeSubscriptionId,
          subscription_status: "active",
          tier,
        })
        .eq("id", existingOrg.id);

      return { success: true, orgId: existingOrg.id, status: "updated_by_id" };
    }
  }

  // IDEMPOTENCY CHECK 1: subscription already processed?
  if (stripeSubscriptionId) {
    const { data: existingBySubscription } = await supabase
      .from("organisations")
      .select("id")
      .eq("stripe_subscription_id", stripeSubscriptionId)
      .limit(1)
      .maybeSingle();

    if (existingBySubscription?.id) {
      console.log(`[${LABEL}] Organisation already exists for subscription ${stripeSubscriptionId}, skipping`);
      return { success: true, orgId: existingBySubscription.id, status: "already_exists" };
    }
  }

  // IDEMPOTENCY CHECK 2: user already owns org with same name?
  const { data: existingByOwner } = await supabase
    .from("organisations")
    .select("id")
    .eq("owner_id", userId)
    .eq("name", orgName)
    .limit(1)
    .maybeSingle();

  if (existingByOwner?.id) {
    console.log(`[${LABEL}] User ${userId} already owns org "${orgName}", updating Stripe IDs and tier`);
    await supabase
      .from("organisations")
      .update({
        stripe_customer_id: stripeCustomerId,
        stripe_subscription_id: stripeSubscriptionId,
        subscription_status: "active",
        tier,
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
    console.error(`[${LABEL}] Failed to create organisation:`, orgError);
    throw new Error(`Failed to create organisation: ${orgError.message}`);
  }

  console.log(`[${LABEL}] Created organisation: ${org.id}`);

  // Check if user is already a member (shouldn't happen, but be safe)
  const { data: existingMember } = await supabase
    .from("organisation_members")
    .select("id")
    .eq("org_id", org.id)
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();

  if (!existingMember) {
    const { error: memberError } = await supabase
      .from("organisation_members")
      .insert({ org_id: org.id, user_id: userId, role: "admin" });

    if (memberError) {
      console.error(`[${LABEL}] Failed to add member, rolling back org:`, memberError);
      await supabase.from("organisations").delete().eq("id", org.id);
      throw new Error(`Failed to add organisation member: ${memberError.message}`);
    }

    console.log(`[${LABEL}] Added user ${userId} as admin to org ${org.id}`);
  }

  return { success: true, orgId: org.id, status: "created" };
}

/**
 * Handle subscription status changes. Also syncs tier from metadata.
 */
async function handleSubscriptionUpdate(subscription: Record<string, unknown>) {
  const subscriptionId = subscription.id as string;
  const status = subscription.status as string;
  const metadata = (subscription.metadata as Record<string, string>) || {};

  console.log(`[${LABEL}] Subscription ${subscriptionId} status: ${status}, metadata:`, metadata);

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
  const updates: Record<string, unknown> = { subscription_status: mappedStatus };

  // Sync tier change if present and valid (uses shared isValidTier)
  if (metadata.tier && isValidTier(metadata.tier)) {
    updates.tier = metadata.tier;
    console.log(`[${LABEL}] Syncing tier change to: ${metadata.tier}`);
  }

  const { error } = await supabase
    .from("organisations")
    .update(updates)
    .eq("stripe_subscription_id", subscriptionId);

  if (error) {
    console.error(`[${LABEL}] Failed to update subscription:`, error);
    throw error;
  }

  console.log(`[${LABEL}] Updated org subscription: ${JSON.stringify(updates)}`);
  return { success: true };
}

Deno.serve(async (req) => {
  const signature = req.headers.get("stripe-signature");
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET") ?? "";

  if (!signature) {
    return webhookError("Missing stripe-signature header", 400);
  }
  if (!webhookSecret) {
    console.error(`[${LABEL}] STRIPE_WEBHOOK_SECRET not configured!`);
    return webhookError("Webhook secret not configured", 500);
  }

  const body = await req.text();

  // Verify Stripe signature
  const signatureParams = parseStripeSignature(signature);
  const timestamp = signatureParams.t;
  const v1Signature = signatureParams.v1;

  if (!timestamp || !v1Signature) {
    return webhookError("Invalid signature header format", 400);
  }

  // Check timestamp to prevent replay attacks (5 minute tolerance)
  const eventTime = parseInt(timestamp, 10) * 1000;
  const now = Date.now();
  const tolerance = 5 * 60 * 1000;
  if (Math.abs(now - eventTime) > tolerance) {
    return webhookError("Webhook timestamp outside tolerance window", 400);
  }

  const signedPayload = `${timestamp}.${body}`;
  const expectedSignature = await computeHmacSha256(webhookSecret, signedPayload);

  if (!timingSafeEqual(expectedSignature, v1Signature)) {
    return webhookError("Invalid signature", 400);
  }

  // Parse and handle the event
  let event: { type: string; data: { object: Record<string, unknown> } };
  try {
    event = JSON.parse(body);
  } catch {
    return webhookError("Invalid JSON body", 400);
  }

  console.log(`[${LABEL}] Received event: ${event.type}`);

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const result = await handleCheckoutCompleted(event.data.object);
        console.log(`[${LABEL}] Checkout completed result:`, result);
        break;
      }

      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        await handleSubscriptionUpdate(event.data.object);
        break;
      }

      case "invoice.payment_failed": {
        console.log(`[${LABEL}] Payment failed:`, event.data.object);
        break;
      }

      default:
        console.log(`[${LABEL}] Unhandled event type: ${event.type}`);
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error(`[${LABEL}] Error handling ${event.type}:`, error);
    return webhookError(
      `Error processing ${event.type}: ${error instanceof Error ? error.message : String(error)}`,
      500
    );
  }
});

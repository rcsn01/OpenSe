/**
 * Edge Function: update-subscription
 *
 * Refactored (Audit Q1): Uses shared helpers from _shared/ to eliminate
 * duplicated CORS, auth, response, and Stripe logic.
 * Refactored (Audit S3): CORS origin now driven by ALLOWED_ORIGIN env var.
 */
import { createClient } from "jsr:@supabase/supabase-js@2";
import { handleCorsPreflightIfOptions } from "../_shared/cors.ts";
import { errorResponse, successResponse } from "../_shared/response.ts";
import { extractBearerToken, authenticateUser } from "../_shared/auth.ts";
import { getPriceIdForTier, getStripeSecretKey, isValidTier } from "../_shared/stripe.ts";

const LABEL = "update-subscription";

Deno.serve(async (req) => {
  // Handle CORS preflight
  const preflight = handleCorsPreflightIfOptions(req);
  if (preflight) return preflight;

  try {
    // 1. Extract and verify auth token
    const tokenOrError = extractBearerToken(req, LABEL);
    if (tokenOrError instanceof Response) return tokenOrError;

    const authResult = await authenticateUser(tokenOrError, LABEL);
    if (authResult instanceof Response) return authResult;

    const { user } = authResult;
    console.log(`[${LABEL}] Authenticated user: ${user.id} (${user.email})`);

    // 2. Validate Stripe secret key
    const stripeSecretKey = getStripeSecretKey();
    if (!stripeSecretKey) {
      return errorResponse(LABEL, "Server configuration error", 500, "Missing STRIPE_SECRET_KEY");
    }

    // 3. Parse and validate request body
    let body: { orgId?: string; tier?: string };
    try {
      body = await req.json();
    } catch {
      return errorResponse(LABEL, "Invalid JSON body", 400);
    }

    const { orgId, tier } = body;

    if (!orgId || typeof orgId !== "string") {
      return errorResponse(LABEL, "Missing or invalid 'orgId'", 400);
    }
    if (!isValidTier(tier)) {
      return errorResponse(LABEL, "Invalid 'tier'. Must be 'tier-1', 'tier-2', or 'tier-3'", 400);
    }

    // 4. Get new Price ID
    const newPriceId = getPriceIdForTier(tier);
    if (!newPriceId) {
      return errorResponse(
        LABEL,
        `Stripe Price ID not configured for ${tier}`,
        500,
        `Set STRIPE_PRICE_ID_${tier.toUpperCase().replace("-", "_")} in your Supabase secrets`
      );
    }

    // 5. Use service role to fetch org details
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: { persistSession: false },
    });

    const { data: org, error: orgError } = await supabaseAdmin
      .from("organisations")
      .select("id, stripe_subscription_id, stripe_customer_id, owner_id, tier")
      .eq("id", orgId)
      .single();

    if (orgError || !org) {
      return errorResponse(LABEL, "Organisation not found", 404, orgError?.message);
    }

    // 6. Verify ownership
    if (org.owner_id !== user.id) {
      return errorResponse(LABEL, "Only the organisation owner can change plans", 403);
    }

    if (!org.stripe_subscription_id) {
      return errorResponse(LABEL, "No active subscription found. Please create a subscription first.", 400);
    }

    // 7. Check if tier is actually changing
    if (org.tier === tier) {
      return successResponse({
        success: true,
        tier,
        previousTier: org.tier,
        message: "Already on this tier",
      });
    }

    console.log(`[${LABEL}] Changing tier from ${org.tier} to ${tier} for org ${orgId}`);

    // 8. Retrieve current subscription
    const getSubResponse = await fetch(
      `https://api.stripe.com/v1/subscriptions/${org.stripe_subscription_id}`,
      {
        method: "GET",
        headers: { Authorization: `Bearer ${stripeSecretKey}` },
      }
    );

    if (!getSubResponse.ok) {
      const subError = await getSubResponse.json();
      console.error(`[${LABEL}] Failed to retrieve subscription:`, subError);
      return errorResponse(LABEL, "Failed to retrieve subscription from Stripe", getSubResponse.status, subError.error?.message);
    }

    const subscription = await getSubResponse.json();

    const currentItem = subscription.items?.data?.[0];
    const subscriptionItemId = currentItem?.id;
    if (!subscriptionItemId) {
      return errorResponse(LABEL, "No subscription items found", 400);
    }

    const currentUnitAmount = currentItem?.price?.unit_amount ?? 0;

    // Fetch new price details for upgrade/downgrade detection
    const priceResponse = await fetch(
      `https://api.stripe.com/v1/prices/${newPriceId}`,
      {
        method: "GET",
        headers: { Authorization: `Bearer ${stripeSecretKey}` },
      }
    );

    if (!priceResponse.ok) {
      const priceError = await priceResponse.json();
      console.error(`[${LABEL}] Failed to retrieve price:`, priceError);
      return errorResponse(LABEL, "Failed to retrieve price from Stripe", priceResponse.status, priceError.error?.message);
    }

    const newPrice = await priceResponse.json();
    const newUnitAmount = newPrice?.unit_amount ?? 0;
    const isUpgrade = newUnitAmount > currentUnitAmount;

    console.log(`[${LABEL}] Updating subscription item ${subscriptionItemId} to price ${newPriceId}`);

    // 9. Update the subscription with the new price
    const params = new URLSearchParams();
    params.append("items[0][id]", subscriptionItemId);
    params.append("items[0][price]", newPriceId);
    params.append("proration_behavior", "create_prorations");
    params.append("metadata[tier]", tier);
    params.append("metadata[org_id]", orgId);
    if (subscription.metadata?.user_id) {
      params.append("metadata[user_id]", subscription.metadata.user_id);
    }
    if (subscription.metadata?.org_name) {
      params.append("metadata[org_name]", subscription.metadata.org_name);
    }

    const updateResponse = await fetch(
      `https://api.stripe.com/v1/subscriptions/${org.stripe_subscription_id}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${stripeSecretKey}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: params.toString(),
      }
    );

    const updatePayload = await updateResponse.json();

    if (!updateResponse.ok) {
      console.error(`[${LABEL}] Stripe update failed:`, updatePayload);
      return errorResponse(
        LABEL,
        "Failed to update subscription",
        updateResponse.status,
        updatePayload.error?.message ?? updatePayload
      );
    }

    console.log(`[${LABEL}] Successfully updated subscription to ${tier}`);

    // Optimistic DB update (webhook will also sync)
    const { error: dbError } = await supabaseAdmin
      .from("organisations")
      .update({ tier })
      .eq("id", orgId);

    if (dbError) {
      console.warn(`[${LABEL}] Optimistic DB update failed (webhook will sync):`, dbError);
    }

    let paymentUrl: string | null = null;
    let invoiceId: string | null = null;

    // If upgrading, create and finalize an invoice
    if (isUpgrade) {
      const customerId =
        typeof subscription.customer === "string" ? subscription.customer : org.stripe_customer_id;

      if (customerId) {
        const invoiceParams = new URLSearchParams();
        invoiceParams.append("customer", customerId);
        invoiceParams.append("subscription", org.stripe_subscription_id);
        invoiceParams.append("auto_advance", "true");

        const invoiceResponse = await fetch("https://api.stripe.com/v1/invoices", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${stripeSecretKey}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: invoiceParams.toString(),
        });

        const invoicePayload = await invoiceResponse.json();

        if (invoiceResponse.ok && invoicePayload?.id) {
          invoiceId = invoicePayload.id;

          const finalizeResponse = await fetch(
            `https://api.stripe.com/v1/invoices/${invoiceId}/finalize`,
            {
              method: "POST",
              headers: { Authorization: `Bearer ${stripeSecretKey}` },
            }
          );

          const finalizedInvoice = await finalizeResponse.json();
          if (finalizeResponse.ok) {
            if (finalizedInvoice?.amount_due > 0 && finalizedInvoice?.hosted_invoice_url) {
              paymentUrl = finalizedInvoice.hosted_invoice_url;
            }
          } else {
            console.warn(`[${LABEL}] Failed to finalize invoice:`, finalizedInvoice);
          }
        } else {
          console.warn(`[${LABEL}] Failed to create invoice:`, invoicePayload);
        }
      }
    }

    return successResponse({
      success: true,
      tier,
      previousTier: org.tier,
      isUpgrade,
      invoiceId,
      paymentUrl,
      message: isUpgrade ? "Upgrade started" : "Downgrade scheduled",
    });
  } catch (error) {
    console.error(`[${LABEL}] Unexpected error:`, error);
    return errorResponse(
      LABEL,
      "An unexpected error occurred",
      500,
      error instanceof Error ? error.message : String(error)
    );
  }
});

import { createClient } from "jsr:@supabase/supabase-js@2";

const serve = Deno.serve;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Helper to create a JSON error response
 */
function errorResponse(message: string, status: number, details?: unknown) {
  console.error(`[update-subscription] Error (${status}):`, message, details ?? "");
  return new Response(
    JSON.stringify({ error: message, details: details ?? null }),
    { status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

/**
 * Helper to create a JSON success response
 */
function successResponse(data: unknown) {
  return new Response(
    JSON.stringify(data),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

/**
 * Get Stripe Price ID from environment variables
 */
function getPriceIdForTier(tier: string): string | null {
  const tierMap: Record<string, string> = {
    "tier-1": Deno.env.get("STRIPE_PRICE_ID_TIER_1") ?? "",
    "tier-2": Deno.env.get("STRIPE_PRICE_ID_TIER_2") ?? "",
    "tier-3": Deno.env.get("STRIPE_PRICE_ID_TIER_3") ?? "",
  };
  const priceId = tierMap[tier];
  return priceId && priceId.startsWith("price_") ? priceId : null;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // 1. Extract and validate Authorization header
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return errorResponse("Missing Authorization header", 401);
    }
    const token = authHeader.replace(/^Bearer /i, "").trim();
    if (!token) {
      return errorResponse("Invalid Authorization header format", 401);
    }

    // 2. Validate environment variables
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const supabaseKey = supabaseAnonKey || supabaseServiceRoleKey;
    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");

    if (!supabaseUrl || !supabaseKey) {
      return errorResponse("Server configuration error", 500, "Missing Supabase environment variables");
    }
    if (!stripeSecretKey) {
      return errorResponse("Server configuration error", 500, "Missing STRIPE_SECRET_KEY");
    }

    // 3. Initialize Supabase Client with user's token to verify auth
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false },
      global: { headers: { Authorization: `Bearer ${token}` } },
    });

    // 4. Verify User
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return errorResponse("Unauthorized", 401, userError?.message ?? "Invalid or expired token");
    }

    console.log(`[update-subscription] Authenticated user: ${user.id} (${user.email})`);

    // 5. Parse and validate request body
    let body: { orgId?: string; tier?: string };
    try {
      body = await req.json();
    } catch {
      return errorResponse("Invalid JSON body", 400);
    }

    const { orgId, tier } = body;

    if (!orgId || typeof orgId !== "string") {
      return errorResponse("Missing or invalid 'orgId'", 400);
    }
    if (!tier || !["tier-1", "tier-2", "tier-3"].includes(tier)) {
      return errorResponse("Invalid 'tier'. Must be 'tier-1', 'tier-2', or 'tier-3'", 400);
    }

    // 6. Get new Price ID from environment
    const newPriceId = getPriceIdForTier(tier);
    if (!newPriceId) {
      return errorResponse(
        `Stripe Price ID not configured for ${tier}`,
        500,
        `Set STRIPE_PRICE_ID_${tier.toUpperCase().replace("-", "_")} in your Supabase secrets`
      );
    }

    // 7. Use service role to fetch org details (Stripe IDs may not be exposed to RLS)
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey!, {
      auth: { persistSession: false },
    });

    const { data: org, error: orgError } = await supabaseAdmin
      .from("organisations")
      .select("id, stripe_subscription_id, stripe_customer_id, owner_id, tier")
      .eq("id", orgId)
      .single();

    if (orgError || !org) {
      return errorResponse("Organisation not found", 404, orgError?.message);
    }

    // 8. Verify ownership - only owner can change billing
    if (org.owner_id !== user.id) {
      return errorResponse("Only the organisation owner can change plans", 403);
    }

    if (!org.stripe_subscription_id) {
      return errorResponse("No active subscription found. Please create a subscription first.", 400);
    }

    // 9. Check if tier is actually changing
    if (org.tier === tier) {
      return successResponse({ 
        success: true, 
        tier, 
        previousTier: org.tier,
        message: "Already on this tier" 
      });
    }

    console.log(`[update-subscription] Changing tier from ${org.tier} to ${tier} for org ${orgId}`);

    // 10. Retrieve current subscription to get the subscription item ID
    const getSubResponse = await fetch(
      `https://api.stripe.com/v1/subscriptions/${org.stripe_subscription_id}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${stripeSecretKey}`,
        },
      }
    );

    if (!getSubResponse.ok) {
      const subError = await getSubResponse.json();
      console.error("[update-subscription] Failed to retrieve subscription:", subError);
      return errorResponse("Failed to retrieve subscription from Stripe", getSubResponse.status, subError.error?.message);
    }

    const subscription = await getSubResponse.json();
    
    // Get the first subscription item (assuming single-item subscriptions)
    const currentItem = subscription.items?.data?.[0];
    const subscriptionItemId = currentItem?.id;
    if (!subscriptionItemId) {
      return errorResponse("No subscription items found", 400);
    }

    const currentUnitAmount = currentItem?.price?.unit_amount ?? 0;

    // Fetch new price details for upgrade/downgrade detection
    const priceResponse = await fetch(
      `https://api.stripe.com/v1/prices/${newPriceId}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${stripeSecretKey}`,
        },
      }
    );

    if (!priceResponse.ok) {
      const priceError = await priceResponse.json();
      console.error("[update-subscription] Failed to retrieve price:", priceError);
      return errorResponse("Failed to retrieve price from Stripe", priceResponse.status, priceError.error?.message);
    }

    const newPrice = await priceResponse.json();
    const newUnitAmount = newPrice?.unit_amount ?? 0;
    const isUpgrade = newUnitAmount > currentUnitAmount;

    console.log(`[update-subscription] Updating subscription item ${subscriptionItemId} to price ${newPriceId}`);

    // 11. Update the subscription with the new price
    // Uses proration_behavior=create_prorations to calculate pro-rated charges
    const params = new URLSearchParams();
    params.append("items[0][id]", subscriptionItemId);
    params.append("items[0][price]", newPriceId);
    params.append("proration_behavior", "create_prorations");
    // Update metadata to include tier (preserve existing metadata by merging)
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
      console.error("[update-subscription] Stripe update failed:", updatePayload);
      return errorResponse(
        "Failed to update subscription",
        updateResponse.status,
        updatePayload.error?.message ?? updatePayload
      );
    }

    console.log(`[update-subscription] Successfully updated subscription to ${tier}`);

    // The webhook will handle updating the database when Stripe sends customer.subscription.updated
    // But we can also do an optimistic update here for faster UI feedback
    const { error: dbError } = await supabaseAdmin
      .from("organisations")
      .update({ tier })
      .eq("id", orgId);

    if (dbError) {
      console.warn("[update-subscription] Optimistic DB update failed (webhook will sync):", dbError);
    }

    let paymentUrl: string | null = null;
    let invoiceId: string | null = null;

    // If upgrading, create and finalize an invoice, then return hosted invoice URL for payment
    if (isUpgrade) {
      const customerId = typeof subscription.customer === "string" ? subscription.customer : org.stripe_customer_id;
      if (customerId) {
        const invoiceParams = new URLSearchParams();
        invoiceParams.append("customer", customerId);
        invoiceParams.append("subscription", org.stripe_subscription_id);
        invoiceParams.append("auto_advance", "true");

        const invoiceResponse = await fetch(
          "https://api.stripe.com/v1/invoices",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${stripeSecretKey}`,
              "Content-Type": "application/x-www-form-urlencoded",
            },
            body: invoiceParams.toString(),
          }
        );

        const invoicePayload = await invoiceResponse.json();

        if (invoiceResponse.ok && invoicePayload?.id) {
          invoiceId = invoicePayload.id;

          const finalizeResponse = await fetch(
            `https://api.stripe.com/v1/invoices/${invoiceId}/finalize`,
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${stripeSecretKey}`,
              },
            }
          );

          const finalizedInvoice = await finalizeResponse.json();
          if (finalizeResponse.ok) {
            if (finalizedInvoice?.amount_due > 0 && finalizedInvoice?.hosted_invoice_url) {
              paymentUrl = finalizedInvoice.hosted_invoice_url;
            }
          } else {
            console.warn("[update-subscription] Failed to finalize invoice:", finalizedInvoice);
          }
        } else {
          console.warn("[update-subscription] Failed to create invoice:", invoicePayload);
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
      message: isUpgrade ? "Upgrade started" : "Downgrade scheduled"
    });

  } catch (error) {
    console.error("[update-subscription] Unexpected error:", error);
    return errorResponse(
      "An unexpected error occurred",
      500,
      error instanceof Error ? error.message : String(error)
    );
  }
});

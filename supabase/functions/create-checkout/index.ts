/**
 * Edge Function: create-checkout
 *
 * Refactored (Audit Q1): Uses shared helpers from _shared/ to eliminate
 * ~40 lines of duplicated CORS, auth, response, and Stripe logic.
 * Refactored (Audit S3): CORS origin now driven by ALLOWED_ORIGIN env var.
 */
import { handleCorsPreflightIfOptions } from "../_shared/cors.ts";
import { errorResponse, successResponse } from "../_shared/response.ts";
import { extractBearerToken, authenticateUser } from "../_shared/auth.ts";
import { getPriceIdForTier, getStripeSecretKey, isValidTier } from "../_shared/stripe.ts";

const LABEL = "create-checkout";

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
    let body: { orgName?: string; tier?: string; successUrl?: string; cancelUrl?: string };
    try {
      body = await req.json();
    } catch {
      return errorResponse(LABEL, "Invalid JSON body", 400);
    }

    const { orgName, tier, successUrl, cancelUrl } = body;

    if (!orgName || typeof orgName !== "string" || orgName.trim().length === 0) {
      return errorResponse(LABEL, "Missing or invalid 'orgName'", 400);
    }
    if (!isValidTier(tier)) {
      return errorResponse(LABEL, "Invalid 'tier'. Must be 'tier-1', 'tier-2', or 'tier-3'", 400);
    }
    if (!successUrl || !cancelUrl) {
      return errorResponse(LABEL, "Missing 'successUrl' or 'cancelUrl'", 400);
    }

    // 4. Get Price ID
    const priceId = getPriceIdForTier(tier);
    if (!priceId) {
      return errorResponse(
        LABEL,
        `Stripe Price ID not configured for ${tier}`,
        500,
        `Set STRIPE_PRICE_ID_${tier.toUpperCase().replace("-", "_")} in your Supabase secrets`
      );
    }

    console.log(`[${LABEL}] Creating session for tier: ${tier}, priceId: ${priceId}`);

    // 5. Build Stripe Checkout Session parameters
    const params = new URLSearchParams();
    params.append("mode", "subscription");
    params.append("success_url", successUrl);
    params.append("cancel_url", cancelUrl);
    params.append("line_items[0][price]", priceId);
    params.append("line_items[0][quantity]", "1");

    if (user.email) {
      params.append("customer_email", user.email);
    }

    // Store metadata for webhook to create the organisation
    params.append("metadata[org_name]", orgName.trim());
    params.append("metadata[tier]", tier);
    params.append("metadata[user_id]", user.id);
    params.append("subscription_data[metadata][org_name]", orgName.trim());
    params.append("subscription_data[metadata][tier]", tier);
    params.append("subscription_data[metadata][user_id]", user.id);

    // 6. Create Stripe Checkout Session
    const stripeResponse = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${stripeSecretKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });

    const stripePayload = await stripeResponse.json();

    if (!stripeResponse.ok) {
      console.error(`[${LABEL}] Stripe API error:`, stripePayload);
      return errorResponse(
        LABEL,
        "Failed to create checkout session",
        stripeResponse.status,
        stripePayload.error?.message ?? stripePayload
      );
    }

    if (!stripePayload.url) {
      return errorResponse(LABEL, "Stripe did not return a checkout URL", 500);
    }

    console.log(`[${LABEL}] Session created: ${stripePayload.id}`);

    return successResponse({
      url: stripePayload.url,
      sessionId: stripePayload.id,
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

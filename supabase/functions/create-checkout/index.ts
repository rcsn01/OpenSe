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
  console.error(`[create-checkout] Error (${status}):`, message, details ?? "");
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
 * Set these in your Supabase project secrets:
 * - STRIPE_PRICE_ID_TIER_1
 * - STRIPE_PRICE_ID_TIER_2
 * - STRIPE_PRICE_ID_TIER_3
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

    console.log("[create-checkout] Environment check:", {
      hasSupabaseUrl: !!supabaseUrl,
      hasSupabaseAnonKey: !!supabaseAnonKey,
      hasSupabaseServiceRoleKey: !!supabaseServiceRoleKey,
      hasSupabaseKey: !!supabaseKey,
      hasStripeSecretKey: !!stripeSecretKey,
      hasTier1Price: !!Deno.env.get("STRIPE_PRICE_ID_TIER_1"),
      hasTier2Price: !!Deno.env.get("STRIPE_PRICE_ID_TIER_2"),
      hasTier3Price: !!Deno.env.get("STRIPE_PRICE_ID_TIER_3"),
    });

    if (!supabaseUrl || !supabaseKey) {
      return errorResponse("Server configuration error", 500, "Missing Supabase environment variables");
    }
    if (!stripeSecretKey) {
      return errorResponse("Server configuration error", 500, "Missing STRIPE_SECRET_KEY");
    }

    // 3. Initialize Supabase Client with user's token
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false },
      global: { headers: { Authorization: `Bearer ${token}` } },
    });

    // 4. Verify User
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return errorResponse("Unauthorized", 401, userError?.message ?? "Invalid or expired token");
    }

    console.log(`[create-checkout] Authenticated user: ${user.id} (${user.email})`);

    // 5. Parse and validate request body
    let body: { orgName?: string; tier?: string; successUrl?: string; cancelUrl?: string };
    try {
      body = await req.json();
    } catch {
      return errorResponse("Invalid JSON body", 400);
    }

    const { orgName, tier, successUrl, cancelUrl } = body;

    // Validate required fields
    if (!orgName || typeof orgName !== "string" || orgName.trim().length === 0) {
      return errorResponse("Missing or invalid 'orgName'", 400);
    }
    if (!tier || !["tier-1", "tier-2", "tier-3"].includes(tier)) {
      return errorResponse("Invalid 'tier'. Must be 'tier-1', 'tier-2', or 'tier-3'", 400);
    }
    if (!successUrl || !cancelUrl) {
      return errorResponse("Missing 'successUrl' or 'cancelUrl'", 400);
    }

    // 6. Get Price ID from environment
    const priceId = getPriceIdForTier(tier);
    if (!priceId) {
      return errorResponse(
        `Stripe Price ID not configured for ${tier}`,
        500,
        `Set STRIPE_PRICE_ID_${tier.toUpperCase().replace("-", "_")} in your Supabase secrets`
      );
    }

    console.log(`[create-checkout] Creating session for tier: ${tier}, priceId: ${priceId}`);

    // 7. Build Stripe Checkout Session parameters
    const params = new URLSearchParams();
    params.append("mode", "subscription");
    params.append("success_url", successUrl);
    params.append("cancel_url", cancelUrl);
    params.append("line_items[0][price]", priceId);
    params.append("line_items[0][quantity]", "1");
    
    // Pre-fill customer email if available
    if (user.email) {
      params.append("customer_email", user.email);
    }
    
    // Store metadata for webhook to create the organisation
    params.append("metadata[org_name]", orgName.trim());
    params.append("metadata[tier]", tier);
    params.append("metadata[user_id]", user.id);

    // Also store on subscription for future reference
    params.append("subscription_data[metadata][org_name]", orgName.trim());
    params.append("subscription_data[metadata][tier]", tier);
    params.append("subscription_data[metadata][user_id]", user.id);

    // 8. Create Stripe Checkout Session
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
      console.error("[create-checkout] Stripe API error:", stripePayload);
      return errorResponse(
        "Failed to create checkout session",
        stripeResponse.status,
        stripePayload.error?.message ?? stripePayload
      );
    }

    if (!stripePayload.url) {
      return errorResponse("Stripe did not return a checkout URL", 500);
    }

    console.log(`[create-checkout] Session created: ${stripePayload.id}`);

    return successResponse({ 
      url: stripePayload.url,
      sessionId: stripePayload.id 
    });

  } catch (error) {
    console.error("[create-checkout] Unexpected error:", error);
    return errorResponse(
      "An unexpected error occurred",
      500,
      error instanceof Error ? error.message : String(error)
    );
  }
});
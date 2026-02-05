import { createClient } from "jsr:@supabase/supabase-js@2";

const serve = Deno.serve;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // 1. Extract Token (Case-insensitive 'Bearer' replacement)
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing Authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const token = authHeader.replace(/^Bearer /i, "").trim();

    // 2. Initialize Supabase Client
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const supabaseKey = supabaseAnonKey || supabaseServiceRoleKey;

    if (!supabaseUrl || !supabaseKey) {
      console.error("Missing Supabase Environment Variables");
      throw new Error("Server configuration error: Missing Supabase keys");
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false },
      global: { headers: { Authorization: `Bearer ${token}` } },
    });

    // 3. Verify User & Capture Error
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      console.error("Auth Error:", userError);
      return new Response(JSON.stringify({ 
        error: "Unauthorized", 
        details: userError?.message || "Invalid token" 
      }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 4. Parse Request Body
    const { orgName, tier, successUrl, cancelUrl } = await req.json();
    
    // Map Tiers to Stripe Price IDs
    // IMPORTANT: Ensure these Price IDs exist in your Stripe Dashboard!
    const prices: Record<string, string> = {
      "tier-1": "price_starter_id", // Replace with actual Stripe Price IDs
      "tier-2": "price_pro_id",
      "tier-3": "price_ent_id",
    };

    const priceId = prices[tier];
    if (!orgName || !tier || !priceId || !successUrl || !cancelUrl) {
      console.error("Invalid Request Data:", { orgName, tier, priceId });
      return new Response(JSON.stringify({ error: "Invalid request parameters or missing Price ID" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 5. Create Stripe Session (direct REST call)
    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY") ?? "";
    if (!stripeSecretKey) {
      throw new Error("Server configuration error: Missing STRIPE_SECRET_KEY");
    }

    const params = new URLSearchParams();
    params.append("mode", "subscription");
    params.append("success_url", successUrl);
    params.append("cancel_url", cancelUrl);
    params.append("line_items[0][price]", priceId);
    params.append("line_items[0][quantity]", "1");
    if (user.email) {
      params.append("customer_email", user.email);
    }
    params.append("metadata[org_name]", orgName);
    params.append("metadata[tier]", tier);
    params.append("metadata[user_id]", user.id);

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
      console.error("Stripe Error:", stripePayload);
      return new Response(JSON.stringify({ error: "Stripe error", details: stripePayload }), {
        status: stripeResponse.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ url: stripePayload.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Function Error:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
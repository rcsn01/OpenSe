import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@12.0.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") ?? "", {
  apiVersion: "2022-11-15",
});

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: { persistSession: false },
});

serve(async (req) => {
  const signature = req.headers.get("stripe-signature");
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET") ?? "";

  if (!signature || !webhookSecret) {
    return new Response("Missing signature", { status: 400 });
  }

  const body = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    return new Response(`Webhook Error: ${(err as Error).message}`, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const metadata = session.metadata ?? {};
    const orgName = metadata.org_name;
    const tier = metadata.tier;
    const userId = metadata.user_id;

    if (!orgName || !tier || !userId) {
      return new Response("Missing metadata", { status: 400 });
    }

    const stripeCustomerId = typeof session.customer === "string" ? session.customer : null;
    const stripeSubscriptionId =
      typeof session.subscription === "string" ? session.subscription : null;

    if (stripeSubscriptionId) {
      const { data: existing } = await supabase
        .from("organisations")
        .select("id")
        .eq("stripe_subscription_id", stripeSubscriptionId)
        .limit(1)
        .maybeSingle();

      if (existing?.id) {
        return new Response("ok", { status: 200 });
      }
    }

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
      return new Response(`DB Error: ${orgError.message}`, { status: 500 });
    }

    const { error: memberError } = await supabase
      .from("organisation_members")
      .insert({ org_id: org.id, user_id: userId, role: "admin" });

    if (memberError) {
      return new Response(`DB Error: ${memberError.message}`, { status: 500 });
    }
  }

  return new Response("ok", { status: 200 });
});

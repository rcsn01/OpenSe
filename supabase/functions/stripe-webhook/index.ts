import { createClient } from "jsr:@supabase/supabase-js@2";

const serve = Deno.serve;

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

serve(async (req) => {
  const signature = req.headers.get("stripe-signature");
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET") ?? "";

  if (!signature || !webhookSecret) {
    return new Response("Missing signature", { status: 400 });
  }

  const body = await req.text();

  const signatureParams = parseStripeSignature(signature);
  const timestamp = signatureParams.t;
  const v1Signature = signatureParams.v1;

  if (!timestamp || !v1Signature) {
    return new Response("Invalid signature header", { status: 400 });
  }

  const signedPayload = `${timestamp}.${body}`;
  const expectedSignature = await computeHmacSha256(webhookSecret, signedPayload);

  if (!timingSafeEqual(expectedSignature, v1Signature)) {
    return new Response("Invalid signature", { status: 400 });
  }

  const event = JSON.parse(body);

  if (event.type === "checkout.session.completed") {
    const session = event.data?.object ?? {};
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

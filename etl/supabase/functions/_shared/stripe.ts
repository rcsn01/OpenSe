/**
 * Shared Stripe helpers for edge functions.
 *
 * Refactored (Audit Q1): Extracted getPriceIdForTier from 2 duplicate
 * copies in create-checkout and update-subscription.
 */

/**
 * Returns the Stripe Price ID for a given tier name, or null if
 * the corresponding environment variable is not set / invalid.
 */
export function getPriceIdForTier(tier: string): string | null {
  const tierMap: Record<string, string> = {
    "tier-1": Deno.env.get("STRIPE_PRICE_ID_TIER_1") ?? "",
    "tier-2": Deno.env.get("STRIPE_PRICE_ID_TIER_2") ?? "",
    "tier-3": Deno.env.get("STRIPE_PRICE_ID_TIER_3") ?? "",
  };
  const priceId = tierMap[tier];
  return priceId && priceId.startsWith("price_") ? priceId : null;
}

/**
 * Validates that the required Stripe secret key is available.
 */
export function getStripeSecretKey(): string | null {
  return Deno.env.get("STRIPE_SECRET_KEY") ?? null;
}

/**
 * Valid subscription tiers.
 */
export const VALID_TIERS = ["tier-1", "tier-2", "tier-3"] as const;
export type Tier = (typeof VALID_TIERS)[number];

export function isValidTier(tier: unknown): tier is Tier {
  return typeof tier === "string" && VALID_TIERS.includes(tier as Tier);
}

/**
 * Shared CORS configuration for edge functions.
 *
 * Refactored (Audit S3, Q1): Replaced wildcard `*` origin with
 * environment-based allowed origin. Falls back to `*` only in
 * development when ALLOWED_ORIGIN is not set.
 */

const allowedOrigin = Deno.env.get("ALLOWED_ORIGIN") ?? "*";

export const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": allowedOrigin,
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

/**
 * Respond to CORS preflight (OPTIONS) requests.
 */
export function handleCorsPreflightIfOptions(req: Request): Response | null {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  return null;
}

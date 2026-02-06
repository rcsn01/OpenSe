/**
 * Shared HTTP response helpers for edge functions.
 *
 * Refactored (Audit Q1): Extracted from 3 duplicated copies in
 * create-checkout, update-subscription, and stripe-webhook.
 */
import { corsHeaders } from "./cors.ts";

/**
 * Create a JSON error response with CORS headers.
 */
export function errorResponse(
  label: string,
  message: string,
  status: number,
  details?: unknown
): Response {
  console.error(`[${label}] Error (${status}):`, message, details ?? "");
  return new Response(
    JSON.stringify({ error: message, details: details ?? null }),
    {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    }
  );
}

/**
 * Create a JSON success response with CORS headers.
 */
export function successResponse(data: unknown): Response {
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

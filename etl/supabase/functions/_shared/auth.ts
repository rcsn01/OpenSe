/**
 * Shared auth helpers for edge functions.
 *
 * Refactored (Audit Q1): Extracted token parsing + Supabase client
 * creation from duplicated copies in create-checkout & update-subscription.
 */
import { createClient, SupabaseClient, User } from "jsr:@supabase/supabase-js@2";
import { errorResponse } from "./response.ts";

/**
 * Extracts the Bearer token from the Authorization header.
 * Returns an error Response if the header is missing or malformed.
 */
export function extractBearerToken(
  req: Request,
  label: string
): string | Response {
  const authHeader = req.headers.get("authorization");
  if (!authHeader) {
    return errorResponse(label, "Missing Authorization header", 401);
  }
  const token = authHeader.replace(/^Bearer /i, "").trim();
  if (!token) {
    return errorResponse(label, "Invalid Authorization header format", 401);
  }
  return token;
}

/**
 * Creates a Supabase client scoped to the user's JWT and verifies
 * the user exists. Returns the authenticated user + client, or an
 * error Response.
 */
export async function authenticateUser(
  token: string,
  label: string
): Promise<{ user: User; supabase: SupabaseClient } | Response> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const supabaseKey = supabaseAnonKey || supabaseServiceRoleKey;

  if (!supabaseUrl || !supabaseKey) {
    return errorResponse(
      label,
      "Server configuration error",
      500,
      "Missing Supabase environment variables"
    );
  }

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return errorResponse(
      label,
      "Unauthorized",
      401,
      userError?.message ?? "Invalid or expired token"
    );
  }

  return { user, supabase };
}

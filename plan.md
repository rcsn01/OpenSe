1. Database Schema Changes

You need to create a table to store pending invitations and update the organisations table to support subscription tiers.

New Migration SQL: Create a new migration file (e.g., supabase/migrations/20260201000000_invites_and_subs.sql):
SQL

-- 1. Create table for invitations
CREATE TABLE public.organisation_invites (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id uuid NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  email text NOT NULL,
  role text NOT NULL CHECK (role IN ('admin', 'editor', 'member')),
  invited_by uuid REFERENCES public.profiles(id),
  created_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(org_id, email)
);

-- 2. Add Subscription fields to Organisations
ALTER TABLE public.organisations 
ADD COLUMN IF NOT EXISTS tier text DEFAULT 'tier-1' CHECK (tier IN ('tier-1', 'tier-2', 'tier-3')),
ADD COLUMN IF NOT EXISTS subscription_status text DEFAULT 'active',
ADD COLUMN IF NOT EXISTS stripe_customer_id text,
ADD COLUMN IF NOT EXISTS stripe_subscription_id text;

-- 3. RLS Policies for Invites

-- Enable RLS
ALTER TABLE public.organisation_invites ENABLE ROW LEVEL SECURITY;

-- Allow users to see invites sent TO their email
CREATE POLICY "Users can view their own invites" ON public.organisation_invites
FOR SELECT USING (
  email = (select auth.jwt() ->> 'email')
);

-- Allow Org Admins to see invites sent FROM their org
CREATE POLICY "Admins can view org invites" ON public.organisation_invites
FOR SELECT USING (
  public.is_org_admin(org_id, auth.uid()) OR 
  public.is_org_owner(org_id, auth.uid())
);

-- Allow Admins to insert invites
CREATE POLICY "Admins can create invites" ON public.organisation_invites
FOR INSERT WITH CHECK (
  public.is_org_admin(org_id, auth.uid()) OR 
  public.is_org_owner(org_id, auth.uid())
);

-- Allow Admins to delete (revoke) and Users to delete (decline)
CREATE POLICY "Admins revoke or Users decline" ON public.organisation_invites
FOR DELETE USING (
  public.is_org_admin(org_id, auth.uid()) OR 
  public.is_org_owner(org_id, auth.uid()) OR
  email = (select auth.jwt() ->> 'email')
);

2. Backend Logic (RPCs)

Create a secure Postgres function to handle "Accept Invite". This ensures the invite is verified and deleted in a single transaction.

Add to Migration SQL:
SQL

CREATE OR REPLACE FUNCTION public.accept_invite(invite_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invite record;
  v_user_email text;
  v_user_id uuid;
BEGIN
  -- Get current user details
  v_user_id := auth.uid();
  v_user_email := (select auth.jwt() ->> 'email');

  -- Fetch invite
  SELECT * INTO v_invite FROM public.organisation_invites WHERE id = invite_id;

  -- Validation
  IF v_invite IS NULL THEN
    RAISE EXCEPTION 'Invite not found';
  END IF;

  IF v_invite.email <> v_user_email THEN
    RAISE EXCEPTION 'This invite does not belong to you';
  END IF;

  -- Create Member
  INSERT INTO public.organisation_members (org_id, user_id, role)
  VALUES (v_invite.org_id, v_user_id, v_invite.role)
  ON CONFLICT (org_id, user_id) DO UPDATE SET role = EXCLUDED.role;

  -- Delete Invite
  DELETE FROM public.organisation_invites WHERE id = invite_id;

  RETURN true;
END;
$$;

3. Frontend API Integration

Update app/src/api/organisations.ts to use the real tables instead of mocks.

Updated getPendingInvites:
TypeScript

export const getPendingInvites = async (): Promise<OrgInvite[]> => {
  const { data: session } = await supabase.auth.getSession();
  const userEmail = session.session?.user?.email;

  if (!userEmail) return [];

  // Join with organisations table to get the name
  const { data, error } = await supabase
    .from('organisation_invites')
    .select(`
      id, 
      role, 
      created_at, 
      organisations (id, name),
      inviter:profiles!organisation_invites_invited_by_fkey (full_name)
    `)
    .eq('email', userEmail);

  if (error) throw error;

  return data.map((i: any) => ({
    id: i.id,
    org_id: i.organisations.id,
    org_name: i.organisations.name,
    role: i.role,
    created_at: i.created_at,
    inviter_name: i.inviter?.full_name || 'Unknown',
  }));
};

Updated acceptInvite / rejectInvite:
TypeScript

export const acceptInvite = async (inviteId: string) => {
  const { error } = await supabase.rpc('accept_invite', { invite_id: inviteId });
  if (error) throw error;
  return true;
};

export const rejectInvite = async (inviteId: string) => {
  const { error } = await supabase.from('organisation_invites').delete().eq('id', inviteId);
  if (error) throw error;
  return true;
};

Updated inviteMemberToOrganisation (Admin Side):
TypeScript

// Add this to api/organisations.ts
export const inviteMember = async (orgId: string, email: string, role: string) => {
  const { data: user } = await supabase.auth.getUser();
  const { error } = await supabase.from('organisation_invites').insert({
    org_id: orgId,
    email: email,
    role: role,
    invited_by: user.user?.id
  });
  if (error) throw error;
};

4. Create Organisation & Stripe Integration Plan

Since createOrganisation involves payments, you cannot simply insert into the database from the client. You need a server-side environment (Edge Functions) to talk to Stripe securely.
A. Set up Stripe Edge Function

    Initialize Supabase functions: supabase functions new create-checkout

    Add Stripe Secret Key to Supabase secrets: supabase secrets set STRIPE_SECRET_KEY=sk_...

B. create-checkout Function Logic

This function will generate a Stripe Checkout URL.
TypeScript

// functions/create-checkout/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import Stripe from "https://esm.sh/stripe@12.0.0?target=deno"

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, { apiVersion: '2022-11-15' })

serve(async (req) => {
  const { orgName, tier, successUrl, cancelUrl } = await req.json()
  // Map tier to Price ID
  const prices = { 'tier-1': 'price_starter_id', 'tier-2': 'price_pro_id', 'tier-3': 'price_ent_id' }
  
  // Create Session
  const session = await stripe.checkout.sessions.create({
    line_items: [{ price: prices[tier], quantity: 1 }],
    mode: 'subscription',
    success_url: successUrl,
    cancel_url: cancelUrl,
    // Pass metadata to webhook
    metadata: { 
      org_name: orgName, 
      tier: tier, 
      user_id: (await getSupabaseUser(req)).id // Helper to get Auth User
    },
  })

  return new Response(JSON.stringify({ url: session.url }), { headers: { 'Content-Type': 'application/json' } })
})

C. Stripe Webhook Handler

You need a second function (or route) stripe-webhook to listen for checkout.session.completed.

    Event Trigger: When payment succeeds, Stripe calls this webhook.

    Action: The webhook uses the SERVICE_ROLE_KEY to:

        Insert the new Organisation into public.organisations.

        Insert the User (from metadata) as the owner in public.organisation_members.

        Store the stripe_customer_id and subscription_status in the DB.

D. Frontend createOrganisation Update

Update api/organisations.ts to call the Edge Function instead of the DB directly.
TypeScript

export const createOrganisation = async (name: string, tier: string) => {
  const { data, error } = await supabase.functions.invoke('create-checkout', {
    body: { 
      orgName: name, 
      tier: tier,
      successUrl: window.location.origin + '/organisation?success=true',
      cancelUrl: window.location.origin + '/organisation?canceled=true'
    }
  })
  
  if (error) throw error;
  // Redirect user to Stripe
  window.location.href = data.url; 
}

Summary of Workflow

    Invites: Handled entirely via Supabase RLS and the accept_invite RPC.

    Create Org: Handled via Stripe Checkout -> Webhook -> DB Insert pattern to ensure payment is secured before the organization is provisioned.
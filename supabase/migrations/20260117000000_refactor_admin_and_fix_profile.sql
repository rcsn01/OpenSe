-- 1. Create new table for super admins
CREATE TABLE IF NOT EXISTS public.super_admin_members (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL UNIQUE,
    created_at timestamptz DEFAULT now() NOT NULL
);

-- 2. Move existing super admin data from profiles to the new table
INSERT INTO public.super_admin_members (user_id)
SELECT id FROM public.profiles WHERE is_super_admin = TRUE
ON CONFLICT (user_id) DO NOTHING;

-- 3. Drop the old column from profiles
ALTER TABLE public.profiles DROP COLUMN IF EXISTS is_super_admin;

-- 4. Enable RLS on the new table
ALTER TABLE public.super_admin_members ENABLE ROW LEVEL SECURITY;

-- 5. Policy: Allow everyone to read (needed so the UI can check if a user is an admin)
CREATE POLICY "Super admins are viewable by everyone" 
ON public.super_admin_members FOR SELECT USING (true);

-- 6. Policy: Only super admins can insert/delete (manage other admins)
CREATE POLICY "Super admins can manage admins" 
ON public.super_admin_members 
FOR ALL 
USING (public.is_app_super_admin());

-- 7. Update the helper function to use the new table
CREATE OR REPLACE FUNCTION public.is_app_super_admin()
RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.super_admin_members
    WHERE user_id = auth.uid()
  );
$$;

-- 8. FIX THE "SAVE PROFILE" BUG: Add the missing UPDATE policy
-- Previously, users could only SELECT their profile, not UPDATE it.
CREATE POLICY "Users can update own profile" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = id);

-- 9. Update the new user trigger to handle the "First User is Admin" logic with the new table
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  -- Insert profile
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name'
  );

  -- If this is the first user ever, make them a super admin
  IF NOT EXISTS (SELECT 1 FROM public.super_admin_members) THEN
      INSERT INTO public.super_admin_members (user_id) VALUES (new.id);
  END IF;

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

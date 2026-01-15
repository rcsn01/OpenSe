-- 1. Add is_template column to workflows
ALTER TABLE public.workflows 
ADD COLUMN IF NOT EXISTS is_template boolean DEFAULT false;

-- 2. Update RLS: Allow authenticated users to view templates
-- (Users can already view their own private or org workflows via existing policies)
DROP POLICY IF EXISTS "Enable read access for templates" ON public.workflows;
CREATE POLICY "Enable read access for templates" ON public.workflows
FOR SELECT USING (
  auth.role() = 'authenticated' AND is_template = true
);

-- 3. Optional: Create an index for faster filtering
CREATE INDEX IF NOT EXISTS workflows_is_template_idx ON public.workflows(is_template);

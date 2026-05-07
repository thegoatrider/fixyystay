-- 🛡️ FINAL SECURITY FIX: Owner RLS
-- RUN THIS IN YOUR SUPABASE SQL EDITOR

-- 1. Enable RLS on owners if not already enabled
ALTER TABLE public.owners ENABLE ROW LEVEL SECURITY;

-- 2. Create policies for Owners
DROP POLICY IF EXISTS "Owners can view own record" ON public.owners;
CREATE POLICY "Owners can view own record" 
ON public.owners FOR SELECT 
USING (
    auth.uid() = user_id 
    OR email = auth.jwt() ->> 'email'
    OR (auth.jwt() -> 'user_metadata' ->> 'role' = 'admin')
);

DROP POLICY IF EXISTS "Owners can update own record" ON public.owners;
CREATE POLICY "Owners can update own record" 
ON public.owners FOR UPDATE
USING (
    auth.uid() = user_id 
    OR email = auth.jwt() ->> 'email'
);

-- 3. Policy for the self-healing linking
DROP POLICY IF EXISTS "Users can link themselves to existing owner records" ON public.owners;
CREATE POLICY "Users can link themselves to existing owner records"
ON public.owners FOR UPDATE
TO authenticated
USING (email = auth.jwt() ->> 'email')
WITH CHECK (email = auth.jwt() ->> 'email');

-- 4. RPC Security Check
-- Ensure the RPC is SECURITY DEFINER so it bypasses RLS if needed, which it already is.

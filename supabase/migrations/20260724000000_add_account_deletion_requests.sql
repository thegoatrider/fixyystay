-- SQL Migration: Add Account Deletion Requests
-- This table stores deletion requests from users who have uninstalled the app or are not logged in.

CREATE TABLE IF NOT EXISTS public.account_deletion_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL,
    name TEXT NOT NULL,
    phone TEXT,
    account_type TEXT NOT NULL,
    reason TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.account_deletion_requests ENABLE ROW LEVEL SECURITY;

-- Allow public inserts
CREATE POLICY "Allow public insert to account_deletion_requests" ON public.account_deletion_requests
    FOR INSERT WITH CHECK (true);

-- Allow authenticated admins to view all requests
CREATE POLICY "Admins can view all account deletion requests" ON public.account_deletion_requests
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM auth.users
            WHERE auth.uid() = id AND (raw_user_meta_data->>'role' = 'admin' OR email = 'superadmin@fixstay.com')
        )
    );

-- Allow authenticated admins to update requests (e.g. mark as completed)
CREATE POLICY "Admins can update account deletion requests" ON public.account_deletion_requests
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM auth.users
            WHERE auth.uid() = id AND (raw_user_meta_data->>'role' = 'admin' OR email = 'superadmin@fixstay.com')
        )
    );

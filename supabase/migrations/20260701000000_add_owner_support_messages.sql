-- SQL Migration: Support Messages Section
-- RUN THIS IN YOUR SUPABASE SQL EDITOR OR CLI

CREATE TABLE IF NOT EXISTS public.support_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    sender_type TEXT NOT NULL CHECK (sender_type IN ('admin', 'owner')),
    content TEXT NOT NULL,
    attachment_url TEXT,
    is_read BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;

-- Admins can read and write all support messages
CREATE POLICY "Admins can view all support messages" ON public.support_messages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM auth.users
            WHERE auth.uid() = id AND (raw_user_meta_data->>'role' = 'admin' OR email = 'superadmin@fixstay.com')
        )
    );

CREATE POLICY "Admins can insert support messages" ON public.support_messages
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM auth.users
            WHERE auth.uid() = id AND (raw_user_meta_data->>'role' = 'admin' OR email = 'superadmin@fixstay.com')
        )
        AND sender_type = 'admin'
    );

CREATE POLICY "Admins can update support messages" ON public.support_messages
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM auth.users
            WHERE auth.uid() = id AND (raw_user_meta_data->>'role' = 'admin' OR email = 'superadmin@fixstay.com')
        )
    );

-- Owners can only read and write their own support messages
CREATE POLICY "Owners can view their own support messages" ON public.support_messages
    FOR SELECT USING (
        auth.uid() = owner_id
    );

CREATE POLICY "Owners can insert their own support messages" ON public.support_messages
    FOR INSERT WITH CHECK (
        auth.uid() = owner_id
        AND sender_type = 'owner'
    );

CREATE POLICY "Owners can update their own support messages" ON public.support_messages
    FOR UPDATE USING (
        auth.uid() = owner_id
    );

-- Enable Realtime for the support_messages table
ALTER PUBLICATION supabase_realtime ADD TABLE public.support_messages;

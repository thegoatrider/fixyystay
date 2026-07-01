-- SQL Migration: Google Drive Cloud Backup Store
-- RUN THIS IN YOUR SUPABASE SQL EDITOR

CREATE TABLE IF NOT EXISTS public.owner_google_tokens (
    owner_id UUID PRIMARY KEY REFERENCES public.owners(id) ON DELETE CASCADE,
    access_token TEXT NOT NULL,
    refresh_token TEXT NOT NULL,
    expiry_date TIMESTAMPTZ NOT NULL,
    google_email TEXT,
    root_folder_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.owner_google_tokens ENABLE ROW LEVEL SECURITY;

-- Owners can view, insert, update, or delete their own tokens
CREATE POLICY "Owners can view their own google tokens" ON public.owner_google_tokens
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.owners
            WHERE public.owners.id = owner_id AND public.owners.user_id = auth.uid()
        )
    );

CREATE POLICY "Owners can insert their own google tokens" ON public.owner_google_tokens
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.owners
            WHERE public.owners.id = owner_id AND public.owners.user_id = auth.uid()
        )
    );

CREATE POLICY "Owners can update their own google tokens" ON public.owner_google_tokens
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.owners
            WHERE public.owners.id = owner_id AND public.owners.user_id = auth.uid()
        )
    );

CREATE POLICY "Owners can delete their own google tokens" ON public.owner_google_tokens
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.owners
            WHERE public.owners.id = owner_id AND public.owners.user_id = auth.uid()
        )
    );

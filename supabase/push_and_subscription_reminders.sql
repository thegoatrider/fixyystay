-- SQL Migration: Push Notification Tokens & Subscription Reminder Tracking

-- 1. Device Push Tokens Table
CREATE TABLE IF NOT EXISTS public.user_push_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    token TEXT NOT NULL UNIQUE,
    platform TEXT NOT NULL DEFAULT 'android', -- 'android', 'ios', 'web'
    device_info JSONB DEFAULT '{}'::jsonb,
    last_seen_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookup by user_id
CREATE INDEX IF NOT EXISTS idx_user_push_tokens_user_id ON public.user_push_tokens(user_id);

-- Enable RLS
ALTER TABLE public.user_push_tokens ENABLE ROW LEVEL SECURITY;

-- Allow users to manage their own tokens
CREATE POLICY "Users can insert their own push tokens"
ON public.user_push_tokens FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own push tokens"
ON public.user_push_tokens FOR UPDATE TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own push tokens"
ON public.user_push_tokens FOR SELECT TO authenticated
USING (auth.uid() = user_id);

-- 2. Subscription Reminder Logs Table
CREATE TABLE IF NOT EXISTS public.subscription_reminder_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID REFERENCES public.owners(id) ON DELETE CASCADE,
    subscription_id UUID REFERENCES public.owner_subscriptions(id) ON DELETE CASCADE,
    reminder_type TEXT NOT NULL, -- 'expiring_in_3_days', 'expiring_in_1_day', 'expired', 'trial_ending_soon'
    channel TEXT DEFAULT 'push', -- 'push', 'in_app', 'whatsapp'
    status TEXT DEFAULT 'sent', -- 'sent', 'failed'
    details JSONB DEFAULT '{}'::jsonb,
    sent_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for quick duplicate check
CREATE INDEX IF NOT EXISTS idx_sub_reminder_logs_owner_type ON public.subscription_reminder_logs(owner_id, reminder_type, sent_at);

-- Enable RLS
ALTER TABLE public.subscription_reminder_logs ENABLE ROW LEVEL SECURITY;

-- Admins can view and manage all reminder logs
CREATE POLICY "Admins manage reminder logs"
ON public.subscription_reminder_logs FOR ALL TO authenticated
USING (auth.jwt() ->> 'email' = 'superadmin@fixstay.com');

-- Owners can view their own reminder logs
CREATE POLICY "Owners view their own reminder logs"
ON public.subscription_reminder_logs FOR SELECT TO authenticated
USING (owner_id IN (SELECT id FROM public.owners WHERE user_id = auth.uid()));

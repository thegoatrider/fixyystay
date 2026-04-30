-- WhatsApp Campaigns System

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. WhatsApp Accounts Table
CREATE TABLE IF NOT EXISTS public.whatsapp_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID REFERENCES public.owners(id) ON DELETE CASCADE,
    business_name TEXT NOT NULL,
    whatsapp_phone_number TEXT NOT NULL,
    phone_number_id TEXT NOT NULL,
    waba_id TEXT NOT NULL,
    access_token TEXT NOT NULL,
    status TEXT DEFAULT 'connected',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(owner_id)
);

-- 2. Modifications to Leads Table
-- Add guest_name if missing (fallback for older migrations)
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS guest_name TEXT;

-- 3. WhatsApp Templates Table (Admin controlled)
CREATE TABLE IF NOT EXISTS public.whatsapp_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    template_name TEXT NOT NULL UNIQUE,
    language_code TEXT DEFAULT 'en_US',
    body_text TEXT NOT NULL,
    variable_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert a default template for testing
INSERT INTO public.whatsapp_templates (template_name, language_code, body_text, variable_count)
VALUES ('diwali_offer', 'en', 'Happy Diwali! 🎉 Come back and enjoy 20% off.', 0)
ON CONFLICT (template_name) DO NOTHING;

-- 4. Campaigns Table
CREATE TABLE IF NOT EXISTS public.campaigns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID REFERENCES public.owners(id) ON DELETE CASCADE,
    template_name TEXT NOT NULL,
    status TEXT DEFAULT 'queued', -- queued, processing, completed
    total_recipients INTEGER DEFAULT 0,
    total_sent INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Campaign Logs Table
CREATE TABLE IF NOT EXISTS public.campaign_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campaign_id UUID REFERENCES public.campaigns(id) ON DELETE CASCADE,
    lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE,
    phone_number TEXT NOT NULL,
    status TEXT DEFAULT 'queued', -- queued, sent, delivered, read, failed
    error_message TEXT,
    meta_message_id TEXT, -- ID returned from WhatsApp for webhook matching
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS limits (basic placeholders depending on project strictness)
ALTER TABLE public.whatsapp_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_logs ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to view basically (this can be scoped based on existing auth patterns)
CREATE POLICY "Allow ALL on whatsapp_accounts" ON public.whatsapp_accounts FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow ALL on whatsapp_templates" ON public.whatsapp_templates FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow ALL on campaigns" ON public.campaigns FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow ALL on campaign_logs" ON public.campaign_logs FOR ALL TO authenticated USING (true);

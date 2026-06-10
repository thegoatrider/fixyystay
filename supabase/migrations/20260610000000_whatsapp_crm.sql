-- WhatsApp CRM & Guest Revival System Migration

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. WhatsApp Accounts Table
CREATE TABLE IF NOT EXISTS public.whatsapp_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID REFERENCES public.owners(id) ON DELETE CASCADE,
    business_name TEXT,
    whatsapp_phone_number TEXT,
    phone_number_id TEXT,
    waba_id TEXT,
    access_token TEXT,
    status TEXT DEFAULT 'pending', -- pending, connected, disconnected
    verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(owner_id)
);

-- 2. Modify Leads Table
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'Manual';
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 3. Lead Tags
CREATE TABLE IF NOT EXISTS public.lead_tags (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE,
    tag_name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(lead_id, tag_name)
);

-- 4. WhatsApp Templates Table
CREATE TABLE IF NOT EXISTS public.whatsapp_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID REFERENCES public.owners(id) ON DELETE CASCADE, -- Null means global, otherwise specific to an owner
    template_name TEXT NOT NULL,
    language_code TEXT DEFAULT 'en',
    category TEXT,
    components JSONB, -- Meta template components
    status TEXT DEFAULT 'APPROVED',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(owner_id, template_name, language_code)
);

-- 5. Conversations Table
CREATE TABLE IF NOT EXISTS public.conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID REFERENCES public.owners(id) ON DELETE CASCADE,
    lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE,
    last_message_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(owner_id, lead_id)
);

-- 6. Messages Table
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE,
    lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE,
    direction TEXT NOT NULL, -- 'inbound', 'outbound'
    type TEXT NOT NULL, -- 'text', 'template', 'image', 'document'
    content TEXT,
    media_url TEXT,
    meta_message_id TEXT UNIQUE,
    status TEXT DEFAULT 'sent', -- 'sent', 'delivered', 'read', 'failed' (for outbound), 'received' (for inbound)
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Campaigns Table
CREATE TABLE IF NOT EXISTS public.campaigns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID REFERENCES public.owners(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    template_name TEXT NOT NULL,
    audience_filter JSONB,
    status TEXT DEFAULT 'queued', -- queued, processing, completed, failed
    total_recipients INTEGER DEFAULT 0,
    total_sent INTEGER DEFAULT 0,
    total_delivered INTEGER DEFAULT 0,
    total_read INTEGER DEFAULT 0,
    total_replies INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Campaign Logs
CREATE TABLE IF NOT EXISTS public.campaign_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campaign_id UUID REFERENCES public.campaigns(id) ON DELETE CASCADE,
    lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE,
    phone_number TEXT NOT NULL,
    status TEXT DEFAULT 'queued', -- queued, sent, delivered, read, failed
    error_message TEXT,
    meta_message_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Job Queue for Background Worker
CREATE TABLE IF NOT EXISTS public.message_queue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID REFERENCES public.owners(id) ON DELETE CASCADE,
    campaign_id UUID REFERENCES public.campaigns(id) ON DELETE CASCADE,
    lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE,
    type TEXT DEFAULT 'template', -- 'text' or 'template'
    payload JSONB NOT NULL, -- Contains template name, variables, phone number
    status TEXT DEFAULT 'pending', -- pending, processing, completed, failed
    error TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    processed_at TIMESTAMPTZ
);

-- 10. Lead Notes
CREATE TABLE IF NOT EXISTS public.lead_notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE,
    owner_id UUID REFERENCES public.owners(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. Add campaign_id to bookings for ROI
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS campaign_id UUID REFERENCES public.campaigns(id) ON DELETE SET NULL;

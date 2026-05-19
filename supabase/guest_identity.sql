-- Enable uuid extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create Enums
DO $$ BEGIN
    CREATE TYPE govt_document_type AS ENUM ('AADHAAR', 'PAN', 'PASSPORT', 'DRIVING_LICENSE', 'VOTER_ID', 'UNKNOWN');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE verification_status_type AS ENUM ('PENDING', 'PROCESSING', 'VERIFIED', 'FAILED', 'MANUAL_REVIEW');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create Guest Identity Table
CREATE TABLE IF NOT EXISTS public.guest_identity (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    checkin_id UUID REFERENCES public.guest_checkins(id) ON DELETE CASCADE,
    document_type govt_document_type DEFAULT 'UNKNOWN',
    document_number TEXT,
    full_name TEXT,
    date_of_birth TEXT,
    document_confidence NUMERIC,
    is_verified BOOLEAN DEFAULT FALSE,
    verification_status verification_status_type DEFAULT 'PENDING',
    document_image_url TEXT,
    document_thumbnail TEXT,
    raw_ocr_text TEXT,
    ocr_json JSONB,
    verification_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS (Assuming you want this restricted, though checkins are typically public inserts. We'll enable it and allow anon inserts if needed, or just admin access since backend handles it).
ALTER TABLE public.guest_identity ENABLE ROW LEVEL SECURITY;

-- Allow inserts from authenticated/anon if needed, or backend service role.
-- Since the backend uses createAdminClient() (service role), it bypasses RLS anyway.
-- But just in case, we can add a policy for service role explicitly or leave it default (service role bypasses).

-- Create index on checkin_id
CREATE INDEX IF NOT EXISTS idx_guest_identity_checkin_id ON public.guest_identity(checkin_id);

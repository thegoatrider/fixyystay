-- Create OCR Cache Table to avoid redundant Gemini API requests
CREATE TABLE IF NOT EXISTS public.ocr_cache (
    image_hash TEXT PRIMARY KEY,
    ocr_json JSONB NOT NULL,
    document_type TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.ocr_cache ENABLE ROW LEVEL SECURITY;

-- Server actions bypass RLS via Supabase service role admin client.
-- No public policies are needed as anonymous / standard users should not directly query the raw OCR cache.

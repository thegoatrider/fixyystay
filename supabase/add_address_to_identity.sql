-- Add address and raw_ocr_text_back columns to guest_identity table

ALTER TABLE public.guest_identity
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS raw_ocr_text_back TEXT;

COMMENT ON COLUMN public.guest_identity.address IS 'Address extracted from the back side of the government ID document';
COMMENT ON COLUMN public.guest_identity.raw_ocr_text_back IS 'Raw OCR text extracted from the back side of the government ID document';

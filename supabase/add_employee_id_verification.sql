-- Add extended fields to property_employees table
-- Run this in Supabase SQL Editor

ALTER TABLE public.property_employees
  ADD COLUMN IF NOT EXISTS date_of_birth       TEXT,
  ADD COLUMN IF NOT EXISTS guardian_name        TEXT,
  ADD COLUMN IF NOT EXISTS guardian_phone       TEXT,
  ADD COLUMN IF NOT EXISTS govt_doc_type        TEXT,        -- AADHAAR / PAN / PASSPORT / etc
  ADD COLUMN IF NOT EXISTS govt_doc_number      TEXT,
  ADD COLUMN IF NOT EXISTS govt_doc_name        TEXT,        -- Full name as extracted by OCR
  ADD COLUMN IF NOT EXISTS govt_doc_dob         TEXT,        -- DOB as extracted by OCR
  ADD COLUMN IF NOT EXISTS govt_doc_front_url   TEXT,        -- Front side image URL
  ADD COLUMN IF NOT EXISTS govt_doc_back_url    TEXT,        -- Back side image URL
  ADD COLUMN IF NOT EXISTS govt_doc_confidence  NUMERIC,
  ADD COLUMN IF NOT EXISTS govt_doc_verified    BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS govt_doc_ocr_json    JSONB,
  ADD COLUMN IF NOT EXISTS name_match_status    TEXT,        -- 'MATCHED' | 'MISMATCH' | 'UNVERIFIED'
  ADD COLUMN IF NOT EXISTS dob_match_status     TEXT;        -- 'MATCHED' | 'MISMATCH' | 'UNVERIFIED'

COMMENT ON COLUMN public.property_employees.date_of_birth    IS 'Employee date of birth (entered by owner)';
COMMENT ON COLUMN public.property_employees.guardian_name    IS 'Emergency contact / reference person name';
COMMENT ON COLUMN public.property_employees.guardian_phone   IS 'Emergency contact / reference person phone number';
COMMENT ON COLUMN public.property_employees.govt_doc_type    IS 'Document type: AADHAAR, PAN, PASSPORT, DRIVING_LICENSE, VOTER_ID';
COMMENT ON COLUMN public.property_employees.govt_doc_number  IS 'Document number as extracted by OCR';
COMMENT ON COLUMN public.property_employees.govt_doc_name    IS 'Full name as extracted from government ID by OCR';
COMMENT ON COLUMN public.property_employees.govt_doc_dob     IS 'Date of birth as extracted from government ID by OCR';
COMMENT ON COLUMN public.property_employees.govt_doc_front_url IS 'Storage URL for front side of government ID';
COMMENT ON COLUMN public.property_employees.govt_doc_back_url  IS 'Storage URL for back side of government ID';
COMMENT ON COLUMN public.property_employees.name_match_status  IS 'MATCHED if OCR name matches entered name, MISMATCH otherwise';
COMMENT ON COLUMN public.property_employees.dob_match_status   IS 'MATCHED if OCR DOB matches entered DOB, MISMATCH otherwise';

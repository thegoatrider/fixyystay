-- Add police verification status to property_employees
ALTER TABLE public.property_employees
ADD COLUMN IF NOT EXISTS police_verification_status TEXT DEFAULT 'PENDING' CHECK (police_verification_status IN ('PENDING', 'APPROVED', 'REJECTED'));

COMMENT ON COLUMN public.property_employees.police_verification_status IS 'Status of police approval: PENDING, APPROVED, or REJECTED';

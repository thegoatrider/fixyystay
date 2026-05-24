-- Create property_employees table
CREATE TABLE IF NOT EXISTS public.property_employees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE,
    owner_id UUID REFERENCES public.owners(id) ON DELETE CASCADE,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    mobile_number TEXT NOT NULL,
    permanent_address TEXT,
    property_address TEXT,
    role TEXT NOT NULL,
    govt_verification_id TEXT, -- Can be linked to guest_identity or just a URL/String
    attendance_pin TEXT NOT NULL,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'fired')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for property_employees
ALTER TABLE public.property_employees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can view their own employees" 
ON public.property_employees FOR SELECT 
USING (auth.uid() = owner_id);

CREATE POLICY "Owners can insert their own employees" 
ON public.property_employees FOR INSERT 
WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Owners can update their own employees" 
ON public.property_employees FOR UPDATE 
USING (auth.uid() = owner_id);

-- Create employee_attendance table
CREATE TABLE IF NOT EXISTS public.employee_attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID REFERENCES public.property_employees(id) ON DELETE CASCADE,
    owner_id UUID REFERENCES public.owners(id) ON DELETE CASCADE,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    time_in TIMESTAMP WITH TIME ZONE,
    time_out TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for employee_attendance
ALTER TABLE public.employee_attendance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can view their employees attendance" 
ON public.employee_attendance FOR SELECT 
USING (auth.uid() = owner_id);

CREATE POLICY "Owners can insert their employees attendance" 
ON public.employee_attendance FOR INSERT 
WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Owners can update their employees attendance" 
ON public.employee_attendance FOR UPDATE 
USING (auth.uid() = owner_id);

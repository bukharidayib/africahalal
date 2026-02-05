-- Create Blogs Table
CREATE TABLE IF NOT EXISTS public.blogs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    excerpt TEXT,
    content TEXT NOT NULL,
    image_url TEXT,
    author_id UUID REFERENCES auth.users(id),
    published BOOLEAN DEFAULT false,
    published_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS for Blogs
ALTER TABLE public.blogs ENABLE ROW LEVEL SECURITY;

-- Blog Policies
CREATE POLICY "Public read access for published blogs" ON public.blogs
    FOR SELECT USING (published = true);

CREATE POLICY "Admin full access for blogs" ON public.blogs
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles
            WHERE user_id = auth.uid()
            AND role IN ('super_admin', 'certification_officer')
        )
    );

-- Supervisors Management
-- We will use a junction table or a direct column on organizations depending on the requirement. 
-- "Remember each supervisor he can assign on only one company" & "creating supervisors then assigining specific company"
-- This implies a One-to-One relationship between Supervisor (User) and Company (Organization) ? Or One Supervisor -> One Company?
-- Let's assume a Supervisor manages ONE company, but a company might have multiple supervisors? 
-- "assign specific company and remember each supervisor he can assign on only one company" -> Supervisor belongs to ONE company.

CREATE TABLE IF NOT EXISTS public.organization_supervisors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    supervisor_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    assigned_by UUID REFERENCES auth.users(id),
    CONSTRAINT unique_supervisor UNIQUE (supervisor_id) -- A supervisor can only be assigned to one company
);

-- Enable RLS
ALTER TABLE public.organization_supervisors ENABLE ROW LEVEL SECURITY;

-- Supervisor Policies
CREATE POLICY "Admin full access for supervisors" ON public.organization_supervisors
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles
            WHERE user_id = auth.uid()
            AND role IN ('super_admin', 'certification_officer')
        )
    );

CREATE POLICY "Supervisors can view their own assignment" ON public.organization_supervisors
    FOR SELECT
    USING (supervisor_id = auth.uid());

-- Add duration/pricing fields to certification_applications if not present, 
-- though usually we might just store the result. Let's add a validity_period column if needed or rely on metadata.
-- Use JSONB for flexibility or adding specific columns.
ALTER TABLE public.certification_applications 
ADD COLUMN IF NOT EXISTS validity_period TEXT, -- '6_months' or '1_year'
ADD COLUMN IF NOT EXISTS application_fee NUMERIC;

-- Update RLS for Inspection Reports to ensure Clients can read their own inspections
-- Assuming 'inspection_reports' has 'organization_id'
-- Existing policies might limit this. Let's ensure strict RLS.

DROP POLICY IF EXISTS "Clients view own inspections" ON public.inspection_reports;
CREATE POLICY "Clients view own inspections" ON public.inspection_reports
    FOR SELECT
    USING (
        inspection_id IN (
            SELECT i.id FROM public.inspections i
            JOIN public.certification_applications ca ON ca.id = i.application_id
            WHERE ca.organization_id IN (
                SELECT organization_id FROM public.profiles 
                WHERE id = auth.uid()
            )
        )
    );


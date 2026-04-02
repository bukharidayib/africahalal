-- Add is_manager flag to inspectors
ALTER TABLE public.inspectors ADD COLUMN IF NOT EXISTS is_manager BOOLEAN NOT NULL DEFAULT false;

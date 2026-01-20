-- Fix Function Search Path Mutable warning
ALTER FUNCTION public.update_updated_at_column() SET search_path = public;
ALTER FUNCTION public.log_application_status_change() SET search_path = public;

-- Fix overly permissive RLS policies for audit_logs INSERT and application_status_history INSERT

-- Drop the overly permissive policies
DROP POLICY IF EXISTS "Insert audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "System can insert status history" ON public.application_status_history;

-- Recreate with proper checks - audit logs can only be inserted by authenticated users with their own user_id
CREATE POLICY "Authenticated users can insert audit logs"
ON public.audit_logs FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Status history is inserted via trigger, so we need to allow the trigger function to insert
-- The trigger runs as the user making the update, so we verify the changed_by matches auth.uid()
CREATE POLICY "Trigger can insert status history"
ON public.application_status_history FOR INSERT
TO authenticated
WITH CHECK (changed_by = auth.uid());
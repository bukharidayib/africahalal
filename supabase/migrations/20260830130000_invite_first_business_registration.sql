-- Allow admins to register a business before its owner creates a client account.
ALTER TABLE public.client_businesses
  ALTER COLUMN user_id DROP NOT NULL;

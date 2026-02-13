

# Fix: Client Dashboard Showing Other Organizations' Data

## Problem
The new user `bukharipanel@gmail.com` (org: Bukhari Foods Co.) sees 3 certificates and stats that don't belong to them. This is caused by an overly permissive RLS policy on the `certificates` table.

## Root Cause

The `certificates` table has this RLS policy:
```
"Public can verify certificates" → USING (true)
```
This allows **any user** (including anonymous) to read **all certificates**. While this was intended for the public `/verify` page, it also leaks all certificate data into the client dashboard.

The client dashboard queries `certificates` without any filter, and since the public policy returns everything, the user sees all 3 certificates from another organization.

## Solution

### Database Migration

1. **Drop** the overly permissive `"Public can verify certificates"` policy
2. **Create** a scoped public verification policy that only exposes minimal fields needed for verification (certificate_number, status, expiry_date) — but since RLS operates at row level (not column level), we need a different approach:
   - Create a `verify_certificate` database function (SECURITY DEFINER) that takes a certificate number and returns only the public verification fields
   - The public verify page will call this function instead of querying the table directly
   - This way the base table policy restricts clients to their own org's certificates only

Alternatively, since the public verify page only needs to look up by certificate number, we can:
- **Drop** the `"Public can verify certificates"` policy  
- **Replace** it with a narrower policy scoped to anon users that is acceptable, OR create a SECURITY DEFINER function for verification lookups

The simplest safe approach:
- Drop `"Public can verify certificates" USING (true)`
- Create a SECURITY DEFINER function `verify_certificate_public(cert_number text)` that returns limited certificate info for the public verify page
- Update the `/verify` page code to call this function instead of querying the table directly

### Code Changes

1. **`src/pages/Verify.tsx`** and **`src/pages/VerifyPublic.tsx`**: Update to use the new `verify_certificate_public` RPC function instead of direct table queries

### Files Modified
- Database migration (drop public policy, create verification function)
- `src/pages/Verify.tsx` — use RPC for public verification
- `src/pages/VerifyPublic.tsx` — use RPC for public verification

### Result
- Client dashboard will only show certificates belonging to the user's organization
- Public certificate verification still works via the secure function
- No data leakage between organizations


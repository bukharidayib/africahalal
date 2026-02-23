

# Fix: Supervisor Invitation Email Validation

## Root Cause
The email `thebukhaaridayib@gmail` (missing `.com`) was stored in the database because there is no email format validation. Resend correctly rejects it with "Invalid `to` field" error. Both creating new invitations and resending existing ones fail for the same reason -- no validation at any layer.

## Changes

### 1. Add email validation in `src/admin/pages/Supervisors.tsx`

**In `handleCreateSupervisor`** (around line 224):
- Add a regex-based email validation before inserting the invitation record
- Show a user-friendly toast error like "Please enter a valid email address" if the format is invalid

**In `handleResendInvitation`** (around line 363):
- Add the same email validation before calling the edge function
- If the stored email is invalid, show a toast error suggesting the user delete the invitation and create a new one with a correct email

The validation regex: `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`

### 2. Add server-side validation in `supabase/functions/send-supervisor-invitation/index.ts`

- After parsing the request body (line 52), add email format validation using the same regex
- If invalid, return a 400 response with a clear error message: "Invalid email address format"
- This acts as a safety net regardless of what the frontend sends

### 3. Clean up the bad invitation record

- The existing record with `thebukhaaridayib@gmail` will continue to fail on resend. The user should delete it via the existing delete button and re-create with the correct email. No migration needed.

## Files Modified

| File | Change |
|------|--------|
| `src/admin/pages/Supervisors.tsx` | Add email format validation in `handleCreateSupervisor` and `handleResendInvitation` |
| `supabase/functions/send-supervisor-invitation/index.ts` | Add server-side email validation before calling Resend |


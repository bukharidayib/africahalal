
# Fix: Invitation Status Stays "Pending" After Registration

## Root Cause (Confirmed by Code Analysis)

The `admin_invitations` table has this RLS UPDATE policy:

```sql
Policy: "Admin users can update invitations"
Command: UPDATE
Using Expression: is_admin_user(auth.uid())
```

This means **only existing admin users** (those already in `user_roles`) can update rows in `admin_invitations`. 

When a newly invited person goes through `/admin/register` and completes the form:
1. `supabase.auth.signUp()` creates their account — they are NOT yet an admin
2. The code tries to run `supabase.from('admin_invitations').update(...)` — this **silently fails** (RLS blocks it)
3. `supabase.auth.signOut()` is called immediately after
4. The user is redirected to `/admin/login` — status remains "Pending"

There is no error thrown because Supabase RLS-blocked updates return success with 0 rows affected — they don't throw an exception.

## The Fix: Two-Part Solution

### Part 1 — Create `supabase/functions/accept-invitation/index.ts` (New Edge Function)
A new edge function that uses the **Supabase Service Role Key** to bypass RLS and update the invitation status. This is the correct and secure approach because:
- The function validates the invitation token + email match before updating
- It checks the invitation is still `pending` and not expired
- Uses `SUPABASE_SERVICE_ROLE_KEY` (already configured as a secret) to perform the write

The function will:
1. Accept `{ email, token }` in the request body (token comes from the invitation record)
2. Look up the `admin_invitations` record matching `email + token + status='pending'`
3. Verify it is not expired
4. Update `status = 'accepted'` and `accepted_at = now()`
5. Return success or a descriptive error

### Part 2 — Update `AdminRegister.tsx` to Pass the Token
The invitation URL currently contains `?email=...&invited=true&role=...` but does NOT include the invitation `token`. We need to:

1. **Update `send-invitation/index.ts`**: Add `&token=${invitation_token}` to the `registerUrl` so the token is passed in the email link
2. **Update `AdminRegister.tsx`**: 
   - Read `token` from the URL search params
   - After `signUp()` succeeds, call the new `accept-invitation` edge function with `{ email, token }` instead of trying to update the DB directly via the client

### Why a Token?
The token is a UUID already stored in `admin_invitations` and is unique per invitation. Passing it in the URL means:
- Only someone who received the actual email can mark the invitation accepted
- No authenticated session is needed — the token is the proof of identity
- The edge function can safely do the update using the service role key

## Files Changed

| File | Change |
|------|--------|
| `supabase/functions/accept-invitation/index.ts` | **New edge function** — accepts `{ email, token }`, validates and updates invitation status using service role key |
| `supabase/functions/send-invitation/index.ts` | Add `&token=...` to the `registerUrl` so the token is embedded in the invitation email link |
| `src/admin/pages/AdminRegister.tsx` | Read `token` from URL params; replace direct DB update with a call to the new edge function |

No database migration needed — the `token` column already exists in `admin_invitations`.

## Updated Registration Flow

```text
Admin sends invitation → email sent
         ↓
Email link: /admin/register?email=...&invited=true&role=...&token=<uuid>
         ↓
User fills form and submits
         ↓
supabase.auth.signUp() — account created (not yet admin)
         ↓
Call accept-invitation edge function with { email, token }
         ↓
Edge function validates token + email, uses service role to UPDATE
admin_invitations SET status='accepted', accepted_at=now()
         ↓
supabase.auth.signOut()
         ↓
Navigate to /admin/login with success toast
         ↓
Admin portal shows "Accepted" status ✓
```

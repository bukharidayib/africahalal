
# Fix: Admin Users Can't Sign In After Registration

## Root Cause (Confirmed by Database Inspection)

The user `afrosaas@gmail.com` successfully registered and the invitation was marked `accepted` — but they still cannot sign in because **they have zero rows in the `user_roles` table**.

The `useAdminAuth` hook checks `user_roles` on every login to determine if a user is an admin. If there is no row, it returns `role: null` and sets the error: *"You do not have admin access to this portal."*

**Why is the role never assigned?**

The `accept-invitation` edge function (the last thing called during registration) only does one thing: it updates `admin_invitations.status = 'accepted'`. It never reads the `role_id` from the invitation record and never inserts the corresponding row into `user_roles`. This step was never implemented.

**Confirmed from the database:**
- `admin_invitations` for `afrosaas@gmail.com` → `status: accepted`, `role_id: d47e8852` (CIDO role)
- `user_roles` for that user → **empty** — no rows at all

---

## The Fix

### Part 1 — Update `supabase/functions/accept-invitation/index.ts`

After successfully updating the invitation status to `accepted`, the function must also **insert the user's role** into `user_roles`.

The function already looks up the invitation record which contains `role_id`. It just needs to:
1. Find the `user_id` in `profiles` that matches the invitation `email`
2. Insert `{ user_id, role_id, assigned_by: null }` into `user_roles`
3. Handle the case where the user's profile doesn't exist yet (rare race condition — sign up may not have completed profile creation in time) — in this case, still mark invitation accepted and log a warning

The `accept-invitation` function already uses the **Service Role Key** which bypasses all RLS — so it can freely insert into `user_roles` without needing any extra permissions.

### Part 2 — Fix the existing user `afrosaas@gmail.com` right now

Since the user already registered, their profile exists but their role was never assigned. A one-time database fix will be applied via migration SQL to assign them the CIDO role they were invited for:

```sql
INSERT INTO user_roles (user_id, role_id)
VALUES (
  '2e45778c-4f74-4cde-8b6c-95f8894f21ab',  -- afrosaas@gmail.com profile id
  'd47e8852-abe3-45e6-9f45-af06eaea9a0e'   -- CIDO role id
)
ON CONFLICT DO NOTHING;
```

This fixes the immediate problem for this user without requiring them to re-register.

---

## Updated Flow After Fix

```text
User submits registration form
         ↓
supabase.auth.signUp() → creates auth user + profile (via handle_new_user trigger)
         ↓
Profile updated: full_name, phone
         ↓
accept-invitation edge function called with { email, token }
         ↓
Edge function: validates token + email → updates invitation to 'accepted'
         ↓
Edge function: looks up profile.id by email
         ↓
Edge function: INSERT INTO user_roles (user_id, role_id) ← NEW STEP
         ↓
supabase.auth.signOut()
         ↓
Navigate to /admin/login
         ↓
User signs in → useAdminAuth finds role in user_roles → ACCESS GRANTED ✓
```

---

## Files Changed

| File | Change |
|------|--------|
| `supabase/functions/accept-invitation/index.ts` | After marking invitation accepted, also fetch the invited user's profile by email and insert their role into `user_roles` |
| Database (migration) | One-time fix: insert the missing `user_roles` row for `afrosaas@gmail.com` so they can sign in immediately |

No changes needed to `AdminRegister.tsx`, `InvitationsTab.tsx`, or `send-invitation`.

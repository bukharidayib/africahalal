
# Fix Admin Invitation: Email Link + Admin Registration Page

## What Was Found (Root Cause Analysis)

The previous plan was approved but its file changes were not committed to the codebase. Two critical pieces are still broken:

**Issue 1 — Wrong link in invitation email**
In `supabase/functions/send-invitation/index.ts` (line 111), the "Accept Invitation" button links to:
```
/auth/signup?email=...&invited=true
```
This sends invited admins to the **client portal** signup, which requires an NRC number (Zambian national ID) and redirects to the client portal upon completion — not the admin portal.

**Issue 2 — AdminRegister page does not exist**
`src/admin/pages/AdminRegister.tsx` was never created. There is no `/admin/register` route in `App.tsx`. Even if the email link was corrected, there would be no page for invited admins to land on.

**Issue 3 — Email template is plain and not fully branded**
The current email uses a simple green header but lacks the role badge, inviter attribution callout, expiry warning, and secondary "already have an account" admin login link that were planned.

---

## What Will Be Built

### 1. Create `src/admin/pages/AdminRegister.tsx`
A dedicated admin-only registration page that:
- Reads `?email=...` from the URL query string and pre-fills the email field (read-only, cannot be changed)
- Collects only: **Full Name**, **Phone**, **Password** (+ Confirm Password with strength meter)
- Has a password strength indicator and generate-password button (matching the client SignUp UX)
- On submit: calls `supabase.auth.signUp()`, updates profile, marks `admin_invitations` as `accepted`, signs the user out immediately, and redirects to `/admin/login` with a toast message
- Shows clear "Admin Portal" branding with the AHIS logo and a shield icon
- Has a link back to `/admin/login` for users who already have accounts

### 2. Add `/admin/register` route in `src/App.tsx`
Add `<Route path="register" element={<AdminRegister />} />` inside the existing `/admin` route group, alongside the existing `login` route.

### 3. Update Email Template in `supabase/functions/send-invitation/index.ts`
Fix the CTA button URL from `/auth/signup` → `/admin/register` and upgrade the email design:
- Deep green gradient header with "Africa Halal Integrity System — Admin Portal"
- Role badge callout box: "You have been invited as **{role_name}**"
- Inviter credit line: "Invited by **{inviter_name}**"
- 7-day expiry amber warning box
- Large green "Create Your Admin Account" CTA button → `/admin/register?email=...&invited=true&role=...`
- Secondary text: "Already have an admin account? Sign in here" → `/admin/login`
- Professional footer with copyright

### 4. Deploy the Updated Edge Function
After saving the edge function file, deploy it so the next invitation email sent uses the new template and correct URL.

---

## Files Changed

| File | What Changes |
|------|-------------|
| `src/admin/pages/AdminRegister.tsx` | **New file** — admin-only registration page |
| `src/App.tsx` | Add `register` route inside the `/admin` route group |
| `supabase/functions/send-invitation/index.ts` | Fix CTA URL + upgrade email template |

No database migration needed — the `admin_invitations` table already has all required columns.

---

## Admin Register Page Flow

```text
Invited admin receives email
         ↓
Clicks "Create Your Admin Account" button
         ↓
Lands on /admin/register?email=xxx@yyy.com&invited=true
         ↓
Email pre-filled (read-only), enters: Full Name, Phone, Password
         ↓
Submits → supabase.auth.signUp() with emailRedirectTo: /admin/login
         ↓
Profile updated with full_name + phone
         ↓
admin_invitations record updated → status: 'accepted'
         ↓
supabase.auth.signOut() called immediately
         ↓
Redirected to /admin/login with toast:
"Account Created — Check Your Email"
"Please verify your email address, then sign in to the Admin Portal."
```


# Fix Admin Invitation Email & Admin Onboarding Flow

## Problems Found (Deep Investigation)

### Problem 1: Wrong Signup Destination for Invited Admins
The invitation email sends a link to `/auth/signup?email=...&invited=true` — this is the **client portal** signup page. It asks for NRC number (a Zambian national ID), which admin staff don't have as a requirement. After creating their account, the page redirects them to `/auth/signin` (the client portal sign-in), not `/admin/login`. Admin users never land on the right portal.

### Problem 2: Email Technically Sends But Content Needs Improvement
The edge function logs confirm the invitation email is being sent successfully (HTTP 200, Resend confirms with an email ID). However:
- The email may be going to spam because it links to the client signup page instead of a proper admin onboarding route
- The email design, while functional, can be made more professional and trustworthy
- There is no "Admin Portal" branding distinction in the email body — it looks the same as a client invite

### Problem 3: No Dedicated Admin Registration Page
There is currently no `/admin/register` or equivalent route. Invited admins should land on a simplified registration page that:
- Does NOT ask for NRC (not required for admin staff)
- Shows "Admin Portal" branding clearly
- Redirects to `/admin/login` after completion, not the client portal

---

## What Will Be Fixed

### 1. Create `/admin/register` Page
A new dedicated admin registration page at `src/admin/pages/AdminRegister.tsx` that:
- Pre-fills email from the URL query param (same as current signup)
- Collects only: Full Name, Phone, Password (no NRC — not required for admin staff)
- After successful signup, signs the user out, marks the invitation accepted, and redirects to `/admin/login`
- Shows clear "Admin Portal Invitation" branding

### 2. Update Invitation Email — Beautiful New Template
Redesign `supabase/functions/send-invitation/index.ts` with a premium email template:
- AHIS logo area with green gradient header
- Crescent/shield icon for Halal/Islamic branding feel
- Role badge highlighting the specific role being assigned (e.g. "Certification Officer")
- Inviter name displayed prominently
- Expiry countdown callout (7 days)
- CTA button pointing to the new `/admin/register?email=...&invited=true` route
- Secondary link for existing users to go directly to `/admin/login`
- Clean footer with legal disclaimer and support contact

### 3. Update the Invitation Link URL
Change the `href` in the email from:
```
/auth/signup?email=...&invited=true
```
to:
```
/admin/register?email=...&invited=true&role=...
```
This ensures invited admins land on the correct admin-specific registration page.

### 4. Wire Up the New Route in App.tsx
Add `/admin/register` to the router so the new page is reachable.

---

## Technical Details

| File | Change |
|------|--------|
| `supabase/functions/send-invitation/index.ts` | New beautiful email template + correct invitation link URL |
| `src/admin/pages/AdminRegister.tsx` | New admin-specific registration page (no NRC field) |
| `src/App.tsx` | Add `/admin/register` route |

### New Email Design Highlights
- Deep green gradient header with AHIS wordmark
- Role assignment badge (e.g. "Certification Officer — Administrative Access")
- Inviter attribution: "Invited by John Doe"
- 7-day expiry warning callout in amber
- Prominent green CTA button: "Create Your Admin Account"
- "Already have an account? Sign in to Admin Portal" secondary link
- Professional footer with copyright and support email

### Admin Register Page Flow
```text
Invited admin clicks email link
        ↓
/admin/register?email=xxx@yyy.com&invited=true
        ↓
Fills: Full Name, Phone, Password (no NRC)
        ↓
supabase.auth.signUp() called
        ↓
Profile updated, invitation marked "accepted"
        ↓
User signed out (must confirm email)
        ↓
Redirected to /admin/login with success toast
```

No database migration is required — this is purely a frontend page addition and edge function update.

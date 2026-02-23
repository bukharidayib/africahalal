
# Supervisor Onboarding & Site Assignment -- Admin Portal Enhancement

## Overview
Separate supervisor management from internal staff by adding a dedicated supervisor creation and invitation workflow in the Admin Supervisors module. When creating a supervisor, a branded invitation email is sent via Resend with company branding (name, logo, website, email, phone).

---

## Database Changes

### New Table: `supervisor_invitations`
A dedicated invitations table for supervisors (separate from `admin_invitations` which is for internal staff):

| Column | Type | Default |
|--------|------|---------|
| id | uuid PK | gen_random_uuid() |
| email | text NOT NULL | |
| full_name | text | |
| organization_id | uuid | |
| site_name | text | |
| site_address | text | |
| invited_by | uuid NOT NULL | |
| token | uuid NOT NULL | gen_random_uuid() |
| status | text NOT NULL | 'pending' |
| expires_at | timestamptz NOT NULL | now() + 7 days |
| accepted_at | timestamptz | |
| cancelled_at | timestamptz | |
| created_at | timestamptz | now() |
| updated_at | timestamptz | now() |

- RLS: Admin users can manage all records (INSERT, SELECT, UPDATE, DELETE via `is_admin_user`)

---

## New Edge Function: `send-supervisor-invitation`

A dedicated edge function that:
1. Verifies the caller is an authenticated admin
2. Accepts: email, full_name, organization_name, site_name, invitation_id, invitation_token, inviter_name
3. Sends a branded HTML email via Resend from `Africa Halal Integrity System <info@africanhalaal.com>` containing:
   - Company logo (from the published app URL)
   - Company name: "Africa Halal Integrity System"
   - Role badge showing "Field Supervisor"
   - Assigned site and organization details
   - Website: africanhalaal.com
   - Email: info@africanhalaal.com
   - Phone number in footer
   - CTA button linking to supervisor sign-up/registration
   - Expiry warning (7 days)
4. The registration link points to a new `/supervisor/register` page

### Config update (`supabase/config.toml`)
Add `[functions.send-supervisor-invitation]` with `verify_jwt = false`

---

## New Edge Function: `accept-supervisor-invitation`

Similar to the existing `accept-invitation` but for supervisors:
1. Accepts email + token
2. Validates the invitation (pending, not expired)
3. Marks invitation as accepted
4. Looks up the user's profile
5. Inserts a record into `organization_supervisors` (supervisor_id, organization_id, assigned_by)
6. If site_name was provided in the invitation, creates a `supervisor_sites` record

### Config update
Add `[functions.accept-supervisor-invitation]` with `verify_jwt = false`

---

## New Page: `src/pages/supervisor/SupervisorRegister.tsx`

A dedicated registration page at `/supervisor/register`:
- Pre-fills email from URL query params
- Collects: Full Name, Phone, Password (same pattern as admin register -- no NRC required)
- On submit:
  1. Creates the Supabase auth user
  2. Calls `accept-supervisor-invitation` edge function with email + token
  3. Signs out and redirects to `/supervisor/signin` with a success message to check email for confirmation
- Sends a branded confirmation email via the existing `send-confirmation-email` edge function (using magiclink type)

### Route addition in `App.tsx`
Add `/supervisor/register` as a public route

---

## Rewritten: `src/admin/pages/Supervisors.tsx`

### Current Issues
- The Assignments tab loads ALL profiles and shows them as "supervisors" -- this is wrong
- No way to create/invite a new supervisor
- No separation from internal staff

### New Structure

The page will have a "Create Supervisor" button that opens a dialog to:
1. Enter supervisor email and full name
2. Select an organization (client company) to assign them to
3. Optionally enter a site name and address
4. On submit:
   - Creates a `supervisor_invitations` record
   - Calls `send-supervisor-invitation` edge function
   - Logs an audit entry

The **Assignments tab** will be rewritten to only show actual supervisors (users who have a record in `organization_supervisors`), not all profiles. Each row shows:
- Supervisor name and email
- Assigned organization
- Assigned sites (fetched from `supervisor_sites`)
- Status (active/inactive)
- Actions: Assign Site, Remove

A new **Invitations tab** will be added (similar to the InvitationsTab component in User Management) showing:
- All supervisor invitations with status badges (Pending, Accepted, Cancelled, Expired)
- Resend and cancel actions
- Stats cards (Pending, Accepted, Cancelled, Expired counts)

---

## Supervisor Sign-In Update

Update `SupervisorSignIn.tsx` to also check `organization_supervisors` properly -- the current implementation already does this correctly, so no changes needed there.

---

## Technical Details

### Files to Create
| File | Purpose |
|------|---------|
| `supabase/functions/send-supervisor-invitation/index.ts` | Branded invitation email via Resend |
| `supabase/functions/accept-supervisor-invitation/index.ts` | Token validation and role assignment |
| `src/pages/supervisor/SupervisorRegister.tsx` | Supervisor registration page |

### Files to Modify
| File | Changes |
|------|---------|
| `src/admin/pages/Supervisors.tsx` | Rewrite assignments tab, add invitations tab, add "Create Supervisor" dialog |
| `src/App.tsx` | Add `/supervisor/register` route |
| `supabase/config.toml` | Add new edge function configs |

### Migration
- Create `supervisor_invitations` table with RLS policies

### Invitation Email Branding
The email template will include:
- Green gradient header with logo
- "Africa Halal Integrity System" heading
- "Supervisor Portal Invitation" subtitle
- Role badge: "Field Supervisor"
- Site assignment details (organization name, site name if provided)
- Inviter attribution
- CTA: "Create Your Supervisor Account"
- Footer with: company name, website (africanhalaal.com), email (info@africanhalaal.com), phone, copyright

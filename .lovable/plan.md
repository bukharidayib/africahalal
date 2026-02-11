

# Implementation Plan

This plan covers four distinct features the user requested:

---

## 1. Fix Invitation Accept Link (404 Page)

**Problem**: The invitation email links to `/auth/sign-up?email=...&invited=true`, but no such route exists. The actual route is `/auth/signup` (no hyphen).

**Fix**:
- Update the Edge Function `send-invitation/index.ts` to link to `/auth/signup?email=...&invited=true` instead of `/auth/sign-up`
- Update `SignUp.tsx` to read the `email` and `invited` query params from the URL and pre-fill the email field
- After successful signup of an invited user, update the `admin_invitations` record to `accepted` status
- Redeploy the edge function

---

## 2. Application Status Email Notifications

**Problem**: Clients don't receive email updates when their application status changes.

**What we'll build**:
- A new Edge Function `send-status-notification` that sends professional HTML emails via Resend whenever an application status changes
- The function will look up the organization's contact email and send a status-specific email
- When status becomes `approved`, the email will include certificate details
- Update `ApplicationDetail.tsx` to call this edge function after a successful status update

**Supported statuses** (replacing the current enum references in the UI):
- Submitted, Under Review, Inspection Scheduled, Inspection Completed, Approved, Rejected, Suspended

**Database change**: Rename enum values `awaiting_inspection` to map to "Inspection Scheduled" and `inspection_complete` to "Inspection Completed" in the UI labels. Remove `draft`, `pending_decision`, and `withdrawn` from the status update dropdown (keeping them in the enum for backward compatibility).

---

## 3. Streamline Application Status Options

**What changes**:
- Update `STATUS_OPTIONS` in `ApplicationDetail.tsx` to only show: Submitted, Under Review, Inspection Scheduled, Inspection Completed, Approved, Rejected, Suspended
- Update `statusConfig` labels to use "Inspection Scheduled" and "Inspection Completed"
- Update `ApplicationTracker.tsx` to reflect the simplified 7-step flow

---

## 4. Supervisor Portal

**What we'll build**: A separate portal at `/supervisor/*` routes with its own layout, sidebar, and pages.

**Pages**:
- **Dashboard** (`/supervisor/dashboard`): Overview of assigned organization, pending tasks, recent activity
- **Support Tickets** (`/supervisor/support/tickets`): Create and view support tickets
- **New Ticket** (`/supervisor/support/tickets/new`): Ticket creation form
- **Ticket Detail** (`/supervisor/support/tickets/:id`): View ticket thread
- **Live Chat** (`/supervisor/support/chat`): Real-time chat with AHIS support team via Supabase Realtime

**Components**:
- `SupervisorLayout.tsx` - Layout wrapper with sidebar
- `SupervisorSidebar.tsx` - Navigation sidebar
- `SupervisorProtectedRoute.tsx` - Auth guard checking supervisor role via `organization_supervisors` table

**Auth flow**: Supervisors log in via the standard `/auth/signin` page and are redirected to `/supervisor/dashboard` based on their role in the `organization_supervisors` table.

---

## Technical Details

### Files to Create
- `supabase/functions/send-status-notification/index.ts` - Status change email edge function
- `src/components/layout/SupervisorLayout.tsx` - Supervisor portal layout
- `src/components/layout/SupervisorSidebar.tsx` - Supervisor navigation
- `src/components/auth/SupervisorProtectedRoute.tsx` - Auth guard
- `src/pages/supervisor/SupervisorDashboard.tsx` - Dashboard
- `src/pages/supervisor/SupervisorTickets.tsx` - Ticket list
- `src/pages/supervisor/SupervisorTicketNew.tsx` - Create ticket
- `src/pages/supervisor/SupervisorTicketDetail.tsx` - Ticket detail
- `src/pages/supervisor/SupervisorChat.tsx` - Live chat

### Files to Modify
- `supabase/functions/send-invitation/index.ts` - Fix signup URL
- `src/pages/auth/SignUp.tsx` - Handle invitation query params, mark invitation accepted
- `src/admin/pages/ApplicationDetail.tsx` - Add email notification on status change, update status options
- `src/App.tsx` - Add supervisor portal routes
- `src/components/ApplicationTracker.tsx` - Update to 7-step flow
- `supabase/config.toml` - Register new edge function

### Edge Function: send-status-notification
- Accepts: `application_id`, `new_status`, `application_number`, `organization_name`, `contact_email`
- Sends status-specific HTML email from `info@africanhalaal.com`
- For `approved` status: includes certificate number and congratulations message
- For `rejected`/`suspended`: includes reason and next steps guidance


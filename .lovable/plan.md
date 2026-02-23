
# Supervisor Portal -- Full Build Plan

## Summary
Build a complete Supervisor Portal with dedicated authentication, 7 operational modules, automated compliance scoring, NCR management, incident reporting, and admin-side tracking. The existing design system (green/gold institutional theme) is reused throughout.

---

## Database Schema (Single Migration)

### New Tables

**1. `supervisor_sites`** -- Links supervisors to specific client sites (more granular than org assignment)
- id (uuid PK), supervisor_id (uuid, references profiles.id), organization_id (uuid), site_name (text), site_address (text), assigned_at (timestamptz), assigned_by (uuid), is_active (boolean default true)
- RLS: Supervisors see own assignments; Admins full access

**2. `supervisor_reports`** -- Core reporting table (immutable after submission)
- id (uuid PK), supervisor_id (uuid NOT NULL), site_id (uuid references supervisor_sites), report_type (text: 'daily_checklist', 'weekly_summary', 'monthly_performance', 'incident'), report_date (date NOT NULL), status (text default 'draft': 'draft' | 'submitted'), submitted_at (timestamptz), compliance_score (numeric), risk_level (text: 'low' | 'medium' | 'high'), notes (text), created_at (timestamptz default now())
- Constraint: submitted reports cannot be updated (enforced via RLS -- UPDATE only where status = 'draft')
- RLS: Supervisors can INSERT own, SELECT own, UPDATE only own drafts; Admins SELECT all

**3. `supervisor_checklist_items`** -- Individual checklist line items per report
- id (uuid PK), report_id (uuid references supervisor_reports ON DELETE CASCADE), category (text: 'shariah_compliance', 'sop_adherence', 'staff_training', 'facility_hygiene', 'documentation'), item_description (text NOT NULL), response (text: 'compliant', 'minor_deviation', 'major_non_compliance', 'not_applicable'), observation_notes (text NOT NULL), observation_time (timestamptz NOT NULL), evidence_urls (text[] -- array of storage paths), sort_order (integer default 0), created_at (timestamptz default now())
- RLS: Same pattern as supervisor_reports (via report ownership join)

**4. `supervisor_compliance_scores`** -- Immutable score history (system-generated)
- id (uuid PK), site_id (uuid), report_id (uuid references supervisor_reports), score_date (date), overall_score (numeric NOT NULL), category_scores (jsonb -- {"shariah_compliance": 95, "sop_adherence": 88, ...}), risk_level (text), created_at (timestamptz default now())
- RLS: Supervisors SELECT own site scores; Admins SELECT all; No UPDATE/DELETE for anyone

**5. `supervisor_ncrs`** -- Non-Conformance Reports
- id (uuid PK), ncr_number (text UNIQUE NOT NULL), site_id (uuid), report_id (uuid, nullable), checklist_item_id (uuid, nullable), category (text), description (text NOT NULL), severity (text: 'minor' | 'major' | 'critical'), status (text default 'open': 'open' | 'corrective_action_submitted' | 'under_review' | 'closed' | 'escalated'), raised_by (uuid NOT NULL), raised_at (timestamptz default now()), due_date (date), corrective_action (text), resolved_at (timestamptz), resolved_by (uuid), created_at (timestamptz default now())
- RLS: Supervisors can INSERT own, SELECT own site NCRs, UPDATE own (for corrective action submission); Admins full access

**6. `supervisor_incidents`** -- Immediate incident reports (immutable after submission)
- id (uuid PK), incident_number (text UNIQUE NOT NULL), site_id (uuid), incident_type (text: 'halal_breach', 'cross_contamination', 'unauthorized_materials', 'supplier_deviation', 'other'), severity (text: 'low' | 'medium' | 'high' | 'critical'), description (text NOT NULL), immediate_action_taken (text), evidence_urls (text[]), reported_by (uuid NOT NULL), reported_at (timestamptz default now()), status (text default 'reported': 'reported' | 'under_investigation' | 'resolved'), created_at (timestamptz default now())
- RLS: Supervisors INSERT own, SELECT own; Admins full; No UPDATE/DELETE after submission

**7. `supervisor_observations`** -- Structured observational notes
- id (uuid PK), site_id (uuid), report_id (uuid, nullable), tag (text: 'operational' | 'training' | 'infrastructure' | 'documentation'), observation (text NOT NULL), recommendation (text), created_by (uuid NOT NULL), created_at (timestamptz default now())
- RLS: Supervisors INSERT/SELECT own; Admins SELECT all

**8. `supervisor_activity_log`** -- Full activity tracking for admin view
- id (uuid PK), supervisor_id (uuid NOT NULL), action (text NOT NULL), resource_type (text), resource_id (uuid), metadata (jsonb default '{}'), created_at (timestamptz default now())
- RLS: Admins SELECT only; INSERT via SECURITY DEFINER function

### Database Functions

- `generate_ncr_supervisor_number()` -- Auto-generates NCR-SUP-YYYY-XXXXX
- `generate_incident_number()` -- Auto-generates INC-YYYY-XXXXX  
- `calculate_compliance_score(report_id uuid)` -- Calculates score from checklist items: Compliant=100, Minor Deviation=50, Major Non-Compliance=0, N/A excluded. Returns overall + category breakdown. Determines risk level (>=80 Low/Green, 60-79 Medium/Amber, <60 High/Red)
- `log_supervisor_activity(...)` -- SECURITY DEFINER function to insert into supervisor_activity_log
- `submit_supervisor_report(report_id uuid)` -- Sets status to 'submitted', locks submitted_at, calls calculate_compliance_score, inserts into supervisor_compliance_scores, logs activity. Validates report_date is today (no backdating).

### Storage Bucket

- Create `supervisor-evidence` bucket (private), with RLS allowing supervisors to upload to their own folder (`supervisor_id/...`) and admins to read all.

---

## Authentication -- Supervisor Sign In & Forgot Password

### New Pages

**`src/pages/supervisor/SupervisorSignIn.tsx`**
- Reuses the exact same split-screen layout as `/auth/signin` (left form, right branded image)
- Header shows "African Halal Institute" with subtitle "Supervisor Portal" instead of "Client Portal"
- On successful login, checks `organization_supervisors` table to verify supervisor role
- If not a supervisor, shows error "Access denied. This portal is for authorized supervisors only."
- If verified, redirects to `/supervisor/dashboard`

**`src/pages/supervisor/SupervisorForgotPassword.tsx`**
- Same layout as `/auth/forgot-password`
- Calls the existing `send-password-reset` edge function (already uses Resend with branded template)
- The `redirect_to` param set to `window.location.origin + '/supervisor/reset-password'`

**`src/pages/supervisor/SupervisorResetPassword.tsx`**
- Same layout and logic as `/auth/reset-password` (password strength indicator, generate button)
- After success, redirects to `/supervisor/signin`

### Route Changes in `App.tsx`
- Add `/supervisor/signin`, `/supervisor/forgot-password`, `/supervisor/reset-password` as public routes
- All existing `/supervisor/*` routes remain wrapped in `SupervisorProtectedRoute`
- `SupervisorProtectedRoute` updated to redirect to `/supervisor/signin` instead of `/auth/signin`

---

## Supervisor Portal Modules (Frontend)

### Updated Sidebar (`SupervisorSidebar.tsx`)
New navigation items:
- Dashboard
- Reports (sub: Daily Checklist, Weekly Summary, Monthly Report)
- Incidents
- NCR Management
- Observations
- Support Tickets
- Live Chat

### Module 1 -- Dashboard (`SupervisorDashboard.tsx` rewrite)
Cards showing:
- Assigned site name and details
- Today's reporting status (Draft / Submitted / Not Started)
- Latest compliance score with color-coded risk badge (Green/Amber/Red)
- Overdue reports alert (reports not submitted for past days)
- Pending NCRs count
- Quick action button: "Start Daily Report"

### Module 2 -- Reporting (`SupervisorReports.tsx` + `SupervisorReportForm.tsx`)
**List View** (`/supervisor/reports`):
- Table of all reports with: Date, Type, Status (Draft/Submitted), Compliance Score, Risk Level
- Filter by type and date range
- "New Report" button

**Report Form** (`/supervisor/reports/new`):
- Select report type (Daily Checklist / Weekly Summary / Monthly Performance)
- Date auto-locked to today (cannot backdate)
- Renders checklist items grouped by 5 categories
- Each item: description, response dropdown (Compliant/Minor/Major/N/A), observation notes (required), evidence upload, observation time
- "Save as Draft" and "Submit Report" buttons
- On submit: calls `submit_supervisor_report()` RPC, score is auto-calculated, report becomes immutable

**Report Detail** (`/supervisor/reports/:id`):
- Read-only view of submitted reports with all checklist items, scores, and evidence

### Module 3 -- Checklist Engine (embedded in Report Form)
- 5 categories pre-loaded with configurable items
- Initial items seeded in the migration as a reference, but the form allows adding custom items per report
- Response types rendered as radio group with color coding

### Module 4 -- Compliance Scoring (Dashboard widget + Reports)
- Scores auto-calculated by DB function on report submission
- Dashboard shows latest score with trend sparkline
- Score breakdown by category shown on report detail view
- Historical scores shown as a chart on a dedicated "Compliance" tab in dashboard
- All scores immutable -- no edit UI exists

### Module 5 -- NCR Management (`SupervisorNCRs.tsx` + `SupervisorNCRDetail.tsx`)
**List** (`/supervisor/ncrs`):
- Table: NCR Number, Category, Severity, Status, Due Date
- Auto-created when a Major Non-Compliance is recorded in a checklist
- Manual creation also supported

**Detail** (`/supervisor/ncrs/:id`):
- Shows linked checklist item, site, description
- Workflow status timeline: Open -> Corrective Action Submitted -> Under Review -> Closed/Escalated
- Supervisor can submit corrective action text + evidence
- Status changes after submission are admin-only

### Module 6 -- Incident Reporting (`SupervisorIncidents.tsx` + `SupervisorIncidentForm.tsx`)
**List** (`/supervisor/incidents`):
- Table of all incidents with severity badges
- "Report Incident" button

**Form** (`/supervisor/incidents/new`):
- Incident type selection (Halal Breach, Cross-Contamination, etc.)
- Severity classification (Low/Medium/High/Critical)
- Description (required), immediate action taken
- Evidence upload (multiple files)
- On submit: immutable, triggers admin notification via `send-application-message` edge function (repurposed with type 'supervisor_incident')

### Module 7 -- Observations (`SupervisorObservations.tsx`)
**List + Form** (`/supervisor/observations`):
- Tag filter: Operational, Training, Infrastructure, Documentation
- Structured form: select tag, enter observation text, recommendation
- No free-text -- must select tag and fill structured fields
- Read-only after creation

---

## Admin Portal Tracking

### Enhanced Supervisors Page (`admin/pages/Supervisors.tsx`)
Add tabs:
- **Assignments** (existing functionality)
- **Reports** -- table of all supervisor reports across all sites, with filters
- **Compliance** -- compliance score trends per site, charts
- **Incidents** -- all incidents reported, with severity filtering
- **NCRs** -- all NCRs with status tracking
- **Activity Log** -- full activity feed from `supervisor_activity_log`

### Admin can:
- View all reports (read-only)
- View compliance scores and trends
- Update NCR status (Under Review, Closed, Escalated)
- View all incidents
- See supervisor attendance/frequency metrics

---

## Edge Function Updates

### `send-application-message` (existing)
- Add support for `message_type: 'supervisor_incident'` to notify admin compliance team when a critical incident is reported
- Email sent to `compliance@africanhalaal.com` with incident details

---

## File Changes Summary

| File | Action |
|------|--------|
| Database migration | CREATE 8 tables, 4 functions, 1 storage bucket, RLS policies |
| `src/pages/supervisor/SupervisorSignIn.tsx` | NEW -- Supervisor login page |
| `src/pages/supervisor/SupervisorForgotPassword.tsx` | NEW -- Forgot password page |
| `src/pages/supervisor/SupervisorResetPassword.tsx` | NEW -- Reset password page |
| `src/pages/supervisor/SupervisorDashboard.tsx` | REWRITE -- Full dashboard with metrics |
| `src/pages/supervisor/SupervisorReports.tsx` | NEW -- Report list view |
| `src/pages/supervisor/SupervisorReportForm.tsx` | NEW -- Report creation with checklist |
| `src/pages/supervisor/SupervisorReportDetail.tsx` | NEW -- Read-only report view |
| `src/pages/supervisor/SupervisorNCRs.tsx` | NEW -- NCR list |
| `src/pages/supervisor/SupervisorNCRDetail.tsx` | NEW -- NCR detail with workflow |
| `src/pages/supervisor/SupervisorIncidents.tsx` | NEW -- Incident list |
| `src/pages/supervisor/SupervisorIncidentForm.tsx` | NEW -- Incident reporting form |
| `src/pages/supervisor/SupervisorObservations.tsx` | NEW -- Observations list + form |
| `src/components/layout/SupervisorSidebar.tsx` | UPDATE -- Add new nav items |
| `src/components/auth/SupervisorProtectedRoute.tsx` | UPDATE -- Redirect to /supervisor/signin |
| `src/admin/pages/Supervisors.tsx` | REWRITE -- Add tabs for Reports, Compliance, Incidents, NCRs, Activity |
| `src/App.tsx` | UPDATE -- Add all new supervisor routes |
| `supabase/functions/send-application-message/index.ts` | UPDATE -- Add supervisor_incident type |

---

## Governance & Security Enforcement

- Reports immutable after submission via RLS (UPDATE policy requires `status = 'draft'`)
- Evidence files locked in private bucket with supervisor-scoped upload paths
- All actions logged via `log_supervisor_activity()` SECURITY DEFINER function
- Compliance scores calculated server-side only (no client-side editing)
- Backdating prevented by `submit_supervisor_report()` function validating `report_date = CURRENT_DATE`
- Supervisor cannot view certification decisions (no RLS policy grants access to `certification_decisions` or `approval_requests`)
- Full activity logging for admin audit trail

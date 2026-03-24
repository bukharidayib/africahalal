

# Full Inspector & Supervisor Portal Build -- PRD Implementation Plan

## Gap Analysis

### Already Built (Supervisor Portal)
- Auth (SignIn, Register, ForgotPassword, ResetPassword)
- Dashboard, Reports (daily/weekly/monthly), Incidents, NCRs, Observations
- Ingredient Collection module, Support Tickets, Live Chat
- Admin: Inspection scheduling, Inspector management, Supervisor management, Ingredient Tracker

### Missing from PRD

| # | Feature | Priority |
|---|---------|----------|
| 1 | **Inspector Portal** (entire new portal with auth, dashboard, inspection workflow) | Critical |
| 2 | **Inspector Structured Checklist** (Hygiene, Ingredients, Storage, Slaughter, Staff) | Critical |
| 3 | **Inspector Evidence Upload** (photos, videos, documents per checklist item) | Critical |
| 4 | **Supervisor views assigned inspections** + read-only access to inspector reports | High |
| 5 | **Inspection Manager Report Review** (approve/reject workflow, side-by-side view) | High |
| 6 | **Supervisor assignment to inspections** (currently only inspectors are assigned) | High |
| 7 | **Notification emails** (inspection assigned, report submitted, approved/rejected) | Medium |
| 8 | **PDF auto-generation** for final inspection reports | Medium |

---

## Implementation Plan (Step by Step)

### Phase 1: Database Schema Updates (1 migration)

**Modify `inspections` table:**
- Add `supervisor_id` column (uuid, nullable, FK -> inspectors table or organization_supervisors)
- Add `notes` text column
- Add `started_at` timestamptz column (timestamp when inspector clicks "Start")

**New table: `inspection_checklist_items`**
```text
id (uuid PK)
inspection_id (uuid FK -> inspections, NOT NULL)
category (text: 'hygiene_compliance', 'ingredient_sourcing', 'storage_processes', 'slaughter_compliance', 'staff_practices')
item_description (text NOT NULL)
response (text: 'compliant', 'non_compliant', 'partial', 'not_applicable')
notes (text)
evidence_urls (text[])
sort_order (integer DEFAULT 0)
created_at (timestamptz DEFAULT now())
```

**New table: `inspection_evidence`**
```text
id (uuid PK)
inspection_id (uuid FK -> inspections, NOT NULL)
checklist_item_id (uuid FK -> inspection_checklist_items, nullable)
file_url (text NOT NULL)
file_type (text: 'photo', 'video', 'document')
caption (text)
uploaded_by (uuid NOT NULL)
created_at (timestamptz DEFAULT now())
```

**Modify `inspection_reports` table:**
- Add `compliance_score` (numeric)
- Add `status` (text: 'draft', 'submitted', 'approved', 'rejected', 'conditional')
- Add `reviewed_by` (uuid)
- Add `reviewed_at` (timestamptz)
- Add `review_notes` (text)

**New table: `inspection_notifications`**
```text
id (uuid PK)
user_id (uuid NOT NULL)
inspection_id (uuid FK -> inspections)
type (text: 'assigned', 'reminder', 'submitted', 'approved', 'rejected')
title (text NOT NULL)
message (text)
is_read (boolean DEFAULT false)
created_at (timestamptz DEFAULT now())
```

**RLS Policies:**
- Inspectors: SELECT own assigned inspections, INSERT/UPDATE own checklist items and evidence, INSERT/UPDATE own reports (only drafts)
- Supervisors: SELECT inspections where they are assigned supervisor, SELECT inspection reports (read-only)
- Admins: Full access on all tables

### Phase 2: Inspector Portal -- Auth & Layout

**New files:**
| File | Purpose |
|------|---------|
| `src/components/auth/InspectorProtectedRoute.tsx` | Route guard checking `inspectors` table |
| `src/components/layout/InspectorLayout.tsx` | Layout wrapper with sidebar |
| `src/components/layout/InspectorSidebar.tsx` | Navigation sidebar (Dashboard, Inspections, Reports, Notifications) |
| `src/pages/inspector/InspectorSignIn.tsx` | Dedicated sign-in page |
| `src/pages/inspector/InspectorForgotPassword.tsx` | Password reset request |
| `src/pages/inspector/InspectorResetPassword.tsx` | Password reset page |
| `src/pages/inspector/InspectorRegister.tsx` | Registration via invitation token |

**Inspector Sidebar Nav:**
- Dashboard
- My Inspections
- Reports
- Notifications
- Support / Live Chat
- Log Out

### Phase 3: Inspector Dashboard

**File:** `src/pages/inspector/InspectorDashboard.tsx`

- Stats cards: Pending, In Progress, Completed, Total
- Upcoming inspections list (next 7 days)
- Recent activity feed
- Quick-start button for next scheduled inspection
- Fetches from `inspections` table where `inspector_id` matches current user's inspector record

### Phase 4: Inspector Inspection Workflow

**File:** `src/pages/inspector/InspectorInspections.tsx` (List view)
- Table of all assigned inspections with status badges (Pending, In Progress, Submitted)
- Filter by status, date range
- Click to open inspection detail

**File:** `src/pages/inspector/InspectorInspectionDetail.tsx` (Detail + Checklist)
- Business/organization details at top
- "Start Inspection" button (logs `started_at` timestamp, changes status to `in_progress`)
- Step-by-step structured checklist form with 5 categories:
  1. Hygiene Compliance
  2. Ingredient Sourcing
  3. Storage Processes
  4. Slaughter Compliance (conditional -- show only if applicable)
  5. Staff Practices
- Each item: response dropdown (Compliant/Non-Compliant/Partial/N-A), notes textarea, evidence upload
- Evidence upload to `supervisor-evidence` bucket (or new `inspection-evidence` bucket)
- Progress indicator showing completion percentage
- Save as draft / Submit report
- Validation: all mandatory fields completed, minimum 1 photo per category

**File:** `src/pages/inspector/InspectorReportView.tsx` (Read-only submitted report)
- Shows submitted report with all checklist responses, evidence, compliance score
- Status badge (Submitted, Approved, Rejected, Conditional)
- Review notes from manager (if any)

### Phase 5: Supervisor -- View Assigned Inspections

**Updates to existing files:**

| File | Change |
|------|--------|
| `SupervisorSidebar.tsx` | Add "Inspections" nav item (Eye icon) |
| New: `src/pages/supervisor/SupervisorInspections.tsx` | List of inspections where supervisor is assigned |
| New: `src/pages/supervisor/SupervisorInspectionView.tsx` | Read-only view of inspector's submitted report + own supervisory notes |

The supervisor can:
- See all inspections they are assigned to
- View inspector's submitted checklist and evidence (read-only)
- Submit their own independent supervisory report (already built via existing Reports module, but now linked to the inspection)

### Phase 6: Admin -- Inspection Manager Enhancements

**Updates to `src/admin/pages/Inspections.tsx`:**
- Add supervisor assignment dropdown to the "Schedule Inspection" dialog
- Add "View Report" action button for completed inspections

**New file: `src/admin/pages/InspectionDetail.tsx`**
- Full inspection detail view with tabs:
  - **Overview**: Business info, scheduled date, inspector, supervisor, status timeline
  - **Inspector Report**: Checklist responses, evidence gallery, compliance score
  - **Supervisor Report**: Independent supervisory report (if submitted)
  - **Evidence**: Combined media gallery from both inspector and supervisor
- Action buttons:
  - **Approve** -- sets report status to 'approved', triggers notification
  - **Reject** -- sets report status to 'rejected' with reason, triggers notification
  - **Conditional** -- sets status to 'conditional' with conditions noted
- Audit logged via `log_audit()`

**New route:** `/admin/inspections/:id` -> `InspectionDetail`

### Phase 7: Notification System

**New edge function: `send-inspection-notification`**
- Sends branded email via Resend for:
  - Inspection assigned (to inspector + supervisor)
  - Report submitted (to inspection manager/admins)
  - Report approved/rejected (to inspector)
- Also inserts record into `inspection_notifications` table for in-app notifications

**Inspector notification bell:**
- Component in `InspectorLayout` header showing unread count
- Dropdown listing recent notifications
- Mark as read on click

### Phase 8: PDF Report Generation

**New edge function: `generate-inspection-report-pdf`**
- Generates a formatted PDF containing:
  - Business details, inspection date, inspector/supervisor names
  - Checklist results per category with compliance scores
  - Evidence thumbnails
  - Overall assessment, recommendations
  - Compliance status (Approved/Conditional/Rejected)
  - Digital signatures (inspector attestation timestamp)
- Returns PDF URL stored in `inspection_reports`

### Phase 9: Route Registration

**Update `src/App.tsx`:**
```text
/inspector/signin
/inspector/register
/inspector/forgot-password
/inspector/reset-password
/inspector/dashboard
/inspector/inspections
/inspector/inspections/:id
/inspector/reports/:id
/supervisor/inspections (new)
/supervisor/inspections/:id (new)
/admin/inspections/:id (new detail page)
```

---

## File Summary

### New Files (17)
| File | Purpose |
|------|---------|
| `src/components/auth/InspectorProtectedRoute.tsx` | Auth guard for inspector routes |
| `src/components/layout/InspectorLayout.tsx` | Inspector portal layout |
| `src/components/layout/InspectorSidebar.tsx` | Inspector sidebar navigation |
| `src/pages/inspector/InspectorSignIn.tsx` | Inspector sign-in |
| `src/pages/inspector/InspectorForgotPassword.tsx` | Forgot password |
| `src/pages/inspector/InspectorResetPassword.tsx` | Reset password |
| `src/pages/inspector/InspectorRegister.tsx` | Register via invitation |
| `src/pages/inspector/InspectorDashboard.tsx` | Dashboard with stats + upcoming |
| `src/pages/inspector/InspectorInspections.tsx` | Inspection list view |
| `src/pages/inspector/InspectorInspectionDetail.tsx` | Checklist workflow + evidence upload |
| `src/pages/inspector/InspectorReportView.tsx` | Read-only submitted report |
| `src/pages/supervisor/SupervisorInspections.tsx` | Supervisor's assigned inspections |
| `src/pages/supervisor/SupervisorInspectionView.tsx` | Read-only inspector report view |
| `src/admin/pages/InspectionDetail.tsx` | Admin review + approve/reject |
| `supabase/functions/send-inspection-notification/index.ts` | Email notifications |
| `supabase/functions/generate-inspection-report-pdf/index.ts` | PDF generation |
| 1 migration file | Schema changes |

### Modified Files (5)
| File | Change |
|------|--------|
| `src/App.tsx` | Add all inspector + new supervisor/admin routes |
| `src/admin/pages/Inspections.tsx` | Add supervisor assignment, report view link |
| `src/components/layout/SupervisorSidebar.tsx` | Add "Inspections" nav item |
| `src/admin/components/layout/AdminSidebar.tsx` | No change needed (already has Inspections) |
| `supabase/config.toml` | Add new edge function configs |

---

## Implementation Order

Due to the size of this build, it should be implemented in batches:

1. **Batch 1**: Database migration + Inspector auth + layout + sidebar
2. **Batch 2**: Inspector dashboard + inspections list
3. **Batch 3**: Inspector inspection detail (checklist workflow + evidence upload)
4. **Batch 4**: Supervisor inspection views + Admin inspection detail (approve/reject)
5. **Batch 5**: Notification system + PDF generation
6. **Batch 6**: Route registration + final integration testing


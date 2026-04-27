# Inspector Portal Fixes

## Findings

1. **Incident Reports list**: The DB does have records (4 rows for inspector `bukhariproduction@gmail.com`, 0 for `inspector@africanhalaal.com`). Both RLS and the query are correct. The empty state shown is likely because the currently-logged-in inspector has no incidents. We will tighten the query to explicitly filter `reported_by = auth.uid()` so admins testing with the inspector role still see the right scope, and double-check that newly created incidents render immediately.

2. **New Report — "Could not find the table public.inspector_reports"**: That table genuinely does not exist. `InspectorReportForm.tsx` writes to `inspector_reports` and `Inspector_checklist_items`, then calls RPC `submit_Inspector_report`. None exist. We must create them.

3. **Notifications module**: `inspection_notifications` table is empty, and the user wants the page to actually list inspections assigned to the inspector (not generic notifications). We will rewrite `InspectorNotifications.tsx` to query `inspections` filtered by the inspector's id with org/application info.

4. **My Inspections**: The query in `InspectorInspections.tsx` is already correct (joins inspections → applications → organizations, filtered by `inspector_id`). DB shows 3 inspections assigned to `inspector@africanhalaal.com`. We will verify on render; if data still appears empty it is a client-side filter issue we will trace and fix.

## Plan

### A. Database migration

Create the missing inspector report tables, RPC, and storage policies:

- `inspector_reports` — mirrors `supervisor_reports` (inspector_id, organization_id (FK to supervisor_sites or organizations as used in code), report_type, report_date, status, notes, report_content jsonb, compliance_score, risk_level, submitted_at, created_at, updated_at).
- `Inspector_checklist_items` — mirrors `supervisor_checklist_items` (report_id, category, item_description, response, observation_notes, observation_time, evidence_urls, sort_order).
- RPC `submit_Inspector_report(_report_id uuid)` — same logic as `submit_supervisor_report` but writes to inspector tables and uses `log_Inspector_activity`.
- Enable RLS:
  - Inspectors can insert/select/update own reports (`inspector_id = auth.uid()`).
  - Admins can view all (via `is_admin_user`).
  - Checklist items follow the parent report's RLS via subquery.

### B. Frontend changes

1. **`src/pages/inspector/InspectorIncidents.tsx`**
   - Add `.eq("reported_by", session.user.id)` for explicit per-user scope.
   - Keep `created_at` ordering.

2. **`src/pages/inspector/InspectorNotifications.tsx`** — rewrite to show **assigned inspections**:
   - Query `inspections` joined with `certification_applications → organizations` filtered by the inspector's id.
   - Show org name, application number, scheduled date, status badge, assignment time.
   - Click row → navigate to `/inspector/inspections/:id`.
   - Keep the existing layout/header but rename empty-state copy to "No assigned inspections yet".

3. **`src/pages/inspector/InspectorInspections.tsx`** — verify; no schema change needed. Add safe fallback: if `inspector` lookup fails, show a clear "Inspector profile not found" message instead of silently returning an empty list.

### C. Verification

After migration and code changes:
- Sign in as `inspector@africanhalaal.com` and confirm: My Inspections lists 3 records; Notifications lists the same 3; Incidents shows correct scoped list (likely empty for this user); New Report can be saved as draft and submitted without the missing-table error.

## Technical notes

- The new `inspector_reports.organization_id` column should reference `supervisor_sites.id` (the form already resolves a supervisor_sites row before insert) to keep parity with the existing supervisor flow and avoid changing the report form logic.
- Storage bucket `Inspector-evidence` already exists with policies, so uploads continue to work.
- RPC will be created with `SECURITY DEFINER`, `search_path = public`, matching the existing supervisor RPC pattern.

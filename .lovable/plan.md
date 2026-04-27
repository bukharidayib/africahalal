## Goal

Make `non_conformance_notices` (NCN) the **single source of truth** for all NCRs across the platform. Supervisor and Inspector portals will read from this same table (scoped by who raised/owns the related inspection/report) and respond via `corrective_actions` — exactly like the Client portal already does.

The orphaned `supervisor_ncrs` / `inspector_ncrs` tables will be deprecated.

---

## What changes

### 1. Database (one migration)

- Add two nullable columns to `non_conformance_notices` to allow NCNs raised from supervisor/inspector field reports (not only from formal inspections):
  - `report_id uuid` (links to supervisor/inspector report)
  - `raised_by uuid` (the supervisor or inspector who raised it; distinct from `issued_by` which is the admin officer)
  - `source text` default `'admin'` — one of `admin | supervisor | inspector` so each portal can filter cleanly
- Add RLS policies on `non_conformance_notices`:
  - Supervisors can `SELECT` rows where `raised_by = auth.uid()` OR linked to inspections they supervise
  - Inspectors can `SELECT` rows where `raised_by = auth.uid()` OR linked to inspections they performed
  - Both can `INSERT` rows where `raised_by = auth.uid()` and `source` matches their role
- Add RLS on `corrective_actions` so supervisors/inspectors who raised the NCN can view responses to it.
- Leave `supervisor_ncrs` / `inspector_ncrs` tables in place (empty, no code referencing them after this change) — safe to drop later.

### 2. Supervisor portal

- `SupervisorNCRs.tsx` — fetch from `non_conformance_notices` filtered by `raised_by = currentUser` OR by inspections supervised. Display `ncn_number`, category, severity, status, due date.
- `SupervisorNCRDetail.tsx` — read NCN + its `corrective_actions`. Status timeline driven by NCN `status` + corrective action state. Supervisor cannot submit corrective actions (that's the client's job) — instead supervisor can **view client response and add review notes**.
- Add **"Raise NCR"** button on supervisor inspection report pages so supervisors can create new NCNs from a report (writes to `non_conformance_notices` with `source='supervisor'`, `raised_by=auth.uid()`, `report_id=...`).

### 3. Inspector portal

- `InspectorNCRs.tsx` — fetch from `non_conformance_notices` filtered by inspections the inspector performed OR raised by them.
- `InspectorNCRDetail.tsx` — read-only view of NCN + corrective action response + admin review status. Remove the inspector-submits-corrective-action UI (incorrect role).
- Add **"Raise NCR"** action on inspector report detail page (`source='inspector'`).

### 4. Admin Enforcement

- Already reads `non_conformance_notices` — no fetch changes needed.
- Add a **Source** column/badge in the NCN table (`Admin / Supervisor / Inspector`) so admins can see field-raised NCNs.
- Field-raised NCNs (`source != 'admin'`) get a **"Review & Issue"** action so an officer can validate and formally promote them (sets `issued_by`, sends email to client via existing `send-ncn-notification` edge function).

### 5. Client portal

- No changes — `NCRManagement.tsx` already reads `non_conformance_notices` and submits `corrective_actions`. Will automatically see field-raised NCNs once an admin issues them.

---

## Technical notes

- Severity enum stays as-is on `non_conformance_notices`.
- NCN number generator: keep existing format `NCR-YYYY-XXXXX`. Add `NCR-SUP-YYYY-XXXXX` for supervisor-raised and `NCR-INS-YYYY-XXXXX` for inspector-raised (matches memory rule on entity formats).
- Client UUID generation via `crypto.randomUUID()` on all inserts (per memory rule).
- All new RLS uses strict equality joins; no `OR true`.
- No schema changes to `corrective_actions` itself — already has all needed columns.

---

## Out of scope

- Dropping `supervisor_ncrs` / `inspector_ncrs` tables (left for a later cleanup pass once we're sure nothing breaks).
- Bulk-migrating existing rows (both legacy tables are empty — nothing to migrate).

---

## Files to change

- `supabase/migrations/<new>.sql` — schema + RLS
- `src/pages/supervisor/SupervisorNCRs.tsx`
- `src/pages/supervisor/SupervisorNCRDetail.tsx`
- `src/pages/supervisor/SupervisorReportDetail.tsx` — add "Raise NCR" button
- `src/pages/inspector/InspectorNCRs.tsx`
- `src/pages/inspector/InspectorNCRDetail.tsx`
- `src/pages/inspector/InspectorReportDetail.tsx` — add "Raise NCR" button
- `src/admin/pages/Enforcement.tsx` — add Source column + Review action for field-raised

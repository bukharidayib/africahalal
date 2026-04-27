# Fix Inspector Manager modules + NCR visibility for field staff

## What's actually wrong (investigation results)

### 1. Inspector Manager → Supervisors
The query is correct: it walks `inspectors.is_manager` → `inspector_organizations` (manager's businesses) → `organization_supervisors` → `profiles`. Database has data: manager `Ahmed Fraah` has 2 businesses, one of which has supervisor `49140af5...`. So this page **should already render the supervisor**. If you still see "No supervisors", the most likely cause is that the manager's `inspectors.user_id` doesn't match the currently signed-in user, or the supervisor's profile row is missing. We'll add a small diagnostic + fall back to showing supervisors of the manager's organizations regardless of whether `profiles` has a row, by joining through `auth.users` email via a backfill profile.

### 2. Inspector Manager → All Inspections (THE REAL BUG)
`InspectorManagerInspections.tsx` builds this filter:
```
.or("inspector_id.in.(...),certification_applications.organization_id.in.(...)")
```
PostgREST does **not** support nested-relation columns inside a top-level `.or()`. The clause silently matches nothing → page shows "No inspections found". 

**Fix**: do two simple `.in()` queries (one by `inspector_id`, one by `application_id` resolved from `organization_id`) and merge the results client-side. Also include the manager's own inspections and inspections supervised by org-linked supervisors so the manager sees the full picture for their assigned businesses.

### 3. NCR module empty in Supervisor & Inspector portals
Database has 6 NCRs — all `source='admin'`, `raised_by=NULL`, `inspection_id=NULL`. The RLS policies we added in the last migration only allow field staff to see NCRs they raised themselves OR NCRs tied to their own inspection. **Admin-issued NCRs are completely invisible to field staff**, even when the NCR is for an organization they supervise / inspect.

This is the missing link. Admins issue NCRs against an `application_id` (which belongs to an `organization_id`). Supervisors are linked to organizations via `organization_supervisors`; inspectors via `inspector_organizations`. We just need RLS that says: *"a supervisor/inspector can SEE an NCR whose application's organization is one of theirs"* — and the same for `corrective_actions` so they can review the client's response.

No new admin module is needed — Admin Enforcement already issues NCRs. We're just opening the read path so field staff can monitor compliance for their assigned businesses.

---

## Plan

### A. Database migration — RLS only (no schema changes)

Add SELECT policies on `non_conformance_notices`:
- **Supervisors view org NCRs**: NCR's `application_id` belongs to an organization in `organization_supervisors` where `supervisor_id = auth.uid()`.
- **Inspectors view org NCRs**: NCR's `application_id` belongs to an organization in `inspector_organizations` where the inspector record's `user_id = auth.uid()`. Manager inspectors also see NCRs for organizations of inspectors they manage (via `inspector_manager_inspectors`).

Add matching SELECT policies on `corrective_actions` so the same scope can read client responses.

(Existing "raised_by = auth.uid()" / "linked to my inspection" policies stay — these new ones are additive.)

### B. Frontend — Inspector Manager pages

`src/pages/inspector/InspectorManagerInspections.tsx`
- Replace the broken `.or(...)` with two parallel queries:
  1. `inspections` where `inspector_id IN (managedInspectorIds + me.id)`
  2. `inspections` where `application_id IN (apps for orgIds)` — resolve apps first via `certification_applications.select('id').in('organization_id', orgIds)`
- Merge + dedupe by `id`, sort by `created_at desc`.
- Show empty state only if both result sets are empty.

`src/pages/inspector/InspectorManagerSupervisors.tsx`
- Keep current logic (it's correct). Add a small "scope" line: *"Supervisors assigned to your N businesses"*, and show the org name(s) each supervisor is linked to so the manager sees coverage at a glance.

### C. Frontend — NCR pages (no logic change, just verify)

`SupervisorNCRs.tsx` and `InspectorNCRs.tsx` already query `non_conformance_notices` with no client-side filter — they rely on RLS. Once policies in (A) land, admin-issued NCRs for assigned organizations will appear automatically. The existing `Source` badge already differentiates admin vs field-raised.

`SupervisorNCRDetail.tsx` / `InspectorNCRDetail.tsx` will then show the NCR + any `corrective_actions` submitted by the client, so field staff can monitor remediation without admin intervention.

### D. Optional polish (admin side)
In `src/admin/pages/Enforcement.tsx`, add a small "Visible to" hint on each NCR row showing the count of supervisors/inspectors who will see it (computed from org assignments). Helps admins understand who's in the loop.

---

## Files changed
- New SQL migration: RLS additions for `non_conformance_notices` + `corrective_actions`
- `src/pages/inspector/InspectorManagerInspections.tsx` — fix query
- `src/pages/inspector/InspectorManagerSupervisors.tsx` — add scope/coverage info
- `src/admin/pages/Enforcement.tsx` — (optional) "Visible to" hint

## What stays the same
- No new admin module needed — existing Enforcement page is the source of truth
- No schema changes (last migration already added `source`/`raised_by`/`report_id`)
- Field-raised NCR flow (RaiseNCRDialog) is unchanged

Approve to proceed.
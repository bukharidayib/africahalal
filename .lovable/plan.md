# Reports, Incidents & NCR/Corrective Action Fixes

## Root-cause analysis

### 1. Admin Reports — no "Monthly Performance" tab
`AdminReports.tsx` already loads `supervisor_reports` (including `report_type='monthly_performance'`) and exposes a type filter, but there is no dedicated tab to view them as a KPI-style list. The data is there; only the UI tab is missing.

### 2. Supervisor → Report Incident fails / broken
In `SupervisorIncidentForm.tsx` the form stores the user's **organization_id** in `selectedSite`, then inserts it directly as `site_id` on `supervisor_incidents`. But `supervisor_incidents.site_id` has a **foreign key to `supervisor_sites(id)`**, not to `organizations`. Result: FK violation `supervsior_incidents_site_id_fkey` (and silent insert failure for any first-time submission).

Same root cause we already fixed for the Ingredient Collection form. The fix is to call the existing `ensure_supervisor_site` RPC to resolve/create the `supervisor_sites` row and use the returned `site_id`.

The listing screen `SupervisorIncidents.tsx` is fine but should refresh after submission and show the company name.

### 3. Admin Enforcement → "Corrective Actions" tab empty
Database currently has **0 rows in `corrective_actions`** because clients have no way to submit them. RLS on `corrective_actions` only allows admins to manage; clients can SELECT their own but cannot INSERT. There is also no client UI to respond to NCNs. Once we ship #4, this tab will start filling in.

### 4. Client → Compliance Center / NCR Management not fetching
- `non_conformance_notices` has **no SELECT policy for clients**, so clients can never see NCNs raised against them — they can only see Corrective Actions they themselves are linked to (which they cannot create today).
- The Compliance Center page lists CARs but they are always empty.
- There is no client "NCR Management" module to list/respond to NCNs.

## Plan

### A. Database migration
1. **RLS — let clients view their own NCNs**
   ```
   CREATE POLICY "Clients can view own organization NCNs"
   ON public.non_conformance_notices FOR SELECT TO authenticated
   USING (
     application_id IN (
       SELECT ca.id FROM certification_applications ca
       JOIN profiles p ON p.organization_id = ca.organization_id
       WHERE p.id = auth.uid()
     )
   );
   ```
2. **RLS — let clients insert/view corrective actions for their own NCNs**
   ```
   CREATE POLICY "Clients can insert own corrective actions"
   ON public.corrective_actions FOR INSERT TO authenticated
   WITH CHECK (
     submitted_by = auth.uid()
     AND ncn_id IN (
       SELECT n.id FROM non_conformance_notices n
       JOIN certification_applications ca ON ca.id = n.application_id
       JOIN profiles p ON p.organization_id = ca.organization_id
       WHERE p.id = auth.uid()
     )
   );
   ```
   (SELECT policy for clients already exists.)
3. **Storage** — ensure a `client-evidence` bucket exists (or reuse an existing one) for corrective-action evidence uploads, with a policy letting authenticated users upload to their own user-id folder.

### B. Supervisor portal — fix Incident submission
Edit `src/pages/supervisor/SupervisorIncidentForm.tsx`:
- Replace direct `site_id: selectedSite` insert with `supabase.rpc('ensure_supervisor_site', { _organization_id: selectedSite, _site_name: orgName })` (same pattern used in `SupervisorIngredientForm`).
- Use the returned uuid as `site_id`.
- Keep current org-vs-site selector logic.
- Surface clear toasts on success/error.

Also tweak `SupervisorIncidents.tsx` to display the company name (resolve via `supervisor_sites` → `organizations`) so supervisors see context.

### C. Admin Reports — Monthly Performance tab
Edit `src/admin/pages/AdminReports.tsx`:
- Add a `monthly` derived list = supervisor reports where `type === 'monthly_performance'`.
- Add a new `<TabsTrigger value="monthly">Monthly Performance ({n})</TabsTrigger>`.
- Add a `<TabsContent value="monthly">` rendering the existing `ReportTable` plus a small KPI strip pulled from `report_content.kpis` of the latest report (compliance %, NCRs, inspections).
- Keep the existing "Supervisor Reports" tab (covers all supervisor types).

Detail page reuse: clicking a monthly row continues to navigate to `/admin/supervisor-reports/{id}` (existing `AdminSupervisorReportDetail`).

### D. Client portal — NCR Management module + Corrective Action submission
1. **New route** `/client/ncrs` → `src/pages/client/NCRManagement.tsx`:
   - Lists NCNs for the client's organization (number, category, severity, status, due date, days remaining).
   - Click row → opens detail dialog with description and a "Submit Corrective Action" form (textarea response + multiple evidence file upload to storage, then INSERT into `corrective_actions` with `submitted_by = auth.uid()`).
   - After submission, automatically transition the NCN status to `corrective_action_submitted` (admin will review in Enforcement).
2. **Sidebar entry** in `ClientSidebar` under Compliance: "NCR Management".
3. **Compliance Center fix**: leave existing CAR list (it will populate once #1 is in place); also add a small CTA card linking to the new NCR module when the org has open NCNs.

### E. Verification path
1. Admin issues an NCN from `Enforcement → Issue NCN`.
2. Client signs in, navigates to NCR Management, sees the NCN, submits a corrective action with evidence.
3. Admin returns to `Enforcement → Corrective Actions` tab — the entry now appears with Accept/Reject controls.
4. Supervisor submits an incident — succeeds without FK error and shows in `Admin → Reports → Incidents`.
5. Supervisor submits Monthly Performance via Performance module — appears in `Admin → Reports → Monthly Performance` tab.

## Files affected
- `supabase/migrations/<new>.sql` — RLS policies for NCN and corrective action client access.
- `src/pages/supervisor/SupervisorIncidentForm.tsx` — use `ensure_supervisor_site` RPC.
- `src/pages/supervisor/SupervisorIncidents.tsx` — show company name + refresh.
- `src/admin/pages/AdminReports.tsx` — add Monthly Performance tab + KPI strip.
- `src/pages/client/NCRManagement.tsx` — new page (list + submit CA dialog).
- `src/pages/client/ComplianceCenter.tsx` — link to NCR module.
- `src/components/layout/ClientSidebar.tsx` — add "NCR Management" entry.
- `src/App.tsx` — register `/client/ncrs` route.

## Notes / decisions
- All inserts use `crypto.randomUUID()` client-side per project rule.
- No changes to admin roles. Admin still owns final accept/reject in Enforcement.
- Currency, Clerk auth, dual-control rules untouched.

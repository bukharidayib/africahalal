## Goals

1. New **admin "Reports"** module that surfaces all reports & incidents from the Inspector and Supervisor portals (Daily Checklist, Weekly Summary, Monthly Performance, Incidents) with filtering, drill-down detail, and a professional, "giant" listing UI.
2. Add a **"Reports" tab** inside the admin Business detail page showing every report/incident tied to that business.
3. In the **Inspector portal**: allow draft reports to be re-opened, edited, and submitted (currently the row click goes to a read-only detail).
4. **Remove the Observations module** entirely from both Inspector and Supervisor portals (page, route, sidebar entry, references).

No DB schema changes — `inspector_reports`, `supervisor_reports`, `inspector_incidents`, `supervisor_incidents` already exist with all the data we need. Admin RLS policies on these tables already grant `is_admin_user(auth.uid())` SELECT access.

---

## 1. Admin Reports module

**New files**
- `src/admin/pages/AdminReports.tsx` — main hub page
- `src/admin/pages/AdminInspectorReportDetail.tsx` — detail view for an inspector report (mirrors `InspectorReportDetail` but inside `AdminLayout`, read-only)
- `src/admin/pages/AdminIncidentDetail.tsx` — detail view for an incident (inspector or supervisor) with admin-only actions (update status, add review notes)

**Routing (`src/App.tsx`)**
- Add `/admin/reports` → `AdminReports`
- Add `/admin/reports/inspector/:id` → `AdminInspectorReportDetail`
- Existing `/admin/supervisor-reports/:id` is reused for supervisor report detail
- Add `/admin/incidents/:source/:id` (source = `inspector` | `supervisor`) → `AdminIncidentDetail`
- All gated by `PermissionGate` (reuse `canViewSupervisors` or add a sensible existing permission key).

**Sidebar (`src/admin/components/layout/AdminSidebar.tsx`)**
- Insert a new `Reports` entry (icon `FileText`) above `Inspectors`.

**`AdminReports` page features**
- Header KPIs: total reports, submitted today, open incidents, average compliance score (last 30 days).
- Tabs: `All`, `Inspector Reports`, `Supervisor Reports`, `Incidents`.
- Each tab uses a unified table with columns: Date, Source (Inspector/Supervisor), Author, Organization, Type, Status, Score, Risk, Actions (View).
- Filters: report type (daily / weekly / monthly / incident), status (draft/submitted/open/closed), date range, organization (`OrgCombobox`), risk level, free-text search (organization or author).
- Data fetching: parallel queries to `inspector_reports`, `supervisor_reports`, `inspector_incidents`, `supervisor_incidents`. Resolve author name via `profiles` and `inspectors`/`supervisors`. For inspector reports the `organization_id` actually references `supervisor_sites.id` — resolve through `supervisor_sites` → `organizations.name`. For supervisor reports, resolve through `supervisor_sites.organization_id` → `organizations.name`.
- "Professional/giant" treatment: large summary cards, color-coded risk badges, sticky table header, empty-states with iconography, CSV export button (client-side generation from the active tab).

**`AdminInspectorReportDetail` / `AdminIncidentDetail`**
- Reuse the visual breakdown logic already in `InspectorReportDetail` (Daily Checklist categorized view, Weekly Summary sections, Monthly Performance charts) wrapped in `AdminLayout`.
- Show inspector/supervisor profile, organization, evidence files (signed URLs from `Inspector-evidence` storage bucket).
- Incidents: show severity, incident type, description, immediate action, evidence; allow admin to update status (`open` → `investigating` → `closed`).

---

## 2. Business detail "Reports" tab

**File**: `src/admin/pages/BusinessDetail.tsx`

- Add a new `<TabsTrigger value="reports">` (icon `ClipboardList`) in the tab bar between `Documents` and `Chats`.
- New `<TabsContent value="reports">` containing a sub-tab list: `Inspector Reports`, `Supervisor Reports`, `Incidents`.
- In `load()`, after we have `org.id`, run additional queries:
  - `supervisor_sites` where `organization_id = org.id` → collect `siteIds`.
  - `inspector_reports` where `organization_id IN (siteIds)`.
  - `supervisor_reports` where `site_id IN (siteIds)`.
  - `inspector_incidents` where `organization_id = org.id`.
  - `supervisor_incidents` where `site_id IN (siteIds)`.
- Render compact tables for each, each row links to the appropriate admin detail route from section 1.

---

## 3. Inspector portal — editable drafts

**Files**
- `src/pages/inspector/InspectorReports.tsx`: when a row is `draft`, navigate to `/inspector/reports/:id/edit`; when `submitted`, keep current `/inspector/reports/:id` read-only view. Add a "Draft" badge action button in the row.
- `src/pages/inspector/InspectorReportForm.tsx`: convert to dual-mode (create vs edit). Read `id` from `useParams`. If present:
  1. Fetch report via `inspector_reports`.
  2. Guard: only `status = 'draft'` and `inspector_id = auth.uid()` can edit (otherwise redirect).
  3. Pre-fill `reportType`, `selectedSite` (resolve `supervisor_sites.organization_id`), `notes`, weekly sections from `report_content`, and checklist items from `Inspector_checklist_items` (sorted by `sort_order`).
  4. Save = `UPDATE inspector_reports` + delete-then-insert checklist items (simpler than diffing).
  5. Submit = same plus call `submit_Inspector_report` RPC for daily, or set `status='submitted'` for weekly.
- New route in `App.tsx`: `/inspector/reports/:id/edit` → `InspectorReportForm`.
- The "New Report" link continues to use `/inspector/reports/new` (no `id`).

---

## 4. Remove Observations module

**Inspector**
- Delete `src/pages/inspector/InspectorObservations.tsx`.
- Remove import + `<Route path="/inspector/observations">` from `src/App.tsx`.
- Remove the `Observations` entry from `src/components/layout/InspectorSidebar.tsx`.

**Supervisor**
- Delete `src/pages/supervisor/SupervisorObservations.tsx`.
- Remove import + `<Route path="/supervisor/observations">` from `src/App.tsx`.
- Remove the `Observations` entry from `src/components/layout/SupervisorSidebar.tsx`.

The underlying `inspector_observations` / supervisor observations DB tables (if any) are left untouched so existing data is preserved; UI just no longer exposes them.

---

## Files summary

Create:
- `src/admin/pages/AdminReports.tsx`
- `src/admin/pages/AdminInspectorReportDetail.tsx`
- `src/admin/pages/AdminIncidentDetail.tsx`

Edit:
- `src/App.tsx` (add 4 routes, remove 2 routes & 2 imports)
- `src/admin/components/layout/AdminSidebar.tsx` (add Reports entry)
- `src/admin/pages/BusinessDetail.tsx` (add Reports tab + queries)
- `src/pages/inspector/InspectorReports.tsx` (route drafts to edit)
- `src/pages/inspector/InspectorReportForm.tsx` (edit-mode support)
- `src/components/layout/InspectorSidebar.tsx` (remove Observations)
- `src/components/layout/SupervisorSidebar.tsx` (remove Observations)

Delete:
- `src/pages/inspector/InspectorObservations.tsx`
- `src/pages/supervisor/SupervisorObservations.tsx`

No database migrations required.

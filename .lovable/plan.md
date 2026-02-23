
# Fix: Fetch Company Name from `organization_supervisors` Table

## Problem
All supervisor forms query the `supervisor_sites` table, which returns empty results for this supervisor. The supervisor's company assignment is stored in `organization_supervisors`, which has the record linking supervisor `49140af5...` to "Bukhari Restaurents".

## Solution
Change all 4 supervisor form pages to query `organization_supervisors` instead of `supervisor_sites`, joining with `organizations` to get the company name.

## Files to Modify

### 1. `src/pages/supervisor/SupervisorIncidentForm.tsx`
- Replace `supervisor_sites` query with `organization_supervisors` query:
  ```
  supabase.from("organization_supervisors")
    .select("*, organizations(name, id)")
    .eq("supervisor_id", session.user.id)
  ```
- Update the Input display to use `sites[0]?.organizations?.name`
- Update the `selectedSite` to store `organization_id` instead of site id

### 2. `src/pages/supervisor/SupervisorReportForm.tsx`
- Same query change from `supervisor_sites` to `organization_supervisors`
- Update display references accordingly

### 3. `src/pages/supervisor/SupervisorObservations.tsx`
- Same query change from `supervisor_sites` to `organization_supervisors`
- Update display references accordingly

### 4. `src/pages/supervisor/SupervisorIngredientForm.tsx`
- Same query change from `supervisor_sites` to `organization_supervisors`
- Update display and submission logic to use `organization_id` from the assignment

Each file follows the same pattern: replace the data source, update the auto-select to use the correct ID field, and ensure the disabled Input shows `organizations.name`.

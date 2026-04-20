

# Supervisor Reports Overhaul + Admin Visibility

## Summary of Changes

### 1. Weekly Report → Long-Form Document Style
Currently all report types use the same checklist format. The weekly report should behave like a Word document — rich text sections instead of checklist items.

**Approach**: When `report_type === "weekly_summary"` in the form, hide the checklist UI and show a structured long-form editor with these sections:
- Executive Summary
- Key Achievements This Week
- Compliance Issues Identified
- Corrective Actions Taken
- Recommendations for Next Week
- Supporting Evidence (file uploads)

Store the content in the existing `notes` field as structured JSON (or add a `report_content` JSONB column to `supervisor_reports`). No checklist items are created for weekly reports.

### 2. Monthly Performance → KPI Dashboard Report
When `report_type === "monthly_performance"`, replace the checklist with a performance data entry form:
- Overall compliance % (manual entry or auto-calculated from that month's daily reports)
- KPI fields: Inspections conducted, NCRs raised, NCRs resolved, Incidents reported, Staff training sessions
- Category breakdown scores
- Trend notes / commentary

On the detail view (`SupervisorReportDetail`), render this data with:
- KPI summary cards (large number + label)
- Bar chart for category scores (using existing Recharts via `chart.tsx`)
- Pie chart for compliance distribution
- Trend line if historical data exists

### 3. Database Migration
Add a `report_content` JSONB column to `supervisor_reports` to store the structured weekly and monthly data separately from checklist items.

```sql
ALTER TABLE public.supervisor_reports 
ADD COLUMN report_content jsonb DEFAULT '{}'::jsonb;
```

### 4. Admin Portal — View All Reports with Detail
Currently the admin Supervisors page shows a basic reports table. Enhance it:
- Make report rows clickable → navigate to a new `AdminSupervisorReportDetail` page
- Show supervisor name, company name in the reports table
- For weekly reports: render the long-form content
- For monthly reports: render charts and KPIs
- Add route `/admin/supervisor-reports/:id`

### 5. Supervisor Multi-Company Support
Supervisors can already belong to multiple companies via `organization_supervisors` (one row per assignment). The current form already handles this with a dropdown when `sites.length > 1`. No schema change needed — this already works like inspectors.

## Files Changed

| Action | File |
|--------|------|
| Migration | Add `report_content` JSONB column to `supervisor_reports` |
| Edit | `src/pages/supervisor/SupervisorReportForm.tsx` — conditional UI for weekly (long-form) and monthly (KPI entry) |
| Edit | `src/pages/supervisor/SupervisorReportDetail.tsx` — conditional rendering: checklist for daily, document for weekly, charts/KPIs for monthly |
| Create | `src/admin/pages/AdminSupervisorReportDetail.tsx` — admin view of any supervisor report with charts |
| Edit | `src/admin/pages/Supervisors.tsx` — make report rows clickable, add supervisor/company columns |
| Edit | `src/App.tsx` — add admin route for supervisor report detail |

## Implementation Order
1. Database migration (add `report_content` column)
2. Update `SupervisorReportForm.tsx` — three distinct form modes
3. Update `SupervisorReportDetail.tsx` — three distinct display modes with charts
4. Create `AdminSupervisorReportDetail.tsx` — admin view with full charts
5. Update `Supervisors.tsx` — clickable rows, enriched table
6. Update `App.tsx` — add route


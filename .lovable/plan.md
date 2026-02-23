

# Plan: Fix Site Dropdowns + New Ingredient Collection Module

## Part 1: Fix Site Dropdowns to Show Company (Auto-Selected)

The dropdowns already fetch organization names, but still show "Site" labels and a "Select site" placeholder. We will:

### Changes across all supervisor pages:

| File | Change |
|------|--------|
| `SupervisorReportForm.tsx` | Rename "Site" label to "Company", change placeholder to "Select company", auto-select if only one assignment |
| `SupervisorIncidentForm.tsx` | Same label/placeholder changes |
| `SupervisorObservations.tsx` | Same label/placeholder changes |
| `SupervisorDashboard.tsx` | Change "Assigned Site" card title to "Assigned Company", display `orgName` or organization name as primary, remove `site_name` / `site_address` references |

If the supervisor has only one assigned organization (which is the typical case), the dropdown will auto-select it and be disabled so the supervisor doesn't need to interact with it at all.

---

## Part 2: New Supervisor Ingredient Collection Module

A new module where supervisors can log ingredients they collect from their assigned company's site. This data feeds into the admin portal for AI-powered Halal/Haram analysis.

### Database (1 new table via migration)

```text
supervisor_ingredient_collections
  - id (uuid, PK)
  - supervisor_id (uuid, NOT NULL)
  - site_id (uuid, NOT NULL, FK -> supervisor_sites)
  - organization_id (uuid, NOT NULL, FK -> organizations)
  - product_name (text, NOT NULL)
  - brand (text)
  - collection_date (date, NOT NULL, DEFAULT CURRENT_DATE)
  - notes (text)
  - status (text, DEFAULT 'pending') -- pending, analyzed, flagged
  - created_at (timestamptz, DEFAULT now())

supervisor_collected_ingredients
  - id (uuid, PK)
  - collection_id (uuid, NOT NULL, FK -> supervisor_ingredient_collections)
  - ingredient_name (text, NOT NULL)
  - source (text)
  - supplier_name (text)
  - percentage (numeric)
  - notes (text)
  - ai_classification (text) -- halal, haram, unknown (set after analysis)
  - ai_reasoning (text)
  - ai_risk_level (text)
  - admin_decision (text) -- accepted, flagged (set by admin)
  - created_at (timestamptz, DEFAULT now())
```

RLS policies:
- Supervisors can INSERT and SELECT their own collections (matched by supervisor_id)
- Admins can SELECT and UPDATE all records (for AI results and decisions)

### Supervisor Portal (2 new pages)

1. **Ingredient Collections List** (`src/pages/supervisor/SupervisorIngredients.tsx`)
   - Table showing all ingredient collections by the supervisor
   - Status badges (Pending, Analyzed, Flagged)
   - "Collect Ingredients" button to add new
   - Company auto-selected from assignment

2. **New Collection Form** (`src/pages/supervisor/SupervisorIngredientForm.tsx`)
   - Company auto-selected (disabled dropdown)
   - Product name, brand, collection date
   - Dynamic ingredient rows: name, source, supplier, percentage
   - Add/remove ingredient rows
   - Submit to database

3. **Sidebar Update** (`SupervisorSidebar.tsx`)
   - Add "Ingredients" nav item with a Flask/Beaker icon

### Admin Portal (1 new page)

1. **Ingredient Tracker** (`src/admin/pages/IngredientTracker.tsx`)
   - Table of all supervisor-collected ingredient batches
   - Shows supervisor name, company, date, product, status
   - "Analyze with AI" button per collection -- calls existing `analyze-ingredients` edge function
   - After analysis: displays classification results (Halal/Haram/Unknown) with reasoning
   - Admin can Accept or Flag each ingredient
   - Filter by status, company, date range

2. **Admin Sidebar Update** -- Add "Ingredient Tracker" nav item

3. **Route Registration** -- Add routes in `App.tsx` for both supervisor and admin pages

### AI Integration

The existing `analyze-ingredients` edge function will be reused. The admin page will:
1. Fetch ingredients for a collection
2. Format them into the structure the edge function expects
3. Call the function and store results back into `supervisor_collected_ingredients` (ai_classification, ai_reasoning, ai_risk_level)

---

## Technical Summary

| Area | Files |
|------|-------|
| Database | 1 migration (2 tables + RLS) |
| Supervisor pages (fix dropdowns) | 4 files modified |
| Supervisor new module | 2 new pages + sidebar update |
| Admin new module | 1 new page + sidebar update |
| Routing | App.tsx updated |
| Edge functions | Reuse existing `analyze-ingredients` |


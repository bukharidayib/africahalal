

# Make Supervisor & Inspector Portals Fully Mobile Responsive

## Problem
Both portals hide the sidebar on mobile (`hidden md:flex`) but provide **no mobile navigation** -- users on phones have no way to navigate between pages. Additionally, tables and forms need horizontal scroll wrappers on small screens.

## Changes

### 1. Add Mobile Hamburger Menu to Both Layouts

**Files:** `InspectorLayout.tsx`, `SupervisorLayout.tsx`

- Import `Sheet`, `SheetContent`, `SheetTrigger` from `@/components/ui/sheet` and `Menu` icon from lucide
- Add a hamburger `Menu` button in the header (visible only on mobile via `md:hidden`)
- Wrap the respective sidebar component inside the Sheet overlay
- Sheet closes on navigation (use state + `useLocation` to auto-close on route change)
- Reduce header padding on mobile (`px-3 md:px-6`)

### 2. Make Tables Horizontally Scrollable

**Files:** All pages with `<Table>` in both portals (~8 files):
- `InspectorInspections.tsx`, `InspectorInspectionDetail.tsx`, `InspectorNotifications.tsx`
- `SupervisorInspections.tsx`, `SupervisorReports.tsx`, `SupervisorIncidents.tsx`, `SupervisorNCRs.tsx`, `SupervisorObservations.tsx`, `SupervisorIngredients.tsx`, `SupervisorTickets.tsx`

Wrap each `<Table>` in `<div className="overflow-x-auto">` so it scrolls horizontally on small screens instead of breaking layout.

### 3. Responsive Grid Adjustments for Dashboard Stats

**Files:** `InspectorDashboard.tsx`, `SupervisorDashboard.tsx`

- Change stat card grids from `grid-cols-2 md:grid-cols-4` to `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4` for better stacking on very small screens.

### 4. Form Layout Adjustments

**Files:** `SupervisorReportForm.tsx`, `SupervisorIncidentForm.tsx`, `SupervisorIngredientForm.tsx`, `InspectorInspectionDetail.tsx`

- Ensure form grids use `grid-cols-1 md:grid-cols-2` pattern
- Reduce main content padding on mobile (`p-3 md:p-6`)

## Summary

| Area | Files Modified |
|------|---------------|
| Layouts (mobile nav) | 2 (`InspectorLayout.tsx`, `SupervisorLayout.tsx`) |
| Tables (scroll wrapper) | ~10 page files |
| Dashboard grids | 2 dashboard files |
| Form layouts | ~4 form files |

The core fix is adding the Sheet-based mobile sidebar to both layouts. The table/form tweaks ensure content doesn't overflow on narrow screens.


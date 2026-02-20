
# Fix: "Billing & Invoices" Visible to Users Without Finance Permission

## Root Cause (100% Confirmed)

The bug is a single incorrect permission key in `src/admin/components/layout/AdminSidebar.tsx`.

Line 74 reads:
```typescript
{
  title: 'Billing & Invoices',
  href: '/admin/billing',
  icon: Receipt,
  permission: 'canViewApplications',  // ← WRONG — uses Applications permission
},
```

It should use `'canViewFinance'` — but it was accidentally set to `'canViewApplications'`. Since `afrosaas@gmail.com` (CIDO role) has full Applications access, `canViewApplications = true`, which causes the Billing & Invoices sidebar item to appear for them even though they have no Finance permissions at all.

The `canViewFinance` key exists correctly in `permissions.ts` and maps to the `finance.view` database permission code — the wiring is all there, just the sidebar references the wrong key.

## The Fix

**File:** `src/admin/components/layout/AdminSidebar.tsx`  
**Line 74:** Change `permission: 'canViewApplications'` → `permission: 'canViewFinance'`

```typescript
// BEFORE (broken):
{
  title: 'Billing & Invoices',
  href: '/admin/billing',
  icon: Receipt,
  permission: 'canViewApplications',
},

// AFTER (correct):
{
  title: 'Billing & Invoices',
  href: '/admin/billing',
  icon: Receipt,
  permission: 'canViewFinance',
},
```

## Impact After Fix

| User | Has `canViewApplications` | Has `canViewFinance` | Billing visible (before) | Billing visible (after) |
|------|--------------------------|----------------------|--------------------------|-------------------------|
| afrosaas@gmail.com (CIDO) | Yes | No | Yes (bug) | No (correct) |
| Super Administrator | Yes | Yes | Yes | Yes |
| Any role with Finance.view | Depends | Yes | Depends | Yes (correct) |

## No Other Changes Needed

- The `Permission` interface already has `canViewFinance: boolean` correctly defined
- The `CODE_TO_KEY` map already correctly maps `'finance.view'` → `'canViewFinance'`
- The `AdminBilling.tsx` page does not have its own permission guard (the sidebar is the access gate)
- No database changes are needed — this is purely a one-word UI fix

## Files to Change

| File | Line | Change |
|------|------|--------|
| `src/admin/components/layout/AdminSidebar.tsx` | 74 | `'canViewApplications'` → `'canViewFinance'` |

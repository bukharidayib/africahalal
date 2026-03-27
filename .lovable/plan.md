

# Simplify Ingredient Form + Fix Billing Visibility

## Two Issues

### 1. Simplify "Manage Ingredients" Dialog
The current ingredient form has 5 fields (Name, Percentage, Source, Supplier, Halal Certified). Reduce to only **Ingredient Name** and **Supplier Name**.

**File: `src/components/client/ProductIngredientModal.tsx`**
- Remove Percentage, Source, and Halal Certified fields from the add form
- Remove those columns from the ingredients list table (keep only Ingredient Name, Supplier, Action)
- Keep the `Ingredient` interface fields for DB compatibility but stop collecting them in the UI (they'll be `null`/default)

### 2. Billing — No Invoices Showing
The invoice is created during application submission (line 603 of `CertificationApplication.tsx`) using the client's `organization_id`. The `invoices` RLS policy for clients filters by `organization_id IN (SELECT profiles.organization_id FROM profiles WHERE id = auth.uid())`.

**Root cause**: If the client's `profiles.organization_id` is `null` or doesn't match the org used in the application, no invoices will be visible. This is a data issue, not a code issue.

**Fix approach**:
- Query the database to check if the current user's profile has an `organization_id` set
- If invoices exist but aren't showing, it's because the profile's `organization_id` doesn't match. We need to verify and potentially fix the data linkage.
- Add a fallback query in `BillingDashboard.tsx` that also checks invoices linked to the user's applications directly (via `certification_applications.organization_id`) as a secondary path

**File: `src/pages/client/BillingDashboard.tsx`** and **`src/pages/client/BillingInvoices.tsx`**
- Keep existing org-based query (works via RLS)
- If zero results, show a helpful message: "No invoices yet. Invoices are generated when you submit a certification application."

## Summary

| Change | File |
|--------|------|
| Simplify ingredient form to 2 fields | `ProductIngredientModal.tsx` |
| Add empty-state guidance on billing | `BillingDashboard.tsx` |


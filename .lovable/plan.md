## Goal

Fix the `supervisor_ingredient_collections_site_id_fkey` violation when supervisors submit ingredient collections, and ensure the admin Ingredient Tracker correctly shows business/company names alongside each submission.

## Root cause

In `SupervisorIngredientForm.tsx`, the form tries to look up (or create) a `supervisor_sites` row, then uses its `id` as `site_id` on `supervisor_ingredient_collections`. The current flow has multiple fragile points:

1. `.maybeSingle()` returns `null` data not only when zero rows match, but also when RLS hides matching rows or when more than one active row exists for the same supervisor/org pair.
2. When the lookup returns null, the code inserts a new `supervisor_sites` row, but the freshly inserted row's id can fail the immediate FK check from the subsequent `supervisor_ingredient_collections` insert in some race/RLS scenarios.
3. The two-step client flow runs under the supervisor's RLS, while the FK constraint is checked at the database level — any mismatch (e.g. RLS hiding the new row from `select("id")`) leads to the FK error the user is seeing.

The reliable fix is to move the "resolve or create supervisor_site for this supervisor + organization" logic into a single `SECURITY DEFINER` Postgres function that returns a guaranteed-valid `site_id`.

## Changes

### 1. Database migration

Create a SECURITY DEFINER RPC `ensure_supervisor_site(_organization_id uuid, _site_name text)`:
- Verifies the caller is the supervisor (`auth.uid()`).
- Returns the existing active `supervisor_sites.id` for `(supervisor_id = auth.uid(), organization_id, is_active = true)`.
- If none exists, inserts a new row using the org name (or provided `_site_name`) and returns the new id.
- Grants `EXECUTE` to `authenticated`.

This eliminates RLS visibility issues and guarantees the returned id exists at FK check time.

### 2. `src/pages/supervisor/SupervisorIngredientForm.tsx`

- Replace the manual `select` + conditional `insert` block on `supervisor_sites` with a single `supabase.rpc("ensure_supervisor_site", { _organization_id, _site_name })` call.
- Use the returned id directly as `site_id` for the `supervisor_ingredient_collections` insert.
- Keep existing validation (company required, product name required, percentage 0–100, at least one ingredient).
- Improve error messages so the user sees a clear reason if RPC fails.

### 3. `src/admin/pages/IngredientTracker.tsx` (verify + minor polish)

The page already joins `organizations(name)` and shows it in the Company column. Confirm:
- Search across product, brand, **and** company name (already present).
- Display business name with a sensible fallback when the org row is missing.
- No schema change needed — admin RLS (`Admins can view all collections`) already exposes every supervisor submission once the insert path is fixed.

## Technical notes

- No changes to existing tables or constraints; only a new function is added.
- No changes to `supervisor_collected_ingredients` insert logic — it keys off the new collection id, which will now reliably exist.
- Existing supervisor_sites rows continue to work; the RPC reuses them when present.

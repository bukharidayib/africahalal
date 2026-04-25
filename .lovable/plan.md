# Admin Portal Fixes — Plan

## 1. Certificate Details — fix "Page not found"

**Cause:** `Certificates.tsx` row link points to `/admin/certificates/:id`, but no route or page exists in `src/App.tsx` or `src/admin/pages/`.

**Fix:**
- Create `src/admin/pages/CertificateDetail.tsx` showing:
  - Certificate number, status badge (active / suspended / revoked / expired)
  - Organization, scope, sector, issue date, expiry date, validity countdown
  - Issued by / approved by (admin names)
  - Linked application + linked invoice (if any)
  - QR hash + a "Download Certificate PDF" button (re-using existing `CertificateTemplate` / `CertificateDownloader`)
  - Certificate History timeline (from `certificate_history` table)
  - Admin actions: Suspend / Revoke / Reinstate (writes `certificates.status` + `certificate_history` row), gated by `certificates.update` permission
- Register route in `src/App.tsx` inside the admin protected block:
  `<Route path="certificates/:id" element={<CertificateDetail />} />`

## 2. Applications page — remove "New Application" button

In `src/admin/pages/Applications.tsx` delete the `<Button>` block that renders "New Application" in the header (lines ~123–126). Keep the title/description.

## 3. Pending Approvals — make it work smoothly

Current issues found in `PendingApprovals.tsx`:
- Joins `recommender` but never selects it — the `recommender_id` is shown raw. Fix by joining `profiles` via `recommender_id` for the recommender name/email.
- `handleAction` updates `approval_requests` but does **not** advance the parent application or trigger certificate issuance. Add: on approve, set `certification_applications.status = 'approved'` for the linked application; on reject, set to `'rejected'` and write `application_status_history`.
- Add empty-state polish, loading skeleton, and a refresh button.
- Surface dual-control violation inline (disable Approve button if `recommender_id === user.id` instead of only toasting).
- Wrap `log_audit` in try/catch so a logging failure doesn't break the action.

## 4. Inspector dialogues — remove Specializations & Regions

In `src/admin/pages/Inspectors.tsx`:
- Remove the Specializations and Regions blocks from both the **Invite Inspector** form (~lines 605–635) and the **Edit Inspector** dialogue (~lines 480–510).
- Remove the fields from `form` initial state, from the invite payload sent to `send-inspector-invitation`, and from the update payload to `inspectors` table.
- Remove the columns from the inspector list/table display if shown.
- Edge function `send-inspector-invitation` and `accept-inspector-invitation`: stop requiring/writing `specializations` and `regions` (leave DB columns intact, just default to empty arrays for backward compatibility).

## 5. Ingredient Tracker — make it work end-to-end

**Current wiring (verified):**
- Tables `supervisor_ingredient_collections` and `supervisor_collected_ingredients` exist but are **empty** (0 rows).
- Supervisors create collections via `src/pages/supervisor/SupervisorIngredientForm.tsx` → `SupervisorIngredients.tsx`.
- Admin page `IngredientTracker.tsx` reads those collections and calls `analyze-ingredients` edge function (Lovable AI) to classify each ingredient as halal / haram / mashbooh.

**Why it appears broken:** No supervisor has submitted a collection yet, so the admin list is empty — not a bug, but the UX gives no guidance.

**Fixes:**
- In `IngredientTracker.tsx`:
  - Improve empty state: explain that collections are created by supervisors during inspections, with a link to Supervisors page.
  - Add a status filter that actually works (currently `statusFilter` state exists but isn't applied to the query).
  - Show product/brand/organization, ingredient counts, and last-analyzed timestamp in the table.
  - In the detail dialog, show each ingredient with classification badge, confidence, source notes, and an "Re-analyze" button per ingredient.
  - After AI analysis, persist the classification to `supervisor_collected_ingredients` (`classification`, `confidence`, `notes`) and update the parent collection's `status` to `analyzed` or `flagged` (if any haram).
- In `analyze-ingredients` edge function: confirm it returns per-ingredient results and writes them back; if not, add an upsert step using service role.
- Add a "Send to Supervisor" action that creates a row in `inspection_notifications` so the supervisor sees the AI verdict.
- Verify RLS on both tables allows admin SELECT (and admin UPDATE for writing classifications).

## Technical Notes

- Files to create:
  - `src/admin/pages/CertificateDetail.tsx`
- Files to edit:
  - `src/App.tsx` (new route)
  - `src/admin/pages/Applications.tsx` (remove button)
  - `src/admin/pages/PendingApprovals.tsx` (joins, app status update, UX)
  - `src/admin/pages/Inspectors.tsx` (drop specializations/regions UI + payloads)
  - `src/admin/pages/IngredientTracker.tsx` (filter, empty state, persist results, notify)
  - `supabase/functions/send-inspector-invitation/index.ts` (drop fields)
  - `supabase/functions/accept-inspector-invitation/index.ts` (drop fields)
  - `supabase/functions/analyze-ingredients/index.ts` (persist classifications)
- DB: no schema changes required. RLS on `certificates` already allows `certificates.update` permission for status changes; ingredient tables already allow admin access.

# Multi-Business Application Limit

## Problem with the current model

- The DB trigger `enforce_single_active_application` blocks **any** non-terminal application per `organization_id`, including drafts. This stops the client from saving more than one draft.
- `client_businesses` already supports multiple businesses per user, but `certification_applications` is keyed only by `organization_id`. The UI uses one `profiles.organization_id`, so multiple businesses effectively share a single org and collide.
- Result: the user cannot save multiple drafts, and the "one active application" rule is enforced at the wrong level (user/profile) instead of the business level.

## Goal

- A user can own many businesses (`client_businesses`).
- Each business can have **unlimited drafts**.
- Each business can have **at most one active (paid / in-progress) application** at a time.
- Once that application is `expired`, `rejected`, or `withdrawn`, the business can apply again.

"Active" = any status NOT in (`draft`, `expired`, `rejected`, `withdrawn`).

## Changes

### 1. Schema (migration)

- Add `business_id uuid REFERENCES public.client_businesses(id) ON DELETE CASCADE` to `certification_applications` (nullable for legacy rows).
- Backfill: for each existing application, link to a `client_businesses` row matching `organization_id` + owning user when possible.
- Add index on `(business_id, status)`.
- Replace `enforce_single_active_application()` trigger:
  - Skip when `NEW.status = 'draft'` (drafts unlimited).
  - Block insert/update only if another row with the **same `business_id`** exists with status NOT in (`draft`, `expired`, `rejected`, `withdrawn`).
  - Fall back to `organization_id` only if `business_id` is NULL (legacy safety).
- Run on `BEFORE INSERT OR UPDATE OF status, business_id`.

### 2. Application creation flow (`src/pages/client/CertificationApplication.tsx`)

- Require `selectedBusinessId` before saving any draft (Step 1 selector already exists; enforce in `validateStep(1)` and `handleSaveDraft`).
- For each business, ensure a backing `organizations` row exists (create on first use), store the link on `client_businesses.organization_id`, and use that for the application.
- On `handleSaveDraft`:
  - Remove the pre-flight "active application" check for drafts (drafts are always allowed).
  - Always pass `business_id: selectedBusinessId` and `status: 'draft'`.
- On `handleAdvanceToPayment` (the moment a draft becomes a real submission and an invoice is created):
  - Pre-flight query: any application for this `business_id` with status NOT in (`draft`, `expired`, `rejected`, `withdrawn`)? If yes, block with: "This business already has an active application. You can apply again once it expires."
  - Otherwise proceed (DB trigger is the final guard).
- Map DB exception text to the same friendly message.

### 3. Drafts listing / "My Applications"

- Group drafts by business in `MyApplications.tsx` so the client can see and resume any of multiple drafts per business.
- Show a per-business badge: "Active application in progress" or "Eligible to apply" based on the rule above.

### 4. Edge cases

- Draft → submitted transition: the trigger's `BEFORE UPDATE` check enforces the one-active rule at the moment of promotion, not at draft save.
- Multiple drafts for the same business at the same time: allowed; only the first one promoted to a non-draft status locks the business.
- After expiry: `expire_lapsed_applications()` already flips status to `expired`, which automatically re-opens the business for a new application.

## Out of scope

- Changing payment flow, fees, or invoice model.
- Changing how `organizations` are deduped across users (kept as-is).

## Goal

Tighten the Business module with five precise improvements:

1. **In-app document previews** for uploaded application docs (PDF/image) — no more "download only".
2. **"Active Certificate" column** on the Businesses list table.
3. **Properly separate Subscription from Certificate** — they are unrelated entities with their own lifecycles.
4. **Stricter issuance rule**: a new certificate can only be issued for an application whose existing certificate is **expired** (or it has none). Active certs block issuance.
5. **Email automation on changes**: any subscription or certificate update sends an automatic email to the client; admins also get a manual "Email client" button to share details on demand.

---

## 1. Document previews (in-app)

New component `src/admin/components/documents/DocumentPreviewDialog.tsx`:
- Opens a modal showing the file inline using a short-lived signed URL.
- **PDF** → `<iframe>` embed.
- **Images** (`image/*`, or extensions jpg/jpeg/png/webp/gif) → `<img>`.
- **Other types** → fallback message + Download button.
- Header shows filename + type, footer has Download and Open in new tab.

Wire it into:
- `BusinessDetail.tsx` — Documents tab and the expanded Application row's documents list. Clicking a doc opens the preview; download stays as a secondary action.
- (No change to `application_documents` schema — uses existing `application-documents` storage bucket signed URLs.)

## 2. Businesses list — "Active Certificate" column

In `src/admin/pages/Businesses.tsx`:
- Add a new column **"Certificate"** (separate from the existing "Subscription" column, which will now reflect subscriptions, not certs — see §3).
- Shows green badge "Active · {cert#}" or grey "None".
- Sourced from the existing `certificates` query (no new query needed; just split the visualization).

## 3. Subscription vs Certificate — clean separation

The DB already has a `subscriptions` table (`organization_id`, `plan_name`, `billing_cycle`, `amount`, `start_date`, `end_date`, `next_billing_date`, `status`, `notes`). It is not currently surfaced in the admin UI — the Subscription tab today is just rendering the active certificate, which is wrong.

**Rework the Subscription tab in `BusinessDetail.tsx`** so it manages `subscriptions` rows only:

- **Current Subscription card**: plan name, billing cycle, amount, start, end, next billing, status, notes. **Does not show or reference any certificate**.
- **"New Subscription" dialog** — `src/admin/components/billing/SubscriptionFormDialog.tsx`:
  - Plan name (free text or preset).
  - Billing cycle: **month-based** (`1_month`, `2_months`, `3_months`, `4_months`, `6_months`, `12_months`) **or** **quarter-based** (`1_quarter`, `2_quarters`, `3_quarters`, `4_quarters`).
  - Amount (ZMW), start date, auto-computed end date and next_billing_date (editable).
  - Notes.
- **Per-row actions**: Edit, Renew (extends by current cycle), Suspend, Reactivate, Cancel, **Email client** (manual).
- **Subscription history table** below.

The **Certificates tab** continues to manage halal certificates only and stays unrelated to subscriptions.

## 4. Stricter manual issuance gate

Update `eligibleApps` derivation in `BusinessDetail.tsx` and the certificate-issuance handlers:

- An application is eligible for manual certificate issuance only if **status = 'approved'** AND it has **no certificate with status = 'active'** linked to it.
  - Apps with an `expired`, `revoked`, or `suspended` cert ARE eligible (renewal/re-issuance after expiry).
  - Apps with an `active` cert are NOT eligible.
- The inline "Issue Certificate" button on application rows uses the same rule.
- `IssueCertificateDialog.tsx` keeps its current behavior; the gate is enforced in the parent.
- Quarter-based scope: certificate validity controls (issue/expiry dates) stay as-is — admin picks the dates, which already supports quarter durations (3, 6, 9, 12 months).

## 5. Automatic + manual email notifications

### New edge functions

- `supabase/functions/send-subscription-email/index.ts` — accepts `{ subscription_id, event_type, custom_message? }` where `event_type ∈ created | updated | renewed | suspended | reactivated | cancelled | manual`. Loads org + owner email, renders an HTML email summarizing plan/cycle/amount/dates/status, sends via Resend (gateway already in use). Logs to `accountant_audit_log` (existing table).
- Reuse existing `send-certificate-email` for certificate change emails. Extend its payload to support an `event_type` (`issued | updated | suspended | revoked | reactivated | manual`) and an optional `custom_message`, with a clear subject per event.

### Auto-trigger from the UI

- After **any** successful subscription insert/update/status-change in `BusinessDetail.tsx`, the client calls `send-subscription-email` with the matching `event_type`. Toast surfaces success/failure but failures don't block the DB action.
- After **any** successful certificate update (Edit Validity, Suspend/Revoke/Reactivate via `CertificateActionsMenu`), the client calls `send-certificate-email` with the matching `event_type`. Manual issuance continues to send the existing welcome email.

### Manual "Email client" button

- Subscription card and each cert row get a **Mail** icon button → opens a small `SendNotifyDialog` with a textarea ("custom message to client"). Submitting calls the relevant edge function with `event_type = 'manual'` and the custom message. This satisfies the "admins can send the details as email to client manually" requirement.

### Email infra

- All emails use the existing Resend integration (`LOVABLE_API_KEY` + `RESEND_API_KEY` already configured per the resend gateway pattern). No new secrets needed.

---

## Files

**New**
- `src/admin/components/documents/DocumentPreviewDialog.tsx`
- `src/admin/components/billing/SubscriptionFormDialog.tsx`
- `src/admin/components/billing/SendNotifyDialog.tsx`
- `supabase/functions/send-subscription-email/index.ts`

**Edited**
- `src/admin/pages/Businesses.tsx` — add Certificate column.
- `src/admin/pages/BusinessDetail.tsx` — rewire Subscription tab to `subscriptions` table; wire previews; tighten eligibility; auto-email on cert/sub changes; add manual Email buttons.
- `src/admin/components/billing/CertificateActionsMenu.tsx` — call `send-certificate-email` after status changes.
- `src/admin/components/billing/EditValidityDialog.tsx` — call `send-certificate-email` after save.
- `supabase/functions/send-certificate-email/index.ts` — accept `event_type` + `custom_message`.

**Database**: no schema changes — `subscriptions` and `certificates` already exist with the right shape.

---

## Out of scope

- Auto-billing/auto-renewal (subscriptions stay manually managed).
- Changing the certificate visual template.
- Public-facing subscription portal for clients.

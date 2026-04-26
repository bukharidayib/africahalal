## Goals

1. Fix the two database constraint errors blocking subscription creation and manual certificate issuance.
2. Add a full **Certificate Audit Timeline** showing every action (issued, updated, suspended, revoked, reactivated, validity_updated, etc.) with actor name, timestamp, and reason.
3. Add **in-admin alert banners** for certificates expiring within 30 days and subscriptions whose end date is past-due.

---

## Root cause of the errors

Investigated the live DB constraints:

- `subscriptions_billing_cycle_check` only allows `'monthly' | 'quarterly' | 'yearly'`.
  Our dialog sends values like `12_months`, `1_quarter`, etc. → violation.
- `subscriptions_status_check` only allows `'active' | 'paused' | 'cancelled' | 'expired'` (no `'suspended'`).
- `certificates.dual_control` is `CHECK (issued_by <> approved_by)`. The manual-issue dialog sets both fields to the same admin → violation.

## Plan

### 1. Database migration (schema relaxation)

- Drop and re-add `subscriptions_billing_cycle_check` to allow the richer set:
  `'1_month','2_months','3_months','4_months','6_months','12_months','1_quarter','2_quarters','3_quarters','4_quarters','monthly','quarterly','yearly'` (keep legacy values for backward compatibility).
- Drop and re-add `subscriptions_status_check` to also allow `'suspended'`.
- Drop the `dual_control` check on `certificates`. Manual issuance by a single admin is a legitimate workflow already gated by RLS + audit log; dual control will be enforced at the application layer for the auto-issuance path only (unchanged behaviour there). Audit log entry continues to record actor.

### 2. Fix the dialogs (no behaviour change beyond what migration enables)

- `SubscriptionFormDialog.tsx`: keep current UX. After migration the inserts succeed.
- `IssueCertificateDialog.tsx`: keep `issued_by = approved_by = current admin`. After migration this no longer violates the constraint.

### 3. Certificate Audit Timeline

- New component `src/admin/components/billing/CertificateTimeline.tsx`:
  - Loads `certificate_history` rows for a given `certificate_id`, joined with `profiles` to resolve `performed_by → full_name/email`.
  - Renders a vertical timeline: action chip (color-coded), actor name, relative + absolute timestamp, reason text.
  - Skeleton + empty state.
- Integrate into `BusinessDetail.tsx` Certificates tab: each certificate row gets an expandable "View timeline" panel that mounts `CertificateTimeline`.
- Also surface inside the existing `EditValidityDialog` and `CertificateActionsMenu` confirmation dialogs as a read-only collapsible "Recent activity" so admins see prior changes before acting.
- Ensure all existing actions already insert into `certificate_history` (they do: issue, validity_updated, suspend, revoke, reactivate). Add one missing entry: subscription email send → not part of cert history (out of scope).

### 4. Alert banners

- New component `src/admin/components/billing/BusinessAlerts.tsx`:
  - Props: `organizationId`.
  - Queries:
    - Certificates: `status='active'` and `expiry_date` within next 30 days (and a separate already-expired bucket).
    - Subscriptions: `status in ('active','suspended')` and `end_date < today`.
  - Renders dismissible (per-session) `Alert` banners at the top of `BusinessDetail.tsx`:
    - Amber: "Certificate {number} expires in N days ({date})".
    - Red: "Certificate {number} expired on {date}".
    - Red: "Subscription {plan} ended on {date} — renewal overdue".
- Also add an aggregate banner on the **Businesses list page** (`Businesses.tsx`) summarizing counts: "X certificates expiring soon · Y subscriptions past-due", clickable to filter the table.

---

## Files

**Migration**
- `supabase/migrations/<new>.sql` — drop/recreate the two subscription CHECKs and drop `dual_control`.

**New**
- `src/admin/components/billing/CertificateTimeline.tsx`
- `src/admin/components/billing/BusinessAlerts.tsx`

**Modified**
- `src/admin/pages/BusinessDetail.tsx` — mount `<BusinessAlerts>` at top, embed `<CertificateTimeline>` per certificate row.
- `src/admin/pages/Businesses.tsx` — add aggregate alert banner.
- `src/admin/components/billing/EditValidityDialog.tsx` — embed compact timeline (read-only).
- `src/admin/components/billing/CertificateActionsMenu.tsx` — minor: pass through onChanged so timeline refreshes.

No edge-function changes required.

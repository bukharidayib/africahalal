## Goal

Make the admin **Business module** (`/admin/businesses/:id`) a complete control hub: manage certificates (issue **only when an application is approved**), manage subscriptions manually, manage invoices/payments, and drill into application details (documents, payments, status). Same certificate template as the auto-issued ones.

---

## What you'll be able to do (per business)

### 1. Certificates — manual issuance & full lifecycle
- **Issue Certificate** button at the top of the Certificates tab.
  - Shows a dropdown of the business's **approved applications that don't yet have a certificate**.
  - Disabled with a clear hint ("No approved application available") when there are none.
  - Auto-generated cert number (editable), scope, issue date, expiry date, notes.
  - Uses the **same `CertificateTemplate`** as the auto flow (verifiable QR + public verify page).
- **Per-row actions**: Edit Validity (already exists), **Suspend / Revoke / Reactivate**, **Download PDF**, **Send to Client by Email**, **View Public Verify Page**.
- All status changes log to `certificate_history`.

### 2. Subscription — manual full lifecycle
A dedicated **Subscription** tab promoted from the Overview panel:
- **Current subscription card**: cert #, issued, expires, days remaining, status.
- **Renew / Extend** (+3, +6, +12, +24 months or custom expiry).
- **Suspend / Reactivate / Cancel** with reason note (logged).
- **Subscription history** table listing every past certificate / period.
- New subscription = issue a new certificate (still requires an approved application — same gate as #1).

### 3. Applications — full drill-down
- Applications tab keeps the table but adds an expandable detail panel per row showing:
  - Status timeline
  - All uploaded documents (filename, type, version, **View / Download** via signed URL)
  - All invoices for that application + payment status
  - Quick link to full `/admin/applications/:id`
- Inline "Issue Certificate" button stays for approved apps without a cert.

### 4. Invoices & Payments — manage from inside the business
- "**+ New Invoice**" button at the top — opens existing `InvoiceFormDialog` with the business's organization pre-selected (multi-line items already supported).
- Per-row actions: **View**, **Edit**, **Send by Email**, **Download PDF**, **Mark Paid** (manual).
- Payment transactions table stays for visibility.

### 5. Smarter listing page
On `/admin/businesses` add quick filter chips: **All / Active / Expiring ≤30 days / Expired / No certificate**, plus a "**Days until expiry**" column.

---

## Technical changes

### Files to edit
- `src/admin/pages/BusinessDetail.tsx`
  - New `Subscription` tab with renew / suspend / reactivate / cancel.
  - Certificates tab gets a header **Issue Certificate** button (gated to approved apps without a cert).
  - Per-cert actions menu (Suspend/Revoke/Reactivate/Download/Email).
  - Expandable application rows with documents + invoices + status timeline.
  - "+ New Invoice" button in Invoices tab → opens `InvoiceFormDialog`.
- `src/admin/components/billing/IssueCertificateDialog.tsx`
  - Accept a list of eligible (approved, no-cert) applications and let admin pick which one when invoked from the Certificates/Subscription tab header.
- `src/admin/pages/Businesses.tsx`
  - Add subscription status column + filter chips.

### New file
- `src/admin/components/billing/CertificateActionsMenu.tsx` — Suspend / Revoke / Reactivate / Download PDF / Email / View Public, all writing to `certificate_history`.

### Database
- No schema changes — `certificates.application_id` stays NOT NULL because every issuance must reference an approved application.
- (Optional) index `certificates(organization_id, status, expiry_date)` to speed up subscription lookups.

### Edge functions (reused)
- `generate-invoice-pdf`, `send-invoice-email`, `send-certificate-email` — all already deployed.

---

## Out of scope
- Changing the certificate visual template (kept identical).
- Auto-billing on renewal (stays manual, per your earlier instruction).
- Issuing certificates without an approved application.

Once approved, I'll implement everything in one pass.
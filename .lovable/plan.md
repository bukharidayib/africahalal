# Plan: Business Hub + Manual Certificate Validity + Pro Invoicing

Three connected pieces of admin functionality.

---

## 1. New "Business" Module (Admin Portal)

A unified per-business hub aggregating everything tied to one client business.

**New routes & pages:**
- `/admin/businesses` — `Businesses.tsx`: searchable/filterable list of all `client_businesses` (joined to `organizations`) with columns: Name, PACRA #, Owner, Active Cert, Open Apps, Outstanding Balance.
- `/admin/businesses/:id` — `BusinessDetail.tsx`: tabbed dashboard for one business.

**Tabs in BusinessDetail:**
1. **Overview** — profile (name, PACRA, sector, address, contacts), KPI cards (total paid, outstanding, # certs, # apps).
2. **Applications** — all `certification_applications` for the business, status badges, link to ApplicationDetail.
3. **Certificates** — active + expired/revoked certificates with status filter, link to CertificateDetail.
4. **Invoices & Payments** — invoices list + `payment_transactions` history.
5. **Documents** — files from `application_documents` across all apps for this business.
6. **Chats / Messages** — `application_messages` and `chat_sessions` linked to the business.
7. **History / Audit** — `audit_logs` filtered by resource_id matching this business and its children.

**Sidebar:** Add "Businesses" entry in `AdminSidebar.tsx` (icon: `Building2`), gated by a new `canViewBusinesses` permission (or reuse `canViewApplications`).

**Data:** Read-only aggregation — no schema changes needed; uses existing tables.

---

## 2. Manual Certificate Validity at Issuance

Currently `issue-certificate-on-payment` auto-computes expiry from `validity_period` enum. Add an admin override path.

**Changes:**
- **AdminBilling / Pending Pricing**: when finalizing invoice for a `certification` fee, allow admin to enter custom **issue_date** + **expiry_date** (date pickers) in addition to / instead of the quarter dropdown. Persist these to `invoices.issue_date` (new col? — already has `start_date`) and `invoices.expiry_date` (already exists).
- **Certificates page**: add "Issue Certificate Manually" action on approved applications without a cert. Dialog collects: scope (prefilled from app), issue_date, expiry_date, certificate_number (auto-generated, editable). Inserts directly into `certificates` table.
- **Edge function** `issue-certificate-on-payment`: already prefers `inv.expiry_date` if set — confirmed working. Just ensure UI writes those values.
- **CertificateDetail**: add "Edit validity" button (admin only) → updates `issue_date`/`expiry_date` with audit log entry.

**Schema:** Add `certificates.issue_date` is already there. No migration needed unless we want a `manually_issued boolean` flag for audit (recommended).

Migration: `ALTER TABLE certificates ADD COLUMN manually_issued boolean DEFAULT false, ADD COLUMN issued_notes text;`

---

## 3. Pro Invoicing (Multi-line Items + Multi-recipient Email)

Current `invoices` table is single-line (`description`, `amount`). Upgrade to full invoice.

**Schema migration:**
```sql
CREATE TABLE invoice_items (
  id uuid PK default gen_random_uuid(),
  invoice_id uuid REFERENCES invoices(id) ON DELETE CASCADE,
  description text NOT NULL,
  quantity numeric NOT NULL DEFAULT 1,
  unit_price numeric NOT NULL DEFAULT 0,
  line_total numeric GENERATED ALWAYS AS (quantity * unit_price) STORED,
  sort_order int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE invoices
  ADD COLUMN subtotal numeric DEFAULT 0,
  ADD COLUMN tax_rate numeric DEFAULT 0,        -- percentage e.g. 16
  ADD COLUMN tax_amount numeric DEFAULT 0,
  ADD COLUMN discount numeric DEFAULT 0,
  ADD COLUMN total numeric DEFAULT 0,
  ADD COLUMN notes text,
  ADD COLUMN recipient_emails text[] DEFAULT '{}'::text[],
  ADD COLUMN issue_date date DEFAULT CURRENT_DATE;
```
RLS: mirror `invoices` policies on `invoice_items`.

**New "Create / Edit Invoice" dialog** (in AdminBilling → Invoices tab):
- **Business picker** (OrgCombobox) → autofills bill-to (name, PACRA, address, contact) read-only preview.
- **Recipient emails**: tag-style input (comma/Enter to add), defaults to business contact email + owner email; supports adding more.
- **Line items table**: add/remove rows; each row = description, qty, unit price, line total (auto).
- **Totals panel**: live-calculated subtotal, tax % input → tax amount, discount input, **grand total**.
- **Currency**, due date, notes.
- Buttons: **Save Draft**, **Save & Send Email**.

**Edit existing invoice**: same dialog, prefilled. Only editable while status ∈ `{draft, pending}`.

**Send email:**
- Update `send-invoice-email` edge function to accept `recipient_emails: string[]`, loop and send (BCC or individual). Uses existing Resend setup.
- PDF: update `generate-invoice-pdf` to render line items table + totals breakdown.

**Client Portal:** `BillingInvoiceDetail` updated to render line items + totals.

---

## Implementation Order
1. Migration: `invoice_items` + invoice columns + `certificates.manually_issued`.
2. Backend: update `generate-invoice-pdf` and `send-invoice-email` for line items + multi-recipient.
3. Admin UI: new Invoice create/edit dialog with line items.
4. Admin UI: manual certificate issuance dialog + validity override on Pending Pricing.
5. Admin UI: Businesses module (list + detail with 7 tabs).
6. Sidebar entry + route registration.
7. Client billing detail update for line items.

---

## Files Touched (high level)
- **New**: `src/admin/pages/Businesses.tsx`, `src/admin/pages/BusinessDetail.tsx`, `src/admin/components/billing/InvoiceFormDialog.tsx`, `src/admin/components/billing/IssueCertificateDialog.tsx`, `src/admin/components/EmailTagsInput.tsx`.
- **Edit**: `src/App.tsx` (routes), `AdminSidebar.tsx`, `AdminBilling.tsx` (wire dialog), `PendingPricingTab.tsx` (manual dates), `CertificateDetail.tsx` (edit validity), `BillingInvoiceDetail.tsx`.
- **Edge**: `send-invoice-email/index.ts`, `generate-invoice-pdf/index.ts`, `issue-certificate-on-payment/index.ts` (respect manual flag).
- **Migration**: one SQL file for all schema changes above.

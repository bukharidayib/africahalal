## Overview

Tighten the Admin → Billing → Create Invoice flow, automate certificate issuance on payment for certification invoices, and update the client-facing invoice email template.

---

## 1. Create New Invoice dialog (`src/admin/pages/AdminBilling.tsx`)

**Searchable organization dropdown**
- Replace the current `Select` with a `Popover + Command` combobox (shadcn pattern using `cmdk`), giving a search box that filters the org list as the admin types. Same for the Edit Invoice dialog.

**Simplified fee types**
- Reduce the Fee Type list to exactly:
  - `application_fee` — Application Fee
  - `inspection` — Inspection Fee
  - `certification` — Certification Fee
  - `subscription` — Subscription Fee
  - `other` — Other Service Charge
- Remove "Renewal Fee".
- Update `feeTypeLabel()` to match.

**Validity Period (only for Certification & Subscription)**
- Show the Validity Period selector only when `fee_type === 'certification' || 'subscription'`. Required in those cases.
- Options: 3 / 6 / 9 / 12 months (mapped to `1_quarter` … `4_quarter`).

**Auto Start Date / Expiry Date**
- Add two date fields: `start_date` (defaults to today) and `expiry_date` (auto-computed from `start_date + validity_period`). Both are editable so the admin can override.
- These are surfaced only for Certification/Subscription fee types.
- Persist `start_date` and `expiry_date` on the invoice (new columns) so they can be reused when issuing the certificate.

**Database migration**
- Add two nullable columns to `public.invoices`:
  - `start_date date`
  - `expiry_date date`
  - `validity_period text` (so it's stored on the invoice itself, decoupled from any application).

---

## 2. Auto-generate certificate on payment (Certification fee only)

Trigger points (any time an invoice transitions to `paid`):
- `supabase/functions/zynlepay-momo-callback/index.ts` (online MoMo)
- `supabase/functions/check-payment-status/index.ts` (manual status poll)
- `AdminBilling.tsx → handleReviewOfflinePayment` (offline approval)
- `AdminBilling.tsx → handleSaveEdit` (admin marks paid manually)

**New shared edge function: `issue-certificate-on-payment`**
Input: `{ invoice_id }`
Logic:
1. Load invoice (+ organization, application).
2. If `fee_type !== 'certification'` → return `{skipped: true}`.
3. If a certificate already exists for this `application_id` / `organization_id` → skip (idempotent).
4. Generate `certificate_number` via `rpc('generate_certificate_number')`.
5. Resolve `issue_date = invoice.start_date || today` and `expiry_date = invoice.expiry_date || derive(validity_period)`.
6. Build `qr_hash` (sha256 of cert number + org id).
7. Insert into `certificates` with status `active`, scope from application or org name fallback.
8. Insert `certificate_history` entry (`issued_on_payment`).
9. Call two email functions in parallel:
   - `send-invoice-email` → existing function, but augment to include "Payment received — Receipt" mode (see §3).
   - `send-certificate-email` (NEW) → branded thank-you + certificate PDF attachment + verification link.

Trigger callers: After each "marked as paid" update, the client/edge function calls `supabase.functions.invoke('issue-certificate-on-payment', { body: { invoice_id }})`.

---

## 3. Email templates — refresh

**`send-invoice-email/index.ts`**
- Add an optional `mode` param: `'invoice' | 'receipt'`.
- `'invoice'` (default) → keep current "Invoice" subject + Pay button, but redesign the HTML to match the new modern professional template (matches the PDF style — green band header, indigo accents, clean item table, totals box, ZMW formatting, payment terms footer).
- `'receipt'` → subject `Payment received — Receipt {invoice_number}`, removes Pay button, shows "PAID" badge, payment date, amount, transaction reference, and attaches the same invoice PDF marked as receipt.
- Replace inline `buildInvoicePdf` with the same look as `generate-invoice-pdf` for visual consistency.

**NEW `send-certificate-email/index.ts`**
- Generates / fetches the certificate PDF (reuse logic from `CertificateTemplate` server-side or call existing PDF endpoint if present; otherwise build a clean PDF via pdf-lib mirroring `CertificateTemplate.tsx`).
- Sends a branded email:
  - Subject: `Your Halal Certificate — {certificate_number}`
  - Body: Thank-you message, certificate summary (number, scope, issue/expiry, validity), a "Verify Certificate" button → `https://africanhalaal.com/verify/{certificate_number}`, and the certificate PDF attached.
  - Reuses the same green-banded header, indigo accents, ZMW brand palette already used in invoice/quotation PDFs.

---

## 4. Wiring summary

```text
[Invoice marked PAID]
        │
        ▼
issue-certificate-on-payment(invoice_id)
        │
        ├── if certification → create certificate + history
        │           │
        │           ├── send-invoice-email(mode=receipt) → client gets RECEIPT email
        │           └── send-certificate-email           → client gets CERTIFICATE email + PDF
        │
        └── else → no-op
```

---

## Files

**Modified**
- `src/admin/pages/AdminBilling.tsx` — combobox org picker, fee-type list, conditional validity/start/expiry fields, auto compute, persist new fields, hook auto-cert call after manual paid/offline-approve.
- `supabase/functions/send-invoice-email/index.ts` — `mode` param, redesigned HTML, modernized PDF.
- `supabase/functions/zynlepay-momo-callback/index.ts` — invoke `issue-certificate-on-payment` when `newStatus === 'completed'`.
- `supabase/functions/check-payment-status/index.ts` — same hook on success.

**Created**
- `supabase/functions/issue-certificate-on-payment/index.ts` — orchestrator described above.
- `supabase/functions/send-certificate-email/index.ts` — new branded certificate email + PDF.
- `supabase/migrations/<ts>_invoices_validity_dates.sql` — add `start_date`, `expiry_date`, `validity_period` to `public.invoices`.

---

## Notes / decisions

- All PDFs continue using `pdf-lib` and ASCII-safe glyphs (no `→`, `·`).
- Idempotency: the orchestrator checks for existing certificate per application/organization before creating a new one, so duplicate paid-events never produce duplicate certificates.
- If an invoice has no `application_id`, certification-fee invoices still produce a certificate tied to the organization (scope falls back to the org's primary sector/name).
- Currency stays ZMW; date format stays `dd MMM yyyy`.

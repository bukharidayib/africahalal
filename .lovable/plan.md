## Root Causes Identified

### 1. Invoice number generator is broken (causes all 3 "invoice_number null" errors)
The DB function `generate_invoice_number()` reads:
```
SUBSTRING(invoice_number FROM 11)  -- expects "AHIS-INV-" (10 chars)
```
But the actual prefix is `AHIS-INV-YYYY-` (14 chars). When it tries to parse `"026-00001"` as INTEGER, it throws `22P02 invalid input syntax`. The frontend catches no `error` from `supabase.rpc()` because the destructuring `{ data: invNum }` ignores the error → `invNum` becomes `null` → insert fails with the NOT NULL constraint violation.

This affects:
- **Set Pricing dialog** (`PendingPricingTab.tsx`)
- **Create New Invoice dialog** (`AdminBilling.tsx`)
- **Subscriptions "Invoice Now" button** (`SubscriptionsTab.tsx`)
- **Quotations "To Invoice"** (`QuotationsTab.tsx`)

### 2. Quotation number generator has the same bug
`generate_quotation_number()` uses `SUBSTRING FROM 11` but `AHIS-QUO-YYYY-` is 14 chars. Saving a quotation succeeds the first time (seq=1 fallback) but breaks afterwards. Sending also fails when the org has no `contact_email`.

### 3. Send-quotation-email returns 500
Edge function throws `"Organization has no contact email"` when the linked org's `contact_email` is null. The frontend swallowed the message into a generic "non-2xx" toast.

---

## Fix Plan

### A. Database migration (fix both number generators)
```sql
CREATE OR REPLACE FUNCTION public.generate_invoice_number() ...
  -- 'AHIS-INV-' (9) + 'YYYY-' (5) = 14 → SUBSTRING FROM 15
  SELECT COALESCE(MAX(CAST(SUBSTRING(invoice_number FROM 15) AS INTEGER)), 0) + 1 ...
  WHERE invoice_number ~ ('^AHIS-INV-' || _year || '-[0-9]+$')

CREATE OR REPLACE FUNCTION public.generate_quotation_number() ...
  -- 'AHIS-QUO-' (9) + 'YYYY-' (5) = 14 → SUBSTRING FROM 15
  SELECT COALESCE(MAX(CAST(SUBSTRING(quotation_number FROM 15) AS INTEGER)), 0) + 1 ...
  WHERE quotation_number ~ ('^AHIS-QUO-' || _year || '-[0-9]+$')
```
Using a regex WHERE filter also makes the function safe against any legacy malformed numbers.

### B. Frontend hardening (4 files)
In every `supabase.rpc('generate_invoice_number')` / `generate_quotation_number` call:
- Destructure both `{ data, error }`, throw on error, throw if data is null.
- Files: `PendingPricingTab.tsx`, `AdminBilling.tsx` (handleCreateInvoice), `SubscriptionsTab.tsx` (handleGenerateInvoice), `QuotationsTab.tsx` (handleSave + handleConvert).

### C. Send-invoice-email / send-quotation-email
- Surface a **clear toast** to the user when the org has no contact email (instead of generic 500), and offer to fall back to the organization's `profiles` user email if `organizations.contact_email` is null. Update both edge functions to also try `profiles.email` for the org owner as a fallback recipient.

### D. Client payment via API (already wired — verify + improve email CTA)
The client portal already has `MoMoPaymentDialog` calling `process-momo-payment` from `/client/billing/invoices/:id` (`BillingInvoiceDetail.tsx`). 
- Update the invoice email HTML in `send-invoice-email/index.ts` so the **Pay Online** button deep-links to `https://africahalal.lovable.app/client/billing/invoices/{invoice_id}` instead of just the homepage.
- That page already shows the invoice + Pay button → MoMo flow → `process-momo-payment` → `zynlepay-momo-callback` → marks invoice paid.

---

## Files To Change

**Database**
- New migration: replace `generate_invoice_number()` and `generate_quotation_number()` with corrected SUBSTRING offset + regex guard.

**Frontend**
- `src/admin/pages/AdminBilling.tsx` — check rpc error/null in `handleCreateInvoice`.
- `src/admin/components/accountant/PendingPricingTab.tsx` — same in `handleSubmit` (2 rpc calls).
- `src/admin/components/accountant/SubscriptionsTab.tsx` — same in `handleGenerateInvoice`.
- `src/admin/components/accountant/QuotationsTab.tsx` — same in `handleSave` + `handleConvert`.

**Edge functions**
- `supabase/functions/send-invoice-email/index.ts` — fallback to organization profile email; deep-link CTA to `/client/billing/invoices/{id}`.
- `supabase/functions/send-quotation-email/index.ts` — fallback recipient resolution + clearer error.

---

## Expected Result
- Set Pricing dialog → creates invoice + (optional) subscription + emails PDF with working "Pay Online" link.
- Create New Invoice → succeeds, emails client.
- Subscriptions "Invoice now" → succeeds.
- Quotations save / send / convert → all succeed; if no contact email, user sees an actionable message.
- Client receives email → clicks "Pay Online" → lands on invoice detail page → pays via Mobile Money (ZynlePay).

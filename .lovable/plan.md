
# Accountant Module — Full Financial Workflow

Rename **Billing & Invoices** to **Accountant** and turn it into the single module that controls all money flows: per-application pricing (set manually by admin), recurring subscriptions, quotations, and invoice delivery with PDF attachments.

---

## 1. Database changes

**New tables**
- `subscriptions` — `id, organization_id, application_id (nullable), plan_name, billing_cycle ('monthly'|'quarterly'|'yearly'), amount, currency ('ZMW'), status ('active'|'paused'|'cancelled'|'expired'), start_date, next_billing_date, end_date, created_by, created_at, updated_at, notes`. RLS: clients read own (via organization), admins with `canViewFinance` manage.
- `quotations` — `id, quotation_number (auto AHIS-QUO-YYYY-NNNNN), organization_id, business_id (nullable), application_id (nullable), title, items jsonb (array of {label, qty, unit_price, total}), subtotal, tax, total, currency, valid_until, status ('draft'|'sent'|'accepted'|'rejected'|'expired'|'converted'), notes, sent_at, accepted_at, converted_invoice_id, created_by, created_at, updated_at`. RLS same model.
- `generate_quotation_number()` SECURITY DEFINER function (mirrors `generate_invoice_number`).

**Modify `invoices`**
- Add `subscription_id uuid` (nullable, FK to subscriptions).
- Add `quotation_id uuid` (nullable).
- Allow `fee_type` value `'subscription'` (already free text).
- Index on `subscription_id`, `quotation_id`.

**Modify `certification_applications`**
- Update `validity_period` semantics to support `'1_quarter' | '2_quarter' | '3_quarter' | '4_quarter'`. Stored as text — no schema change needed, but migrate any existing `'6_months'`/`'1_year'` values to `'2_quarter'`/`'4_quarter'` for consistency.
- `application_fee` stays nullable; admin sets it post-submission.

**RLS** — append-only audit pattern; finance/admin roles can insert/update; clients can only SELECT rows scoped to their organization.

---

## 2. Client portal — Application flow cleanup

`src/pages/client/CertificationApplication.tsx`:

1. **Remove fixed fees** from "Select Business Category" — strip the `ZMW {fee}` badge and remove `application_fee` updates. Drop the `BUSINESS_CATEGORY_FEES` import + `src/lib/applicationFees.ts` references in this page.
2. **Replace validity period** options with 4 quarter cards: `1 Quarter (3 months)`, `2 Quarters (6 months)`, `3 Quarters (9 months)`, `4 Quarters (12 months)`. Default `2_quarter`.
3. **Remove the Payment step (Step 6)** from the in-application flow. Steps become: Establishment → Scope → Products → Documents → Declaration → **Submit**.
4. On submission, set application `status = 'submitted'` and `application_fee = null` (admin will price it). Show a confirmation screen telling the client: "Your application is awaiting pricing from the Accountant team. You will receive an invoice by email."
5. Remove the inline invoice creation that currently happens in `handleAdvanceToPayment` — invoice is now created by admin from the Accountant module.

`src/components/billing/MoMoPaymentDialog.tsx` continues to work for paying invoices that arrive later (from BillingDashboard).

---

## 3. Admin "Accountant" module

Rename existing route `/admin/billing` → keep route for back-compat but relabel sidebar and page header to **Accountant** (`src/admin/components/layout/AdminSidebar.tsx`, `src/admin/pages/AdminBilling.tsx`). Replace icon `Receipt` with `Calculator`. Rename file to `AdminAccountant.tsx` (update App.tsx import).

Add tabs to the page (the file already uses `Tabs`):

### Tab A — Invoices (existing, enhanced)
- Existing list stays. Add filter chip for `fee_type = subscription`.
- "Create Invoice" dialog gains:
  - **Application picker** (autocomplete by application number) — when chosen, prefills organization and shows app summary.
  - **Fee type**: `application_fee | subscription | inspection | renewal | other`.
  - **Validity period** (when `application_fee`): quarter dropdown, written back to `certification_applications.validity_period` and `application_fee`.
  - **Subscription link** (when `subscription`): pick existing subscription.
  - **Send by email** checkbox (default on) — generates PDF and emails invoice to org `contact_email`.

### Tab B — Pending Pricing (new)
- Lists `certification_applications` where `status='submitted'` and no invoice yet.
- Each row: "Set Price & Send Invoice" → opens a streamlined form (category context, validity period quarter selector, application fee amount, optional subscription bundle: cycle + amount, due date, notes). Single submit creates one or two invoices and emails them.

### Tab C — Subscriptions (new)
- List subscriptions with status badges and next billing date.
- Create/Edit dialog: organization, optional application, plan name, billing cycle (monthly/quarterly/yearly), amount, start date, end date, notes.
- Action: "Generate Invoice Now" creates an invoice tied to the subscription and advances `next_billing_date` by the cycle.

### Tab D — Quotations (new)
- List quotations with status badges.
- Create dialog: organization, optional business/application, title, line items (label, qty, unit price — auto-totals), tax %, valid-until date, notes.
- Actions: **Send** (emails PDF quote, sets `status='sent'`), **Convert to Invoice** (creates invoice from totals, links both ways, sets `status='converted'`), **Mark Accepted/Rejected**.

### Tab E — Payment Transactions, Tab F — Offline Payments
Keep as-is from current AdminBilling.

---

## 4. Invoice & Quotation PDF + Email

**New edge function `generate-invoice-pdf`** (Deno + `pdf-lib`):
- Input: `{ invoice_id }`. Loads invoice + organization + application (if any) + line items derived from invoice. Renders branded AHI PDF (logo, invoice #, dates, bill-to, item table, totals, payment instructions, footer). Returns base64 PDF.

**New edge function `generate-quotation-pdf`**: mirrors the above for quotations with line-item table.

**New edge function `send-invoice-email`**:
- Input: `{ invoice_id }`. Calls `generate-invoice-pdf` internally, then sends through existing Resend setup (`RESEND_API_KEY` already present) with PDF attachment to org `contact_email`. Subject: `Invoice {number} from African Halal Institute`. Logs to `invoice_activity_log` (`action='invoice_emailed'`).

**New edge function `send-quotation-email`**: same pattern for quotations.

Admin "Send invoice" / "Send quotation" buttons invoke these. Client-side download buttons (in `BillingInvoiceDetail.tsx` and a new quotation detail) call `generate-*-pdf` and trigger browser download.

---

## 5. Client portal additions

- `BillingDashboard` and `BillingInvoices` already list invoices — no rename needed (client-facing label stays "Billing & Payments").
- Add **Subscriptions** card on `BillingDashboard` showing active subscriptions + next billing date.
- Add **Quotations** page `/client/billing/quotations` listing org quotations with view/accept/reject buttons.
- Each invoice row gets "Download PDF" calling `generate-invoice-pdf`.

---

## 6. Files touched

**New**
- `supabase/migrations/<ts>_accountant_module.sql` (subscriptions, quotations, generate_quotation_number, invoice FK columns, validity migration).
- `supabase/functions/generate-invoice-pdf/index.ts`
- `supabase/functions/generate-quotation-pdf/index.ts`
- `supabase/functions/send-invoice-email/index.ts`
- `supabase/functions/send-quotation-email/index.ts`
- `src/admin/pages/AdminAccountant.tsx` (renamed from AdminBilling.tsx, new tabs)
- `src/admin/components/accountant/PendingPricingTab.tsx`
- `src/admin/components/accountant/SubscriptionsTab.tsx`
- `src/admin/components/accountant/QuotationsTab.tsx`
- `src/pages/client/BillingQuotations.tsx`

**Modified**
- `src/pages/client/CertificationApplication.tsx` — remove fees & payment step, quarter validity, submission UX.
- `src/admin/components/layout/AdminSidebar.tsx` — rename to "Accountant", icon `Calculator`.
- `src/App.tsx` — route + import update, new `/client/billing/quotations` route.
- `src/pages/client/BillingDashboard.tsx` — subscriptions block + PDF download.
- `src/pages/client/BillingInvoices.tsx` / `BillingInvoiceDetail.tsx` — PDF download button.
- `src/lib/applicationFees.ts` — kept for category labels only (fees become 0/decorative) or deleted; categories source moves to a simple labels list.

---

## 7. Open question

Should **clients be able to accept a quotation in-portal** (one-click "Accept → auto-convert to invoice"), or is acceptance handled offline and admin manually converts? Default plan: client can Accept/Reject; admin still does the actual conversion to invoice to keep finance control. Adjust if you want full auto-conversion.

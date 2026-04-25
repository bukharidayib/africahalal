# Fixes & Enhancements: Business Hub, Invoicing, Accountant Cleanup

## 1. Fix "No Business Found" in Admin → Businesses

**Root cause:** The `client_businesses` table only has RLS policies for the owning user (`auth.uid() = user_id`). Admins are blocked from `SELECT`, so the page returns an empty list even though 5 businesses exist in the DB.

**Fix:** Add an admin SELECT policy.

```sql
CREATE POLICY "Admins can view all businesses"
ON public.client_businesses FOR SELECT
TO authenticated
USING (is_admin_user(auth.uid()));

CREATE POLICY "Admins can update businesses"
ON public.client_businesses FOR UPDATE
TO authenticated
USING (is_admin_user(auth.uid()));
```

Also confirm the join queries (`profiles`, `certificates`, `certification_applications`, `invoices`) load — RLS already permits admin reads on those.

## 2. Remove "Subscriptions" tab in Accountant module

In `src/admin/pages/AdminBilling.tsx`:
- Remove `<TabsTrigger value="subscriptions">` and its `<TabsContent>`.
- Remove the `SubscriptionsTab` import and the `Repeat` icon if unused.

## 3. Modern, beautiful Invoice (PDF + Client view) with multi-items

**Note:** The reference invoice you mentioned didn't come through as an attachment. I'll design a clean, modern professional template — typical AHI brand: serif headline, generous whitespace, two-column header (issuer left / billed-to right), boxed totals panel, line-item table with zebra rows, footer with payment instructions and thank-you note. If you want a specific look, please re-attach the image and I'll match it.

### 3a. PDF (`supabase/functions/generate-invoice-pdf/index.ts`)
Redesign HTML/CSS to:
- Header: AHI logo + brand mark on left, big "INVOICE" wordmark + invoice # / dates on right.
- Two cards: **From** (Africa Halal Inspectorate) and **Bill To** (organization name, address, recipient emails).
- Line-items table: # · Description · Qty · Unit Price · Line Total.
- Right-aligned totals box: Subtotal, Discount, Tax (with rate), **Grand Total** highlighted in brand green.
- Notes section + payment instructions (MoMo / bank).
- Footer with website, contact, and "Thank you for your business".
- Status watermark when `paid` / `overdue` / `cancelled`.

### 3b. Admin invoice form (`InvoiceFormDialog.tsx`)
Already supports multi-line items, tax %, discount, multi-recipient emails — keep but:
- Add a **Live Preview** panel (side panel or "Preview" button) rendering the same modern layout so admins see exactly what the client gets before sending.
- Wire "Send" to the existing `send-invoice-email` function (already supports `recipient_emails[]`).

### 3c. Client invoice view (`src/pages/client/BillingInvoiceDetail.tsx`)
Redesign to mirror the new PDF layout:
- Replace single-line amount display with the full line-item table (load from `invoice_items`).
- Add the same totals panel (subtotal / discount / tax / grand total).
- Keep existing MoMo "Pay Now" CTA and payment-attempts history below the invoice card.

## 4. Manual validity / subscription duration inside Business Hub

In `src/admin/pages/BusinessDetail.tsx`:
- **Certificates tab:** add an "Edit validity" action on each certificate row → dialog to update `issue_date` and `expiry_date` manually (admin-only via `certificates.update` permission).
- **Applications tab:** when issuing a certificate via `IssueCertificateDialog`, validity dates are already manual — confirmed.
- **New "Subscription" mini-section per business** (inside Overview tab): shows current active certificate's expiry as the subscription end date, with a "Set/Extend" button that updates `expiry_date` directly. No automatic recurring logic — fully manual as requested.

## Files to change

- `supabase/migrations/<new>.sql` — admin RLS on `client_businesses`
- `src/admin/pages/AdminBilling.tsx` — remove Subscriptions tab
- `src/admin/components/billing/InvoiceFormDialog.tsx` — add live preview
- `src/admin/components/billing/InvoicePreview.tsx` *(new)* — shared modern invoice JSX used by preview + client detail
- `src/pages/client/BillingInvoiceDetail.tsx` — render modern layout + line items
- `src/admin/pages/BusinessDetail.tsx` — manual validity edit dialog + subscription panel
- `src/admin/components/billing/EditValidityDialog.tsx` *(new)*
- `supabase/functions/generate-invoice-pdf/index.ts` — redesigned HTML template

## Out of scope (ask if you want them)
- Automated subscription billing / renewal reminders (you asked for manual control).
- Stripe/Paddle — keeping current ZynlePay MoMo flow.

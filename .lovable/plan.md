## Root cause of the invoice errors

The `invoices.fee_type` CHECK constraint currently only allows:
`'certification' | 'renewal' | 'inspection' | 'other'`

But the code inserts these values:
- `PendingPricingTab` → `'application_fee'` and `'subscription'`
- `SubscriptionsTab` → `'subscription'`
- `QuotationsTab` → `'other'` (this one passes)
- `AdminBilling` "Create New Invoice" → defaults to `'certification'` (passes), but the **same insert silently allows** other unsupported flows

That mismatch produces `invoices_fee_type_check` violations on every Set Pricing, Subscription "Invoice Now" and bundled-subscription action.

## Fix plan

### 1. Database migration — widen the `fee_type` constraint
Drop the existing CHECK and recreate with the full set of values used by the app:
```sql
ALTER TABLE public.invoices DROP CONSTRAINT invoices_fee_type_check;
ALTER TABLE public.invoices ADD CONSTRAINT invoices_fee_type_check
  CHECK (fee_type IN (
    'application_fee','certification','renewal',
    'inspection','subscription','quotation','other'
  ));
```
No data backfill needed (existing rows already use the legacy values).

### 2. Redesign the "Set Pricing" dialog (`PendingPricingTab.tsx`)

New form fields in this order:
1. **Business Name** — read-only input, auto-populated from `pricingApp.organizations.name`.
2. **Recipient Emails** — multi-email input (chip-style: type/paste, press Enter or comma to add; backspace removes). Pre-fills with `organizations.contact_email` if present. Validates each entry as email. At least one required.
3. **Validity Period** — dropdown using existing `VALIDITY_OPTIONS` (1–4 quarters). Labeled clearly as "Certificate Validity Period (once issued)".
4. **Application Fee (ZMW)** — numeric input with `ZMW` prefix adornment.
5. **Start Date** — date input, defaults to today (`new Date().toISOString().slice(0,10)`). Used as the invoice issue/start date and stored on the application as `pricing_start_date` (or surfaced via existing `created_at`; we'll keep it on the invoice description metadata to avoid schema bloat unless you want a dedicated column).
6. **Due Date** — kept (defaults to start date + 7 days, recomputes when Start Date changes).
7. **Description** — textarea, prefilled with `Halal certification application fee — {application_number}`.

Removed:
- The entire "Bundle a recurring subscription" block and its sub-fields.
- The single contact-email preview chip (replaced by the multi-email field).

Submission changes:
- Insert one invoice with `fee_type: 'application_fee'` (now allowed by the new constraint).
- Pass the multi-email list to `send-invoice-email` as `recipient_emails: string[]` (override). Edge function will use that list when provided, falling back to organization/profile resolution otherwise.

### 3. Edge function update — `send-invoice-email`
- Accept optional `recipient_emails: string[]` in the request body.
- If provided and non-empty, validate each, dedupe, and use as `to` (skip the `resolveRecipient` fallback). Audit log records the explicit list and source `'manual_override'`.
- Keep existing behavior when not provided.

### 4. Modern, clean email templates (HTML)
Rebuild the HTML in both `send-invoice-email` and `send-quotation-email` with a unified, premium, mobile-friendly layout:
- 600px centered card on a soft neutral background (`#f5f5f4`)
- Navy header (`#0f2e57`) with AHI wordmark + small tagline
- Gold accent bar (`#c79e3b`) under the header
- Clear "Invoice Summary" / "Quotation Summary" panel: Invoice #, Date, Due/Valid Until, Amount (large, gold)
- Itemized table for quotation items
- Prominent CTA button ("Pay Invoice" → links to client billing portal; "Review Quotation" → client portal)
- Footer: contact details, address, automated-message disclaimer
- Inline CSS only (Gmail/Outlook safe), table-based structure for compatibility, alt text on logo, dark-mode color hints via `@media (prefers-color-scheme: dark)`

### 5. Verification
- After migration, retry: Set Pricing → Create Invoice; Subscriptions → Invoice Now; Create New Invoice. All should succeed.
- Quotations sending continues to work and uses the new template.
- Audit log entries include the recipient list and source.

## Files to change
- `supabase/migrations/<new>.sql` — widen CHECK constraint
- `src/admin/components/accountant/PendingPricingTab.tsx` — new form (multi-email chip input, business name read-only, start date, removed subscription bundle)
- `supabase/functions/send-invoice-email/index.ts` — accept `recipient_emails`, new HTML template
- `supabase/functions/send-quotation-email/index.ts` — new HTML template (matching style)

No changes needed to `SubscriptionsTab` or `AdminBilling` create-invoice — the constraint widening alone unblocks them.

## Open question
The "Start Date" you described — should it be persisted as a dedicated `start_date` column on `invoices`, or is it acceptable to use it only as the invoice issue date (stored implicitly via `created_at` and shown in the description)? I'll go with the implicit approach unless you say otherwise, to avoid extra schema churn.
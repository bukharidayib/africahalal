## Goal

Make quotations work for ANY recipient (registered org or not) by replacing the Organization dropdown with free-text customer fields, and rebuild the PDF template to match the attached AHI Halal design (green header table, logo top-right, totals row).

---

## 1. Database changes

Add optional customer fields to `quotations` and make `organization_id` nullable so quotes can be issued without a registered business.

```sql
ALTER TABLE public.quotations
  ALTER COLUMN organization_id DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS customer_name text,
  ADD COLUMN IF NOT EXISTS customer_email text,
  ADD COLUMN IF NOT EXISTS customer_address text;

-- ensure at least one identifier present
ALTER TABLE public.quotations
  ADD CONSTRAINT quotations_customer_or_org_chk
  CHECK (organization_id IS NOT NULL OR customer_name IS NOT NULL);
```

RLS for accountants/admins already covers all rows — no policy change needed. Client-facing visibility (already keyed on `organization_id`) stays as-is; ad-hoc customer quotes simply won't appear in any client portal (intended).

## 2. New Quotation / Edit Quotation dialog (`QuotationsTab.tsx`)

Replace the **Organization** Select with plain inputs:

- `Customer Name *` — text input (required)
- `Customer Email` — text input (auto-filled into recipient_emails when added)
- `Customer Address` — textarea (optional, shown on PDF)
- Remove the `orgs` fetch + the prefill effect
- `handleSave` payload sends `customer_name/email/address` instead of `organization_id` (set `organization_id: null`)
- Validation: require `customer_name`, `title`, line items
- Table "Client" column → show `q.customer_name ?? q.organizations?.name ?? '—'` (keeps backward compat with old org-linked quotes)

The Edit dialog is the same component (already mode-aware) so it inherits all changes automatically.

## 3. PDF template rebuild (`generate-quotation-pdf/index.ts`)

Match the attached design:

- **Logo top-right**: embed `public/logo.png` (fetched as bytes inside the edge function from the deployed origin, or bundled as base64 constant) at ~110×110pt
- **Title**: `Quotation#<number>` large bold, top-left
- **Left vertical green accent bar** down the page edge (matches reference)
- **Customer block** (left): `Customer` label bold + customer name. **Date / ValidUntil** stacked on right
- **Items table** with:
  - Header row filled solid green (`#0F4D2A` ≈ AHI brand) with cream/off-white text — columns `Description | Quantity | Price | Total`
  - Body rows: support items that are pure description-only (qty/price/total optional/blank), so multi-line "Monthly Subscription Fee" sections render cleanly
  - Bottom row: right-aligned **TOTAL: K<amount>** underlined
- **Page 2 / footer block**:
  - Terms & Conditions bullet lines (static)
  - Subtotal / TotalTax / Other / Total stacked
  - Signature + Date signed lines
  - Footer centred: `African Halaal Institute` + `www.africanhalaal.com`
- Currency prefix becomes `K` (Kwacha) not `ZMW ` to match reference; keep `q.currency` data unchanged
- Recipient block reads from `customer_name/email/address` first, falls back to `organizations.*` for legacy quotes
- Brand color constant: `green = rgb(0.06, 0.30, 0.16)` (AHI dark green from the logo)

## 4. Email function (`send-quotation-email/index.ts`)

- `resolveRecipient` updated: prefer `quotation.customer_email`, then `recipient_emails[]`, then `organizations.contact_email`, then linked profile email
- `orgName` falls back to `quotation.customer_name`
- Subject/body templates use customer_name when org is null

## 5. Files touched

- `supabase/migrations/<new>.sql` — schema changes above
- `src/admin/components/accountant/QuotationsTab.tsx` — dialog + table column
- `supabase/functions/generate-quotation-pdf/index.ts` — full template rewrite + logo embed
- `supabase/functions/send-quotation-email/index.ts` — recipient resolution

## Open question

The reference PDF shows item rows with **no qty/price** (the "Monthly Subscription Fee" sub-bullets). The current data model requires `qty` per item. Plan: in the dialog, allow `qty=0` and `unit_price=0` for description-only rows, and the PDF will render those rows with blank Qty/Price/Total cells. Is that acceptable, or should we add an explicit "section heading" item type?

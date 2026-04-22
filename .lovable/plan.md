

## Add Transaction History to Invoice Details + Expand Status Codes

### 1. Expand response code mapping in `supabase/functions/check-payment-status/index.ts`
Map all callback + transaction codes from the docs (not just 100/990/995/9902):

- `100` → completed ("Transaction successful")
- `120` → pending ("Transaction initiated")
- `990` → pending ("Transaction pending")
- `995` → failed ("Transaction failed")
- `2000` → failed ("No active simulator for this phone number")
- `9901` → failed ("Merchant not found")
- `9902` → failed ("Requesting device IP not whitelisted / wrong API credentials")
- `9903` → failed ("Invalid merchant API credentials or setup not complete")
- `9904` → failed ("Duplicate reference number detected")
- `9905` → failed ("Invalid sender ID / mobile number")
- `9906` → failed ("Duplicate reference number")
- `9907` → failed ("Mobile number blacklisted")
- `9908`–`9910` → failed (merchant setup incomplete)
- `9911` → failed ("Insufficient merchant balance")
- `9912` → failed ("Amount exceeds disbursement limit")
- `9913` → failed ("Invalid bank name")
- `9914` → pending ("Cannot determine status now, try again later")
- Any other code → failed with the gateway's `response_description`

The function will continue to return `{ status, message, response_code, response_description, reference_no }` and update `payment_transactions` + flip the invoice to `paid` on success — no schema changes.

### 2. Add a "Transaction History" section in `src/pages/client/BillingInvoiceDetail.tsx`
Below the existing **Invoice Details** card (or as a new full-width card under the grid), add a card titled **"Payment Attempts"** that shows every row from `payment_transactions` for this invoice belonging to the current user.

Columns shown per attempt:
- Date & time (`created_at`, formatted `dd MMM yyyy, HH:mm`)
- Reference (`zynlepay_reference` or `transaction_reference`)
- Method (`payment_method`, e.g. "MTN MoMo", "Airtel Money")
- Amount (with currency)
- Status badge: `completed` (green/default), `pending` (secondary), `failed` (destructive)
- Gateway message: extracted from `gateway_response.response_description` when present

Empty state: "No payment attempts yet."

Fetch alongside the existing invoice + activity log query in `fetchInvoice()`:
```ts
supabase
  .from('payment_transactions')
  .select('id, created_at, zynlepay_reference, transaction_reference, payment_method, amount, currency, status, gateway_response')
  .eq('invoice_id', id!)
  .order('created_at', { ascending: false })
```

Use the existing `Table` UI component (from `@/components/ui/table`) so it matches the institutional look already used elsewhere.

### Files touched
- `supabase/functions/check-payment-status/index.ts` — expanded code mapping only
- `src/pages/client/BillingInvoiceDetail.tsx` — new "Payment Attempts" table card + extra fetch

### Out of scope
- No DB schema changes (existing `payment_transactions` columns are sufficient)
- No changes to `process-momo-payment`, polling logic, or the MoMo dialog (already implemented last loop)
- No admin-side history view (this plan is client-portal only, per the request)


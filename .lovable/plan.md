

# Integrate ZynlePay Mobile Money Payment into Client Portal

## Overview
Add a "Pay Now" button on pending/overdue invoices that opens a payment dialog where clients enter their mobile number. The payment is processed via ZynlePay's MoMo Deposit API (production). A Supabase Edge Function handles the API call securely (secrets never exposed to the client).

## Architecture

```text
Client (Invoice Detail)
  → "Pay Now" button → Payment Dialog (phone number input)
  → supabase.functions.invoke("process-momo-payment")
  → Edge Function (has ZynlePay secrets)
  → POST https://payments.zynlepay.com/zynlepay/jsonapi/
  → Response stored in payment_transactions table
  → Poll for status via callback or manual check
```

## Secrets Needed (stored in Supabase Edge Function secrets)
The user will need to provide:
- `ZYNLEPAY_MERCHANT_ID`
- `ZYNLEPAY_API_ID`  
- `ZYNLEPAY_API_KEY`
- `ZYNLEPAY_CHANNEL` (likely "momo")

## Changes

### 1. Edge Function: `supabase/functions/process-momo-payment/index.ts`
- Accepts: `invoice_id`, `phone_number`, `amount`
- Validates JWT (authenticated user)
- Verifies the invoice belongs to the user and is pending/overdue
- Generates unique `reference_no` from invoice number
- Calls ZynlePay production endpoint with merchant credentials
- Records transaction in `payment_transactions` table with `gateway_response`
- Returns response to client

### 2. Edge Function: `supabase/functions/check-payment-status/index.ts`
- Accepts: `transaction_id` or `reference_no`
- Calls ZynlePay Payment Status endpoint to check if payment completed
- Updates `payment_transactions.status` and `invoices.status` accordingly

### 3. UI: Payment Dialog on `BillingInvoiceDetail.tsx`
- Add "Pay Now with Mobile Money" button (visible only for pending/overdue invoices)
- Dialog with phone number input (Zambian format validation: 09xx or 07xx, 10 digits)
- Shows amount and invoice number
- Loading state while processing
- Success/pending/error feedback with transaction reference

### 4. UI: Payment status indicator on `BillingDashboard.tsx`
- Add "Pay" action button on pending/overdue invoices in the recent invoices table

### 5. Database Migration
- Add `zynlepay_transaction_id` and `zynlepay_reference` columns to `payment_transactions` for tracking

## Technical Details

**ZynlePay API Request Body:**
```json
{
  "auth": {
    "merchant_id": "<from secret>",
    "api_id": "<from secret>",
    "api_key": "<from secret>",
    "channel": "momo",
    "sender_id": "<client phone number>",
    "reference_no": "<invoice_number>",
    "amount": "<invoice amount>"
  }
}
```

**Response Codes:**
- `120` = Transaction initiated (show "pending, check your phone")
- `100` = Successful
- `995` = Failed
- `9902` = Wrong credentials
- `9906` = Duplicate reference

**Security:**
- All API keys stored as Supabase Edge Function secrets, never in client code
- Phone number validated with zod (10-digit Zambian format)
- Invoice ownership verified server-side before processing
- Transaction logged in `payment_transactions` with full gateway response

## Implementation Order
1. Add secrets (will request from user)
2. Database migration (add tracking columns)
3. Create `process-momo-payment` edge function
4. Create `check-payment-status` edge function
5. Update `BillingInvoiceDetail.tsx` with payment dialog
6. Update `BillingDashboard.tsx` with pay button


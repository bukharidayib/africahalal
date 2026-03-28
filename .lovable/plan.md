

# Payment Pages + Fix ZynlePay Response Parsing + MoMo Callback Endpoint

## Three Issues

### 1. ZynlePay Response Parsing Bug (Critical)
The network logs show `response_code: "[object Object]"`. The edge function does `String(zynleResult?.response || zynleResult?.code || "")` — but `zynleResult.response` is likely a nested object (not a string/number). This causes every payment to fail.

**Fix in `supabase/functions/process-momo-payment/index.ts`:**
- Log the full raw response for debugging
- Extract the response code more carefully: check if `response` is an object with a `code` property, handle nested structures
- Same fix needed in `check-payment-status/index.ts`

### 2. Frontend Payment Result Pages
From the ZynlePay config, two client-facing URLs are needed:
- `https://africanhalaal.com/payment/success`
- `https://africanhalaal.com/payment/failed`

**New files:**
- `src/pages/PaymentSuccess.tsx` — Shows success confirmation with invoice reference, link to billing dashboard
- `src/pages/PaymentFailed.tsx` — Shows failure message with retry option, link back to billing

**Update `src/App.tsx`** — Add routes for `/payment/success` and `/payment/failed`

### 3. MoMo Deposit Callback Edge Function
ZynlePay sends async payment status updates to `https://api.africanhalaal.com/payments/zynle/momo/deposit/callback`. Since this is a Supabase project, the actual callback URL should be the Supabase edge function URL.

**New file: `supabase/functions/zynlepay-momo-callback/index.ts`**
- Receives POST from ZynlePay with payment result
- Looks up transaction by reference number
- Updates `payment_transactions` status
- If successful, marks invoice as paid
- No JWT verification (external webhook)

**Note:** You'll need to update your ZynlePay MoMo Deposit Callback URL to point to your Supabase edge function: `https://xdixdqyzjfdqummwpuzg.supabase.co/functions/v1/zynlepay-momo-callback`

## Files

| Action | File |
|--------|------|
| Edit | `supabase/functions/process-momo-payment/index.ts` — fix response code parsing |
| Edit | `supabase/functions/check-payment-status/index.ts` — fix response code parsing |
| Create | `src/pages/PaymentSuccess.tsx` |
| Create | `src/pages/PaymentFailed.tsx` |
| Create | `supabase/functions/zynlepay-momo-callback/index.ts` |
| Edit | `src/App.tsx` — add payment result routes |
| Edit | `supabase/config.toml` — add callback function config |




## Fix `check-payment-status` Edge Function

### Problem
ZynlePay returns response code **9901 "Invalid method"** when the status check runs. The function sends `getBillStatus` (for MoMo) or `getTranStatus` (for cards), but ZynlePay's status API does not recognize these method names — so we never get back the real status codes (100/990/995/9902).

### Root cause
The method names used in `check-payment-status/index.ts` are incorrect. The original payment in `process-momo-payment` successfully uses `runBillPayment`, but the status check needs ZynlePay's documented status-check method name.

### Plan

1. **Fix the method name in `supabase/functions/check-payment-status/index.ts`**
   - Replace the conditional `getBillStatus`/`getTranStatus` with the correct ZynlePay status method (most likely `getTransactionStatus` for both MoMo and card, since ZynlePay uses a single status endpoint).
   - Keep `service_id: "1002"` and the same auth/payload structure that already works in `process-momo-payment`.

2. **Expand response code handling** to match ZynlePay's documented codes:
   - `100` → completed (success)
   - `120` / `990` (when "still processing") → pending
   - `995` → failed (transaction failed)
   - `9902` → failed + log credential error (wrong API credentials — surface a clear admin message)
   - `9901` → failed + log "invalid method" (so we catch this regression in the future)
   - Any other non-empty code → failed with the description from ZynlePay

3. **Always return a structured response to the client** so the MoMo Payment Dialog can display the actual ZynlePay `response_code` and `response_description` (instead of a silent "still pending"). Include:
   ```json
   { "status": "...", "message": "...", "response_code": "...", "response_description": "..." }
   ```

4. **Add clearer logging** of the outgoing payload (method + reference_no) so future debugging shows exactly what was sent to ZynlePay.

5. **Redeploy** `check-payment-status` and test by clicking "Check Status" in the MoMo Payment Dialog on `/client/billing`. Verify the edge function logs now show a valid response code (100/120/990/995) instead of 9901.

### Files touched
- `supabase/functions/check-payment-status/index.ts` (method name + response code mapping + richer client response)

### What stays the same
- Auth flow, transaction lookup, RLS, invoice/application status updates on success — all unchanged.
- `process-momo-payment` is working correctly per logs (returns code 120 "Transaction is initiated"), so it is NOT modified.


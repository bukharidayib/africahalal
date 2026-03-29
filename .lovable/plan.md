

# Fix ZynlePay "Invalid Method" (9901) Error

## Root Cause

The ZynlePay API expects a specific payload structure with THREE sections: `auth`, `data`, and `userdata`. Our current edge function puts everything inside `auth` only, and is missing the `method` field entirely. The API returns `9901 - Invalid method` because it cannot find the `method` parameter.

**Current (wrong) payload:**
```text
{
  "auth": {
    "merchant_id": "...",
    "api_id": "...",
    "api_key": "...",
    "channel": "airtel",
    "sender_id": "097...",     <-- wrong location
    "reference_no": "...",     <-- wrong location
    "amount": "3000"           <-- wrong location
  }
}
```

**Correct payload (from official PHP SDK):**
```text
{
  "auth": {
    "merchant_id": "...",
    "api_id": "...",
    "api_key": "...",
    "service_id": "1002",      <-- MISSING from our code
    "channel": "airtel"
  },
  "data": {
    "method": "runBillPayment",  <-- MISSING
    "sender_id": "097...",
    "reference_no": "...",
    "amount": 3000,
    "request_id": "req_unique"   <-- MISSING
  },
  "userdata": {
    "udf1": "", "udf2": "", "udf3": "", "udf4": "", "udf5": ""
  }
}
```

## Fix

**File: `supabase/functions/process-momo-payment/index.ts`**
- Restructure `zynlePayload` to match the correct 3-section format
- Add `service_id: "1002"` to `auth`
- Move `sender_id`, `reference_no`, `amount` into `data` section
- Add `method: "runBillPayment"` and `request_id` to `data`
- Add `userdata` section with empty `udf1`-`udf5`

**File: `supabase/functions/check-payment-status/index.ts`**
- Same structural fix: use `data.method: "checkPaymentStatus"` with proper `auth`/`data`/`userdata` sections

## Files Changed

| File | Change |
|------|--------|
| `supabase/functions/process-momo-payment/index.ts` | Fix payload structure |
| `supabase/functions/check-payment-status/index.ts` | Fix payload structure |


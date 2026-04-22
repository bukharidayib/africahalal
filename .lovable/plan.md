

## Auto-Polling Payment Status + Updated Edge Function

### What changes
1. **Replace `supabase/functions/check-payment-status/index.ts`** with the user-provided code (uses `https://africanhalaal.com/zynlepayStatusProxy.php` proxy with the documented flat payload `{ api_id, api_key, reference_no }`, and maps codes 100/990/995/9902 directly).

2. **Add automatic polling in `src/components/billing/MoMoPaymentDialog.tsx`:**
   - When `paymentState` becomes `"pending"` and a `transactionId` exists, start a `setInterval` that calls the existing `handleCheckStatus()` every **5 seconds**.
   - Track elapsed time; stop polling and show a timeout message after **2 minutes (120s)** if still pending.
   - Stop polling immediately when status becomes `"success"` or `"error"`, or when the dialog closes / unmounts.
   - Show a small "Auto-checking… (Xs)" indicator next to the existing manual "Check Status" button so the user knows polling is active. The manual button stays available as a fallback.
   - On timeout: set state to `"error"` with message "Payment status check timed out. Please verify the payment manually or contact support."

### Technical details
- Use a `useEffect` keyed on `paymentState === "pending" && transactionId`.
- Use `useRef` for the interval id and a start timestamp to compute elapsed seconds.
- Cleanup: `clearInterval` in the effect's return + when `handleClose` runs.
- Reuse existing `handleCheckStatus` logic (no duplication) — just call it from the interval.
- Add a small `pollSeconds` state to show the elapsed countdown in the UI.

### Files touched
- `supabase/functions/check-payment-status/index.ts` (replace with provided code)
- `src/components/billing/MoMoPaymentDialog.tsx` (add polling effect + UI indicator)

### Out of scope
- No DB changes. No changes to `process-momo-payment`. No changes to other portals.


## Goal
Completely remove the "Offline Payments" feature from the app — UI, code paths, and database.

## Scope of changes

### 1. Client UI — `src/components/billing/MoMoPaymentDialog.tsx`
- Remove the `"offline"` option from `paymentMethod` union and the Offline tab button.
- Delete all offline state (sender name/phone, tx ref, notes, file, isSubmittingOffline) and `handleOfflineSubmit`.
- Remove the offline form block, conditional success/failure messaging, and submit button branch.
- Default `paymentMethod` stays `"momo"`; only MoMo + Card remain.

### 2. Admin UI — `src/admin/pages/AdminBilling.tsx`
- Remove the entire "Offline Payments" tab trigger and `TabsContent`.
- Remove `OfflinePayment` interface, all `offline*` state, `fetchOfflinePayments`, `handleReviewOfflinePayment`, the review dialog, and the call from `useEffect`.
- Remove related filter effect.

### 3. Edge functions / PDF copy — `supabase/functions/generate-invoice-pdf/index.ts`
- Update payment terms string to drop the "or contact accounts@africanhalaal.com for offline options" wording.

### 4. Database migration (drop table)
```sql
DROP TABLE IF EXISTS public.offline_payments CASCADE;
```
(Currently has 1 row — will be deleted. RLS policies and indexes drop with the table.)

### 5. Storage
- Existing files under `…/offline-payments/` paths in the `application-documents` bucket are left in place (no automatic deletion) since they may be referenced from audit logs. No new uploads will occur.

## Out of scope
- Audit log entries with `action = 'offline_payment_approved'` are kept for history.
- ZynlePay MoMo and Card flows are untouched.

## Result
No UI surface or backend path for offline payments. Clients pay only via MoMo or Card; admins no longer see an Offline Payments tab.
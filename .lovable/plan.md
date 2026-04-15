

## Plan: Offline/Manual Payment Module for Client and Admin Portals

### Overview
Add an "Offline Payment" option alongside the existing Online (MoMo/Card) payment flow. Clients can choose between Online or Offline payment. For offline, they see the merchant account details, fill in transaction details, and upload a screenshot. Admins get a new tab to review and approve/reject these offline payments.

### Database Changes (Migration)

**New table: `offline_payments`**
- `id` (uuid, PK)
- `invoice_id` (uuid, NOT NULL) — references invoices
- `sender_name` (text, NOT NULL)
- `sender_phone` (text, NOT NULL)
- `amount` (numeric, NOT NULL)
- `transaction_reference` (text) — client-provided ref number
- `screenshot_path` (text, NOT NULL) — storage path in `application-documents` bucket
- `notes` (text)
- `status` (text, default `'pending_review'`) — `pending_review`, `approved`, `rejected`
- `submitted_by` (uuid, NOT NULL)
- `reviewed_by` (uuid)
- `reviewed_at` (timestamptz)
- `review_notes` (text)
- `created_at` (timestamptz, default now())

**RLS Policies:**
- Clients can INSERT where `submitted_by = auth.uid()`
- Clients can SELECT their own (via invoice -> organization -> profile chain)
- Admins can SELECT all, UPDATE (approve/reject) via `is_admin_user()`

### Client Portal Changes

**1. Update `MoMoPaymentDialog.tsx`**
- Add a third payment method tab: "Offline / Manual"
- When selected, show:
  - Merchant account info card: Account Number `1092045`, Name: `African Halal`
  - Form fields: Sender Name, Phone Number, Amount (disabled, pre-filled), Transaction Reference (optional), Notes
  - File upload for transaction screenshot (uploads to `application-documents` bucket)
- On submit: insert into `offline_payments` table with status `pending_review`
- Show success state: "Your payment proof has been submitted for review"

**2. Update `BillingDashboard.tsx`**
- Show offline payment status badges on invoices that have pending offline payments

### Admin Portal Changes

**3. Update `AdminBilling.tsx`**
- Add a third tab: "Offline Payments"
- Table showing all offline payments with: Invoice #, Client Name, Sender Name, Phone, Amount, Screenshot (view link), Status, Date
- Each row has Approve/Reject actions
- On Approve: update `offline_payments.status = 'approved'`, update linked `invoices.status = 'paid'`, set `invoices.paid_at`, log to `invoice_activity_log`
- On Reject: update `offline_payments.status = 'rejected'` with review notes
- View screenshot via signed URL

### Technical Details

- Screenshot upload uses existing `application-documents` bucket with path `offline-payments/{user_id}/{filename}`
- Storage SELECT policy already allows owner access; no new storage policies needed for upload (existing INSERT policy covers `uploaded_by = auth.uid()` pattern, but we'll use the bucket directly)
- Add a storage policy for the `application-documents` bucket to allow admin signed URL access for offline payment screenshots
- The build error about `npm:openai@^4.52.5` is unrelated to this feature — it's a Deno type resolution issue in the edge functions SDK and does not affect runtime

### Files to Create/Edit

| File | Action |
|------|--------|
| `supabase/migrations/xxx.sql` | Create `offline_payments` table + RLS |
| `src/components/billing/MoMoPaymentDialog.tsx` | Add offline payment tab + form |
| `src/admin/pages/AdminBilling.tsx` | Add "Offline Payments" tab with approve/reject |

